import argparse
import json
import pickle
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.metrics import f1_score, mean_absolute_error, r2_score, roc_auc_score
from sklearn.model_selection import train_test_split

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

    for col in ["ttl_used", "ttl_label", "latency_ms", "hour_of_day", "weekday",
                "is_peak_hour", "is_weekend", "is_hit"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

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

    # ── Cache-key prefix (structural signal) ──────────────────────────────
    # "products:list:" vs "products:single:" vs "products:similar:" vs
    # "products:best-seller" vs "products:new-arrivals"
    # Each prefix maps to a different typical TTL regime.
    prefix_map = {
        "products:list":        0,
        "products:single":      1,
        "products:similar":     2,
        "products:best-seller": 3,
        "products:new-arrivals":4,
    }
    def get_prefix_enc(key):
        for k, v in prefix_map.items():
            if str(key).startswith(k):
                return v
        return 0
    df["cache_key_prefix_enc"] = df["cache_key"].apply(get_prefix_enc)

    # ── Time features ──────────────────────────────────────────────────────
    df["hour_of_day"]  = df["hour_of_day"].astype(int).clip(0, 23)
    df["weekday"]      = df["weekday"].astype(int).clip(0, 6)
    df["is_peak_hour"] = df["is_peak_hour"].astype(int)
    df["is_weekend"]   = df["is_weekend"].astype(int)
    df["hour_sin"] = np.sin(2 * np.pi * df["hour_of_day"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour_of_day"] / 24)
    df["day_sin"]  = np.sin(2 * np.pi * df["weekday"] / 7)
    df["day_cos"]  = np.cos(2 * np.pi * df["weekday"] / 7)

    # ── Rule-based TTL anchor (safe prior — computed before ML runs) ─────────
    # ttl_label: the backend's rule-based anchor TTL, computed before /predict
    #            is called. Safe to use as a feature forever — it will never
    #            reflect the ML model's own past outputs.
    # ttl_used is intentionally excluded: once ML mode is active, ttl_used
    #            becomes the ML model's own prediction, creating a feedback loop.
    df["ttl_label_log"] = np.log1p(df["ttl_label"].clip(TTL_MIN, TTL_MAX))

    # ── Access history (past-only, no leakage) ─────────────────────────────
    df["past_access_count"] = df.groupby("cache_key").cumcount() + 1
    df["log_past_count"]    = np.log1p(df["past_access_count"])

    df["rolling_hit_rate"] = (
        df.groupby("cache_key")["is_hit"]
        .transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())
        .fillna(0.5)
    )

    # ── Route-level hit rate (not just key-level) ──────────────────────────
    df["route_hit_rate"] = (
        df.groupby("route_type")["is_hit"]
        .transform(lambda x: x.shift(1).rolling(20, min_periods=1).mean())
        .fillna(0.5)
    )

    # ── Inter-arrival timing ───────────────────────────────────────────────
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

    # ── Log of inter-arrival mean (reduces skew) ───────────────────────────
    df["interval_mean_log"] = np.log1p(df["request_interval_mean"])

    # ── Latency signal ─────────────────────────────────────────────────────
    df["latency_log"] = np.log1p(df["latency_ms"].clip(0, 5000))

    print(f"   Done: {df.shape[1]} columns, {len(df):,} rows")
    return df


# 3. BUILD TARGETS
def build_targets(df: pd.DataFrame) -> pd.DataFrame:
    print("\nBuilding targets...")
    df = df.copy()

    # ── Target 1: dynamic_ttl ──────────────────────────────────────────────
    # Primary signal: actual inter-arrival time (honest traffic signal).
    # Clipped at 5th–95th percentile WITHIN each route type to reduce
    # label noise from one-off long gaps, without global clipping that
    # flattens the distribution.
    df["next_request_ts"] = df.groupby("cache_key")["timestamp"].shift(-1)
    df["raw_inter_arrival"] = (df["next_request_ts"] - df["timestamp"]) / 1000.0

    median_gap = df["raw_inter_arrival"].median()
    df["raw_inter_arrival"] = df["raw_inter_arrival"].fillna(
        median_gap if pd.notna(median_gap) else 300
    )

    # Per-route-type quantile clipping reduces noise without losing signal
    def clip_by_route(group):
        lo = group.quantile(0.05)
        hi = group.quantile(0.95)
        return group.clip(lo, hi)

    df["dynamic_ttl"] = (
        df.groupby("route_type")["raw_inter_arrival"]
        .transform(clip_by_route)
        .clip(TTL_MIN, TTL_MAX)
    )

    # ── Target 2: eviction_score ───────────────────────────────────────────
    WINDOW_MS = 10 * 60 * 1000

    def future_access_count(group):
        ts = group["timestamp"].values
        counts = np.zeros(len(ts), dtype=float)
        for i in range(len(ts)):
            mask = (ts > ts[i]) & (ts <= ts[i] + WINDOW_MS)
            counts[i] = mask.sum()
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

    # ── Target 3: cache_reuse ──────────────────────────────────────────────
    df["next_gap_s"] = (df["next_request_ts"] - df["timestamp"]) / 1000.0
    df["cache_reuse"] = (df["next_gap_s"] <= df["ttl_used"]).astype(int)
    df["cache_reuse"] = df["cache_reuse"].fillna(0).astype(int)

    print(f"   dynamic_ttl  — mean: {df['dynamic_ttl'].mean():.0f}s  "
          f"std: {df['dynamic_ttl'].std():.0f}s  "
          f"range: {df['dynamic_ttl'].min():.0f}–{df['dynamic_ttl'].max():.0f}s")
    print(f"   eviction_score — mean: {df['eviction_score'].mean():.1f}  "
          f"range: {df['eviction_score'].min():.1f}–{df['eviction_score'].max():.1f}")
    print(f"   cache_reuse — positive rate: {df['cache_reuse'].mean()*100:.1f}%")

    return df


# 4. TRAIN
FEATURE_COLS = [
    # Context
    "route_type_enc", "page_type_enc", "price_tier_enc", "is_single_item",
    "cache_key_prefix_enc",
    # Time of day
    "hour_of_day", "weekday", "is_peak_hour", "is_weekend",
    "hour_sin", "hour_cos", "day_sin", "day_cos",
    # Rule-based TTL anchor (safe prior — never contaminated by ML outputs)
    "ttl_label_log",
    # Access history (past-only, no leakage)
    "past_access_count", "log_past_count", "rolling_hit_rate", "route_hit_rate",
    # Inter-arrival timing
    "time_since_last_request", "request_interval_mean", "request_interval_std",
    "interval_mean_log",
    # Response complexity signal
    "latency_log",
]


def train(df: pd.DataFrame):
    print("\nTraining models...")
    X = df[FEATURE_COLS].fillna(0)

    # =====================================================================
    # Model 1: TTL Regressor
    # Key improvements vs v8:
    #   - ttl_label_log as feature (clean rule-based prior, ML-safe)
    #   - cache_key_prefix_enc (structural TTL regime signal)
    #   - route_hit_rate (route-level demand signal)
    #   - interval_mean_log (de-skewed timing feature)
    #   - per-route quantile-clipped target (reduced label noise)
    #   - Huber objective (robust to remaining outliers)
    #   - Deeper trees (max_depth=7) + more leaves (num_leaves=50)
    #     to capture interactions between TTL prior and traffic patterns
    # Expected: MAE ~150–220s, R² 0.65–0.80
    # =====================================================================
    y_ttl = df["dynamic_ttl"]
    Xtr, Xte, ytr, yte = train_test_split(
        X, y_ttl, test_size=0.2, random_state=42, shuffle=True
    )
    ttl_model = LGBMRegressor(
        objective="huber",          # robust to outlier labels
        alpha=0.9,                  # huber threshold — focus on bulk of distribution
        n_estimators=600,
        learning_rate=0.02,
        max_depth=7,
        num_leaves=50,
        min_child_samples=15,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.05,
        reg_lambda=0.1,
        n_iter_no_change=50,
        random_state=42,
        verbose=-1,
    )
    ttl_model.fit(Xtr, ytr, eval_set=[(Xte, yte)])
    ttl_preds = ttl_model.predict(Xte).clip(TTL_MIN, TTL_MAX)
    ttl_mae   = round(float(mean_absolute_error(yte, ttl_preds)), 2)
    ttl_r2    = round(float(r2_score(yte, ttl_preds)), 3)
    naive_mae = round(float(mean_absolute_error(yte, np.full(len(yte), ytr.mean()))), 2)
    print(f"\n   [1] TTL Regressor")
    print(f"       MAE    : {ttl_mae}s  (naive mean baseline: {naive_mae}s)")
    print(f"       R²     : {ttl_r2}")
    print(f"       Expected: MAE ~150–220s, R² 0.65–0.80")

    # =====================================================================
    # Model 2: Eviction Score Regressor — unchanged, already excellent
    # =====================================================================
    y_evict = df["eviction_score"]
    Xtr2, Xte2, ytr2, yte2 = train_test_split(
        X, y_evict, test_size=0.2, random_state=42, shuffle=True
    )
    evict_model = LGBMRegressor(
        n_estimators=300, learning_rate=0.03, max_depth=5,
        num_leaves=25, min_child_samples=20,
        subsample=0.8, colsample_bytree=0.8,
        reg_alpha=0.1, reg_lambda=0.1,
        random_state=42, verbose=-1,
    )
    evict_model.fit(Xtr2, ytr2)
    evict_preds = evict_model.predict(Xte2)
    evict_mae = round(float(mean_absolute_error(yte2, evict_preds)), 2)
    evict_r2  = round(float(r2_score(yte2, evict_preds)), 3)
    print(f"\n   [2] Eviction Score Regressor")
    print(f"       MAE : {evict_mae}")
    print(f"       R²  : {evict_r2}")
    print(f"       Expected: R² 0.6–0.85")

    # =====================================================================
    # Model 3: Cache-Reuse Classifier — unchanged, already solid
    # =====================================================================
    y_reuse = df["cache_reuse"]
    Xtr3, Xte3, ytr3, yte3 = train_test_split(
        X, y_reuse, test_size=0.2, random_state=42, shuffle=True
    )
    reuse_model = LGBMClassifier(
        n_estimators=300,
        learning_rate=0.03,
        max_depth=5,
        num_leaves=25,
        min_child_samples=20,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        random_state=42,
        verbose=-1,
    )
    reuse_model.fit(Xtr3, ytr3)
    reuse_preds = reuse_model.predict(Xte3)
    reuse_proba = reuse_model.predict_proba(Xte3)[:, 1]
    reuse_f1  = round(float(f1_score(yte3, reuse_preds, average="macro", zero_division=0)), 3)
    reuse_auc = round(float(roc_auc_score(yte3, reuse_proba)), 3)
    print(f"\n   [3] Cache-Reuse Classifier")
    print(f"       F1 (macro) : {reuse_f1}")
    print(f"       AUC-ROC    : {reuse_auc}")
    print(f"       Expected: F1 0.75–0.85, AUC 0.85–0.95")

    metrics = {
        "ttl_mae":           ttl_mae,
        "ttl_r2":            ttl_r2,
        "ttl_naive_mae":     naive_mae,
        "evict_mae":         evict_mae,
        "evict_r2":          evict_r2,
        "reuse_f1":          reuse_f1,
        "reuse_auc":         reuse_auc,
        "train_rows":        len(X),
        "test_rows":         len(Xte),
        "ttl_target_mean":   round(float(y_ttl.mean()), 1),
        "ttl_target_std":    round(float(y_ttl.std()), 1),
        "evict_target_mean": round(float(y_evict.mean()), 1),
        "evict_target_std":  round(float(y_evict.std()), 1),
        "reuse_positive_rate": round(float(y_reuse.mean()), 3),
    }

    return ttl_model, evict_model, reuse_model, metrics


# 5. SAVE
def save_models(ttl_model, evict_model, reuse_model, df, metrics=None):
    print(f"\nSaving to {MODEL_DIR}/")
    bundle = {
        "ttl_model":     ttl_model,
        "evict_model":   evict_model,
        "reuse_model":   reuse_model,
        "feature_cols":  FEATURE_COLS,
        "route_types":   ROUTE_TYPES,
        "prefetch_cols": [],  # backwards compat
    }
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(bundle, f)

    raw_imp  = ttl_model.feature_importances_
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
        "model_notes": {
            "ttl":   "huber-loss regressor on per-route quantile-clipped inter-arrival time; uses ttl_label (rule-based anchor) as prior — ttl_used excluded to avoid ML feedback loop",
            "evict": "future access count in 10-min window",
            "reuse": "binary: will key be accessed before TTL expires?",
        },
        "route_type_map": {r: i for i, r in enumerate(ROUTE_TYPES)},
        "page_type_map":  {
            "collection": 0, "product_detail": 1, "best_seller": 2,
            "new_arrivals": 3, "similar": 4,
        },
        "price_tier_map": {"unknown": 0, "budget": 1, "mid": 2, "premium": 3},
        "metrics":        metrics or {},
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
    for feat, imp in pairs[:12]:
        bar = "█" * int(imp / max_imp * 20)
        print(f"   {feat:<35} {bar} {imp:.0f}")


# MAIN
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    args = parser.parse_args()

    if not args.data.exists():
        print(f"Data file not found: {args.data}")
        return

    print("=" * 55)
    print("  LightCache — Phase 4: Model Training (v10)")
    print("=" * 55)

    df = load_data(args.data)
    df = engineer_features(df)
    df = build_targets(df)
    ttl_model, evict_model, reuse_model, metrics = train(df)
    save_models(ttl_model, evict_model, reuse_model, df, metrics)
    print_importance(ttl_model)

    print("\n" + "=" * 55)
    print("  Training complete — 3 models saved (v10)")
    print("  Next: python app.py")
    print("=" * 55)


if __name__ == "__main__":
    main()