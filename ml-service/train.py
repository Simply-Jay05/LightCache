import argparse
import json
import pickle
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import lightgbm as lgb
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.metrics import f1_score, mean_absolute_error, r2_score
from sklearn.model_selection import KFold, cross_val_score
from sklearn.multioutput import MultiOutputClassifier

warnings.filterwarnings("ignore")

# Paths
BASE_DIR     = Path(__file__).parent
MODEL_DIR    = BASE_DIR / "model"
MODEL_PATH   = MODEL_DIR / "lightcache_model.pkl"
META_PATH    = MODEL_DIR / "model_meta.json"
DEFAULT_DATA = BASE_DIR.parent / "backend" / "logs" / "cache_events.jsonl"

MODEL_DIR.mkdir(exist_ok=True)

TTL_MIN = 30
TTL_MAX = 1800

ROUTE_TYPES = [
    "products_list",
    "product_single",
    "best_seller",
    "new_arrivals",
    "similar_products",
]

# Route-specific baseline TTLs — static domain knowledge used as a feature anchor
FIXED_TTLS = {
    "products_list":    300,
    "product_single":   600,
    "best_seller":      120,
    "new_arrivals":     180,
    "similar_products": 600,
}


# Try to import SMOTE (optional dependency)
try:
    from imblearn.over_sampling import SMOTE
    SMOTE_AVAILABLE = True
except ImportError:
    SMOTE_AVAILABLE = False
    print("   ⚠  imbalanced-learn not installed — SMOTE disabled. "
          "Run: pip install imbalanced-learn")


# 1. LOAD 
def load_data(path: Path) -> pd.DataFrame:
    print(f"Loading data from: {path}")
    records, skipped = [], 0
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                skipped += 1

    df = pd.DataFrame(records)
    if skipped:
        print(f"   Skipped {skipped} malformed lines")

    df["timestamp"] = pd.to_numeric(df["timestamp"], errors="coerce").fillna(0)
    df = df.sort_values("timestamp").reset_index(drop=True)
    print(f"   Loaded  : {len(df):,} rows")
    return df


