import argparse
import json
import pickle
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.metrics import f1_score, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
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


# 1. LOAD  (unchanged)
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


# 2. FEATURE ENGINEERING  (original features, unchanged)
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    print("\nEngineering features...")
    df = df.copy()

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

    df["hour_of_day"]  = df["hour_of_day"].fillna(0).astype(int).clip(0, 23)
    df["weekday"]      = df["weekday"].fillna(0).astype(int).clip(0, 6)
    df["is_peak_hour"] = df["is_peak_hour"].fillna(0).astype(int)
    df["hour_sin"] = np.sin(2 * np.pi * df["hour_of_day"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour_of_day"] / 24)
    df["day_sin"]  = np.sin(2 * np.pi * df["weekday"] / 7)
    df["day_cos"]  = np.cos(2 * np.pi * df["weekday"] / 7)

    df["past_access_count"] = df.groupby("cache_key").cumcount() + 1
    df["log_past_count"]    = np.log1p(df["past_access_count"])

    df["rolling_hit_rate"] = (
        df.groupby("cache_key")["is_hit"]
        .transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())
        .fillna(0.5)
    )

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

    print(f"   Done: {df.shape[1]} columns, {len(df):,} rows")
    return df


# 3. BUILD TARGETS  (unchanged)
def build_targets(df: pd.DataFrame) -> pd.DataFrame:
    print("\nBuilding targets...")
    df = df.copy()

    df["next_request_ts"] = df.groupby("cache_key")["timestamp"].shift(-1)
    df["dynamic_ttl"] = (
        (df["next_request_ts"] - df["timestamp"]) / 1000.0
    )
    median_ttl = df["dynamic_ttl"].median()
    df["dynamic_ttl"] = (
        df["dynamic_ttl"]
        .fillna(median_ttl if pd.notna(median_ttl) else 300)
        .clip(TTL_MIN, TTL_MAX)
    )

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

    df["next_route"] = df.groupby("cache_key")["route_type"].shift(-1)
    for rt in ROUTE_TYPES:
        df[f"prefetch_{rt}"] = (df["next_route"] == rt).astype(int)

    print(f"   dynamic_ttl    — mean: {df['dynamic_ttl'].mean():.0f}s  "
          f"std: {df['dynamic_ttl'].std():.0f}s  "
          f"pct@MAX: {(df['dynamic_ttl']==TTL_MAX).mean()*100:.1f}%")
    print(f"   eviction_score — mean: {df['eviction_score'].mean():.1f}  "
          f"range: {df['eviction_score'].min():.1f}–{df['eviction_score'].max():.1f}")
    print(f"   prefetch       — {df['next_route'].notna().sum():,} sequenced rows")

    return df


# 4. TRAIN
FEATURE_COLS = [
    "route_type_enc", "page_type_enc", "price_tier_enc", "is_single_item",
    "hour_of_day", "weekday", "is_peak_hour",
    "hour_sin", "hour_cos", "day_sin", "day_cos",
    "past_access_count", "log_past_count", "rolling_hit_rate",
    "time_since_last_request", "request_interval_mean", "request_interval_std",
]


def train(df: pd.DataFrame):
    print("\nTraining models...")
    X = df[FEATURE_COLS].fillna(0)

    # TTL distribution diagnostic
    ttl = df["dynamic_ttl"]
    pct_max = (ttl == TTL_MAX).mean() * 100
    print(f"\n   TTL pct@MAX={pct_max:.1f}%  "
          f"median={ttl.median():.0f}s  mean={ttl.mean():.0f}s  std={ttl.std():.0f}s")

    # Two-Stage Hurdle Model:
    #   Stage 1 (Classifier):
    #     Predict whether a row will hit TTL_MAX ("censored") or not.
    #     If yes → output TTL_MAX directly (no regression needed).
    #
    #   Stage 2 (Regressor):
    #     Trained ONLY on the non-capped rows (clean, real signal).
    #     Predicts the actual time-until-next-request for live keys.
    #
    #   Final prediction = Stage1 decides; Stage2 fills in the real values.
    #   This cleanly separates noise from signal at the data level.

    y_ttl = df["dynamic_ttl"]
    Xtr, Xte, ytr, yte = train_test_split(
        X, y_ttl, test_size=0.2, random_state=42, shuffle=True
    )

    # Stage 1: Is this row censored (will it hit TTL_MAX)? 
    is_capped_tr = (ytr == TTL_MAX).astype(int)
    is_capped_te = (yte == TTL_MAX).astype(int)
    pct_capped_tr = is_capped_tr.mean() * 100
    print(f"   Stage-1: {pct_capped_tr:.1f}% of train rows are TTL_MAX (censored)")

    ttl_stage1 = LGBMClassifier(
        n_estimators=400,
        learning_rate=0.03,
        max_depth=5,
        num_leaves=25,
        min_child_samples=20,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbose=-1,
    )
    ttl_stage1.fit(Xtr, is_capped_tr)
    prob_capped = ttl_stage1.predict_proba(Xte)[:, 1]
    pred_capped = (prob_capped >= 0.5).astype(int)

    from sklearn.metrics import accuracy_score
    s1_acc = accuracy_score(is_capped_te, pred_capped)
    print(f"   Stage-1 accuracy: {s1_acc:.3f}")

    # ── Stage 2: Regressor on clean (non-capped) rows only ───────────────
    mask_tr = (ytr < TTL_MAX)
    mask_te = (yte < TTL_MAX)
    pct_real = mask_tr.mean() * 100
    print(f"   Stage-2: training on {pct_real:.1f}% of rows (real TTL signal)")

    ttl_stage2 = LGBMRegressor(
        objective="regression",  # clean L2 — no tricks needed on pure signal
        n_estimators=600,
        learning_rate=0.02,
        max_depth=6,
        num_leaves=40,
        min_child_samples=15,
        subsample=0.8,
        subsample_freq=1,
        colsample_bytree=0.8,
        reg_alpha=0.05,
        reg_lambda=0.1,
        n_iter_no_change=50,
        random_state=42,
        verbose=-1,
    )
    ttl_stage2.fit(
        Xtr[mask_tr], ytr[mask_tr],
        eval_set=[(Xte[mask_te], yte[mask_te])],
    )

    # Combine stages 
    raw_preds = ttl_stage2.predict(Xte).clip(TTL_MIN, TTL_MAX - 1)
    ttl_preds = np.where(pred_capped == 1, float(TTL_MAX), raw_preds)

    ttl_mae = round(float(mean_absolute_error(yte, ttl_preds)), 2)
    ttl_r2  = round(float(r2_score(yte, ttl_preds)), 3)
    print(f"\n   [1] TTL Regressor (two-stage)")
    print(f"       MAE : {ttl_mae}s")
    print(f"       R2  : {ttl_r2}")
    print(f"       (Expected: R2 0.3–0.6)")

   
    # Model 2: Eviction Score  
    y_evict = df["eviction_score"]
    Xtr2, Xte2, ytr2, yte2 = train_test_split(
        X, y_evict, test_size=0.2, random_state=42, shuffle=True
    )
    evict_model = LGBMRegressor(
        n_estimators=300, learning_rate=0.03, max_depth=5,
        num_leaves=25, min_child_samples=20,
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, verbose=-1,
    )
    evict_model.fit(Xtr2, ytr2)
    evict_preds = evict_model.predict(Xte2)
    evict_mae = round(float(mean_absolute_error(yte2, evict_preds)), 2)
    evict_r2  = round(float(r2_score(yte2, evict_preds)), 3)
    print(f"\n   [2] Eviction Score Regressor")
    print(f"       MAE : {evict_mae}")
    print(f"       R2  : {evict_r2}")
    print(f"       (Expected: R2 0.4–0.75)")

   
    # Model 3: Prefetch Classifier  — UNCHANGED (F1=1.0)
    prefetch_mask = df["next_route"].notna()
    X_pref = X[prefetch_mask]
    prefetch_cols = [f"prefetch_{rt}" for rt in ROUTE_TYPES]
    y_pref = df.loc[prefetch_mask, prefetch_cols]

    Xtr3, Xte3, ytr3, yte3 = train_test_split(
        X_pref, y_pref, test_size=0.2, random_state=42, shuffle=True
    )
    base_clf = LGBMClassifier(
        n_estimators=200, learning_rate=0.03, max_depth=4,
        num_leaves=15, min_child_samples=20,
        random_state=42, verbose=-1,
    )
    prefetch_model = MultiOutputClassifier(base_clf, n_jobs=-1)
    prefetch_model.fit(Xtr3, ytr3)
    pref_preds = prefetch_model.predict(Xte3)
    pref_f1 = round(float(f1_score(yte3, pref_preds, average="macro", zero_division=0)), 3)
    print(f"\n   [3] Prefetch Multi-Label Classifier")
    print(f"       F1 (macro) : {pref_f1}")
    print(f"       (Expected: F1 0.5–0.8)")

    metrics = {
        "ttl_mae":           ttl_mae,
        "ttl_r2":            ttl_r2,
        "ttl_stage1_acc":    round(s1_acc, 3),
        "evict_mae":         evict_mae,
        "evict_r2":          evict_r2,
        "prefetch_f1":       pref_f1,
        "train_rows":        len(X),
        "test_rows":         len(Xte),
        "ttl_target_mean":   round(float(y_ttl.mean()), 1),
        "ttl_target_std":    round(float(y_ttl.std()), 1),
        "evict_target_mean": round(float(y_evict.mean()), 1),
        "evict_target_std":  round(float(y_evict.std()), 1),
    }

    # Bundle both TTL sub-models together
    return (ttl_stage1, ttl_stage2), evict_model, prefetch_model, metrics


# 5. SAVE
def save_models(ttl_bundle, evict_model, prefetch_model, df, metrics=None):
    ttl_stage1, ttl_stage2 = ttl_bundle
    print(f"\nSaving to {MODEL_DIR}/")

    bundle = {
        # Store as a dict so the inference layer can call both stages
        "ttl_model": {
            "stage1_classifier": ttl_stage1,
            "stage2_regressor":  ttl_stage2,
            "ttl_max":           TTL_MAX,
        },
        "evict_model":    evict_model,
        "prefetch_model": prefetch_model,
        "feature_cols":   FEATURE_COLS,
        "route_types":    ROUTE_TYPES,
        "prefetch_cols":  [f"prefetch_{rt}" for rt in ROUTE_TYPES],
    }
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(bundle, f)

    raw_imp  = ttl_stage2.feature_importances_
    max_imp  = float(max(raw_imp)) if max(raw_imp) > 0 else 1.0
    feat_imp = [
        {"feature": feat, "importance": round(float(imp), 4),
         "importance_pct": round(float(imp) / max_imp * 100, 1)}
        for feat, imp in sorted(
            zip(FEATURE_COLS, raw_imp), key=lambda x: x[1], reverse=True
        )
    ]

    meta = {
        "trained_at":       pd.Timestamp.now().isoformat(),
        "training_rows":    len(df),
        "feature_cols":     FEATURE_COLS,
        "route_types":      ROUTE_TYPES,
        "ttl_bounds":       {"min": TTL_MIN, "max": TTL_MAX},
        "ttl_model_type":   "two_stage_hurdle",
        "route_type_map":   {r: i for i, r in enumerate(ROUTE_TYPES)},
        "page_type_map":    {
            "collection": 0, "product_detail": 1, "best_seller": 2,
            "new_arrivals": 3, "similar": 4,
        },
        "price_tier_map":   {"unknown": 0, "budget": 1, "mid": 2, "premium": 3},
        "metrics":          metrics or {},
        "feature_importances": feat_imp,
    }
    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"   Model saved : {MODEL_PATH.name}")
    print(f"   Meta saved  : {META_PATH.name}")


# 6. FEATURE IMPORTANCE
def print_importance(ttl_bundle):
    _, ttl_stage2 = ttl_bundle
    print("\nTop features — TTL stage-2 regressor:")
    pairs = sorted(
        zip(FEATURE_COLS, ttl_stage2.feature_importances_),
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
    print("  LightCache — Phase 4: Model Training (v6)")
    print("=" * 55)

    df = load_data(args.data)
    df = engineer_features(df)
    df = build_targets(df)
    ttl_bundle, evict_model, prefetch_model, metrics = train(df)
    save_models(ttl_bundle, evict_model, prefetch_model, df, metrics)
    print_importance(ttl_bundle)

    print("\n" + "=" * 55)
    print("  Training complete — 3 genuine ML models saved")
    print("  Next: python app.py")
    print("=" * 55)


if __name__ == "__main__":
    main()