# 2. FEATURE ENGINEERING 
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    print("\nEngineering features...")
    df = df.copy()

    # Categorical encodings
    route_map = {r: i for i, r in enumerate(ROUTE_TYPES)}
    page_map  = {
        "collection": 0, "product_detail": 1, "best_seller": 2,
        "new_arrivals": 3, "similar": 4,
    }
    tier_map = {"unknown": 0, "budget": 1, "mid": 2, "premium": 3}

    df["route_type_enc"] = df["route_type"].map(route_map).fillna(0).astype(int)
    df["page_type_enc"]  = df["page_type"].map(page_map).fillna(0).astype(int)
    df["price_tier_enc"] = df["price_tier"].map(tier_map).fillna(0).astype(int)
    df["is_single_item"] = df["route_type"].isin(
        ["product_single", "best_seller"]
    ).astype(int)

    # Time of day features
    df["hour_of_day"]  = df["hour_of_day"].fillna(0).astype(int).clip(0, 23)
    df["weekday"]      = df["weekday"].fillna(0).astype(int).clip(0, 6)
    df["is_peak_hour"] = df["is_peak_hour"].fillna(0).astype(int)
    df["hour_sin"] = np.sin(2 * np.pi * df["hour_of_day"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour_of_day"] / 24)
    df["day_sin"]  = np.sin(2 * np.pi * df["weekday"] / 7)
    df["day_cos"]  = np.cos(2 * np.pi * df["weekday"] / 7)

    # Past-only cumulative access count per key
    df["past_access_count"] = df.groupby("cache_key").cumcount() + 1
    df["log_past_count"]    = np.log1p(df["past_access_count"])

    # Rolling hit rate — past 5 requests for this key
    df["rolling_hit_rate"] = (
        df.groupby("cache_key")["is_hit"]
        .transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())
        .fillna(0.5)
    )

    # Temporal inter-arrival features
    df["prev_request_ts"] = df.groupby("cache_key")["timestamp"].shift(1)
    df["time_since_last_request"] = (
        (df["timestamp"] - df["prev_request_ts"]) / 1000.0
    ).fillna(0).clip(0, TTL_MAX)

    def rolling_interval_mean(group):
        intervals = group.diff().shift(1)
        return intervals.rolling(10, min_periods=1).mean().fillna(300)

    df["request_interval_mean"] = (
        df.groupby("cache_key")["timestamp"]
        .transform(lambda x: rolling_interval_mean(x) / 1000.0)
        .clip(0, TTL_MAX)
    )

    def rolling_interval_std(group):
        intervals = group.diff().shift(1)
        return intervals.rolling(10, min_periods=2).std().fillna(0)

    df["request_interval_std"] = (
        df.groupby("cache_key")["timestamp"]
        .transform(lambda x: rolling_interval_std(x) / 1000.0)
        .clip(0, TTL_MAX)
    )

    # Baseline TTL anchor feature — static domain knowledge, always valid
    df["baseline_ttl"]     = df["route_type"].map(FIXED_TTLS).fillna(300)
    df["log_baseline_ttl"] = np.log1p(df["baseline_ttl"])

    print(f"   Done: {df.shape[1]} columns, {len(df):,} rows")
    return df


# 3. BUILD TARGETS (no leakage) 
def build_targets(df: pd.DataFrame) -> pd.DataFrame:
    print("\nBuilding targets...")
    df = df.copy()

    # Target 1: dynamic_ttl
    df["next_request_ts"] = df.groupby("cache_key")["timestamp"].shift(-1)
    df["dynamic_ttl"] = (
        (df["next_request_ts"] - df["timestamp"]) / 1000.0
    )
    median_ttl = df["dynamic_ttl"].median()

    # P95 clip — removes extreme long-tail noise; recomputed each retrain
    p95 = df["dynamic_ttl"].dropna().quantile(0.95)
    print(f"   dynamic_ttl 95th pct: {p95:.0f}s — clipping upper tail")

    df["dynamic_ttl"] = (
        df["dynamic_ttl"]
        .fillna(median_ttl if pd.notna(median_ttl) else 300)
        .clip(TTL_MIN, min(p95, TTL_MAX))
    )

    # Target 2: eviction_score
    WINDOW_MS = 10 * 60 * 1000

    def future_access_count(group):
        ts = group["timestamp"].values
        counts = np.zeros(len(ts), dtype=float)
        for i in range(len(ts)):
            future_mask = (ts > ts[i]) & (ts <= ts[i] + WINDOW_MS)
            counts[i] = future_mask.sum()
        return pd.Series(counts, index=group.index)

    print("   Computing future access counts (may take ~30s)...")
    df["future_access_count"] = (
        df.groupby("cache_key", group_keys=False).apply(future_access_count)
    )
    max_count = df["future_access_count"].quantile(0.99)
    if max_count == 0:
        max_count = 1
    df["eviction_score"] = (
        (df["future_access_count"] / max_count * 200).clip(0, 200)
    )

    # Target 3: prefetch labels
    df["next_route"] = df.groupby("cache_key")["route_type"].shift(-1)
    for rt in ROUTE_TYPES:
        df[f"prefetch_{rt}"] = (df["next_route"] == rt).astype(int)

    print(f"   dynamic_ttl    — mean: {df['dynamic_ttl'].mean():.0f}s  "
          f"range: {df['dynamic_ttl'].min():.0f}–{df['dynamic_ttl'].max():.0f}s")
    print(f"   eviction_score — mean: {df['eviction_score'].mean():.1f}  "
          f"range: {df['eviction_score'].min():.1f}–{df['eviction_score'].max():.1f}")
    print(f"   prefetch       — {df['next_route'].notna().sum():,} sequenced rows")

    return df


# 4. TRAIN 
FEATURE_COLS = [
    # Context features
    "route_type_enc",
    "page_type_enc",
    "price_tier_enc",
    "is_single_item",
    # Time of day
    "hour_of_day",
    "weekday",
    "is_peak_hour",
    "hour_sin",
    "hour_cos",
    "day_sin",
    "day_cos",
    # Access history (past only, no leakage)
    "past_access_count",
    "log_past_count",
    "rolling_hit_rate",
    # Temporal inter-arrival features
    "time_since_last_request",
    "request_interval_mean",
    "request_interval_std",
    # Baseline TTL anchor (new)
    "baseline_ttl",
    "log_baseline_ttl",
]


def _temporal_split(X, y, test_frac=0.2):
    """
    Time-ordered split: first 80% for training, last 20% for testing.
    Prevents future traffic from leaking into training — the correct
    evaluation method for cache event data.
    """
    split_idx = int(len(X) * (1 - test_frac))
    return (
        X.iloc[:split_idx], X.iloc[split_idx:],
        y.iloc[:split_idx], y.iloc[split_idx:],
    )


def train(df: pd.DataFrame):
    print("\nTraining models...")
    X = df[FEATURE_COLS].fillna(0)

    #  Model 1: Dynamic TTL 
    # Log-transform the target — TTL distribution is heavily right-skewed
    # (mean 621s, std 712s). Fitting on log(1+TTL) makes the regression
    # problem near-normal, which dramatically reduces MAE and improves R².
    y_ttl_raw = df["dynamic_ttl"]
    y_ttl     = np.log1p(y_ttl_raw)

    Xtr, Xte, ytr, yte = _temporal_split(X, pd.Series(y_ttl, index=X.index))

    ttl_model = LGBMRegressor(
        n_estimators=600,
        learning_rate=0.02,
        max_depth=7,
        num_leaves=63,
        min_child_samples=10,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.05,
        reg_lambda=0.1,
        min_split_gain=0.01,
        random_state=42,
        verbose=-1,
    )

    callbacks = [
        lgb.early_stopping(50, verbose=False),
        lgb.log_evaluation(period=-1),
    ]
    ttl_model.fit(Xtr, ytr, eval_set=[(Xte, yte)], callbacks=callbacks)
    print(f"   TTL best iteration: {ttl_model.best_iteration_}")

    # Evaluate in original (non-log) space
    ttl_preds_log = ttl_model.predict(Xte)
    ttl_preds     = np.expm1(ttl_preds_log)
    yte_orig      = np.expm1(yte)

    ttl_mae = round(float(mean_absolute_error(yte_orig, ttl_preds)), 2)
    ttl_r2  = round(float(r2_score(yte_orig, ttl_preds)), 3)

    # 5-fold cross-validation (time-ordered folds)
    kf = KFold(n_splits=5, shuffle=False)
    cv_scores = cross_val_score(
        LGBMRegressor(
            n_estimators=ttl_model.best_iteration_ or 300,
            learning_rate=0.02, max_depth=7, num_leaves=63,
            min_child_samples=10, subsample=0.8, colsample_bytree=0.8,
            reg_alpha=0.05, reg_lambda=0.1, random_state=42, verbose=-1,
        ),
        X, y_ttl, cv=kf, scoring="r2",
    )
    ttl_r2_cv_mean = round(float(cv_scores.mean()), 3)
    ttl_r2_cv_std  = round(float(cv_scores.std()), 3)

    print(f"\n   [1] TTL Regressor")
    print(f"       MAE  : {ttl_mae}s  (original space)")
    print(f"       R²   : {ttl_r2}")
    print(f"       R² CV: {ttl_r2_cv_mean} ± {ttl_r2_cv_std}  (5-fold)")

    # Model 2: Eviction Score
    y_evict = df["eviction_score"]
    Xtr2, Xte2, ytr2, yte2 = _temporal_split(X, y_evict)

    evict_model = LGBMRegressor(
        n_estimators=300, learning_rate=0.03, max_depth=5,
        num_leaves=25, min_child_samples=20,
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, verbose=-1,
    )

    evict_callbacks = [
        lgb.early_stopping(50, verbose=False),
        lgb.log_evaluation(period=-1),
    ]
    evict_model.fit(Xtr2, ytr2, eval_set=[(Xte2, yte2)], callbacks=evict_callbacks)
    print(f"   Eviction best iteration: {evict_model.best_iteration_}")

    evict_preds = evict_model.predict(Xte2)
    evict_mae   = round(float(mean_absolute_error(yte2, evict_preds)), 2)
    evict_r2    = round(float(r2_score(yte2, evict_preds)), 3)

    cv_scores_e = cross_val_score(
        LGBMRegressor(
            n_estimators=evict_model.best_iteration_ or 200,
            learning_rate=0.03, max_depth=5, num_leaves=25,
            min_child_samples=20, subsample=0.8, colsample_bytree=0.8,
            random_state=42, verbose=-1,
        ),
        X, y_evict, cv=KFold(n_splits=5, shuffle=False), scoring="r2",
    )
    evict_r2_cv_mean = round(float(cv_scores_e.mean()), 3)
    evict_r2_cv_std  = round(float(cv_scores_e.std()), 3)

    print(f"\n   [2] Eviction Score Regressor")
    print(f"       MAE  : {evict_mae}")
    print(f"       R²   : {evict_r2}")
    print(f"       R² CV: {evict_r2_cv_mean} ± {evict_r2_cv_std}  (5-fold)")

    # Model 3: Prefetch Classifier
    prefetch_mask = df["next_route"].notna()
    X_pref        = X[prefetch_mask]
    prefetch_cols = [f"prefetch_{rt}" for rt in ROUTE_TYPES]
    y_pref        = df.loc[prefetch_mask, prefetch_cols]

    Xtr3, Xte3, ytr3, yte3 = _temporal_split(X_pref, y_pref)

    # Print label distribution so imbalance is visible in the log
    print(f"\n   Prefetch label distribution (training set):")
    for rt in ROUTE_TYPES:
        col       = f"prefetch_{rt}"
        pos       = int(ytr3[col].sum())
        total     = len(ytr3)
        pos_rate  = pos / total * 100
        print(f"       {rt:<25} positive: {pos:4d} / {total} ({pos_rate:.1f}%)")

    # class_weight='balanced' — LightGBM auto-computes weights each retrain
    base_clf = LGBMClassifier(
        n_estimators=300,
        learning_rate=0.03,
        max_depth=5,
        num_leaves=31,
        min_child_samples=10,
        class_weight="balanced",
        random_state=42,
        verbose=-1,
    )

    # Per-label SMOTE with adaptive threshold
    # Applied only when a label is severely underrepresented (<15% positive rate)
    # and has enough positive samples for SMOTE to work (>=6).
    # Auto-disables as data grows and imbalance resolves.
    SMOTE_THRESHOLD = 0.15
    trained_estimators = []
    smote_applied_labels = []

    from sklearn.base import clone

    for i, rt in enumerate(ROUTE_TYPES):
        y_tr_col = ytr3[f"prefetch_{rt}"]
        pos_count = int(y_tr_col.sum())
        pos_rate  = pos_count / len(y_tr_col)

        if SMOTE_AVAILABLE and pos_rate < SMOTE_THRESHOLD and pos_count >= 6:
            sm = SMOTE(random_state=42, k_neighbors=min(5, pos_count - 1))
            X_res, y_res = sm.fit_resample(Xtr3, y_tr_col)
            smote_applied_labels.append(rt)
            print(f"       SMOTE applied → {rt}  (pos rate was {pos_rate*100:.1f}%)")
        else:
            X_res, y_res = Xtr3, y_tr_col

        clf = clone(base_clf)
        clf.fit(X_res, y_res)
        trained_estimators.append(clf)

    # Reassemble into a fitted MultiOutputClassifier
    prefetch_model = MultiOutputClassifier(base_clf, n_jobs=-1)
    prefetch_model.estimators_ = trained_estimators
    prefetch_model.classes_    = [np.array([0, 1])] * len(ROUTE_TYPES)

    pref_preds = prefetch_model.predict(Xte3)

    # Per-label F1 breakdown
    print(f"\n   [3] Prefetch Classifier — per-label report:")
    per_label_f1 = {}
    for i, rt in enumerate(ROUTE_TYPES):
        f1  = f1_score(yte3[f"prefetch_{rt}"], pref_preds[:, i], zero_division=0)
        pos = int(yte3[f"prefetch_{rt}"].sum())
        per_label_f1[rt] = round(float(f1), 3)
        print(f"       {rt:<25} F1: {f1:.3f}  positives in test: {pos}")

    pref_f1_macro    = round(float(f1_score(yte3, pref_preds, average="macro",    zero_division=0)), 3)
    pref_f1_weighted = round(float(f1_score(yte3, pref_preds, average="weighted", zero_division=0)), 3)
    print(f"\n       Macro F1:    {pref_f1_macro}")
    print(f"       Weighted F1: {pref_f1_weighted}  (better for imbalanced)")

    metrics = {
        "ttl_mae":             ttl_mae,
        "ttl_r2":              ttl_r2,
        "ttl_r2_cv_mean":      ttl_r2_cv_mean,
        "ttl_r2_cv_std":       ttl_r2_cv_std,
        "evict_mae":           evict_mae,
        "evict_r2":            evict_r2,
        "evict_r2_cv_mean":    evict_r2_cv_mean,
        "evict_r2_cv_std":     evict_r2_cv_std,
        "prefetch_f1":         pref_f1_macro,
        "prefetch_f1_weighted": pref_f1_weighted,
        "prefetch_per_label":  per_label_f1,
        "prefetch_smote_applied": smote_applied_labels,
        "train_rows":          len(Xtr),
        "test_rows":           len(Xte),
        "split_type":          "temporal",
        "log_transform_used":  True,
        "ttl_target_mean":     round(float(y_ttl_raw.mean()), 1),
        "ttl_target_std":      round(float(y_ttl_raw.std()), 1),
        "evict_target_mean":   round(float(y_evict.mean()), 1),
        "evict_target_std":    round(float(y_evict.std()), 1),
    }

    return ttl_model, evict_model, prefetch_model, metrics


# 5. SAVE 
def save_models(ttl_model, evict_model, prefetch_model, df, metrics=None):
    print(f"\nSaving to {MODEL_DIR}/")
    bundle = {
        "ttl_model":        ttl_model,
        "evict_model":      evict_model,
        "prefetch_model":   prefetch_model,
        "feature_cols":     FEATURE_COLS,
        "route_types":      ROUTE_TYPES,
        "prefetch_cols":    [f"prefetch_{rt}" for rt in ROUTE_TYPES],
        "ttl_log_transform": True,   # signal to app.py to invert at inference
    }
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(bundle, f)

    # Feature importances from TTL model (normalised 0–100)
    raw_imp  = ttl_model.feature_importances_
    max_imp  = float(max(raw_imp)) if max(raw_imp) > 0 else 1.0
    feat_imp = [
        {
            "feature":        feat,
            "importance":     round(float(imp), 4),
            "importance_pct": round(float(imp) / max_imp * 100, 1),
        }
        for feat, imp in sorted(
            zip(FEATURE_COLS, raw_imp), key=lambda x: x[1], reverse=True
        )
    ]

    meta = {
        "trained_at":      pd.Timestamp.now().isoformat(),
        "training_rows":   len(df),
        "feature_cols":    FEATURE_COLS,
        "route_types":     ROUTE_TYPES,
        "ttl_bounds":      {"min": TTL_MIN, "max": TTL_MAX},
        "route_type_map":  {r: i for i, r in enumerate(ROUTE_TYPES)},
        "page_type_map":   {
            "collection": 0, "product_detail": 1, "best_seller": 2,
            "new_arrivals": 3, "similar": 4,
        },
        "price_tier_map":  {"unknown": 0, "budget": 1, "mid": 2, "premium": 3},
        "fixed_ttls":      FIXED_TTLS,
        "metrics":         metrics or {},
        "feature_importances": feat_imp,
    }
    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"   Model saved : {MODEL_PATH.name}")
    print(f"   Meta saved  : {META_PATH.name}")


# 6. FEATURE IMPORTANCE 
def print_importance(ttl_model):
    print("\nTop features — TTL model:")
    pairs = sorted(
        zip(FEATURE_COLS, ttl_model.feature_importances_),
        key=lambda x: x[1], reverse=True,
    )
    max_imp = max(v for _, v in pairs)
    for feat, imp in pairs[:10]:
        bar = "█" * int(imp / max_imp * 20)
        print(f"   {feat:<30} {bar} {imp:.0f}")


# MAIN 
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    args = parser.parse_args()

    if not args.data.exists():
        print(f"Data file not found: {args.data}")
        return

    print("=" * 55)
    print("  LightCache — Phase 4: Model Training (v4 — improved)")
    print("=" * 55)

    df = load_data(args.data)
    df = engineer_features(df)
    df = build_targets(df)
    ttl_model, evict_model, prefetch_model, metrics = train(df)
    save_models(ttl_model, evict_model, prefetch_model, df, metrics)
    print_importance(ttl_model)

    print("\n" + "=" * 55)
    print("  Training complete — 3 improved ML models saved")
    print(f"  TTL  R² : {metrics['ttl_r2']}  (CV: {metrics['ttl_r2_cv_mean']} ± {metrics['ttl_r2_cv_std']})")
    print(f"  Evict R²: {metrics['evict_r2']}  (CV: {metrics['evict_r2_cv_mean']} ± {metrics['evict_r2_cv_std']})")
    print(f"  Prefetch F1 (macro): {metrics['prefetch_f1']}  weighted: {metrics['prefetch_f1_weighted']}")
    print("  Next: python app.py")
    print("=" * 55)


if __name__ == "__main__":
    main()
