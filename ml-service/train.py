import argparse
import json
import pickle
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.metrics import f1_score, mean_absolute_error, r2_score
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

# ── FEATURE_COLS now includes the 2 new TTL-signal features ───────────────────
# IMPORTANT: this list must stay in sync with engineer_features() and is saved
# into the model bundle so inference uses exactly the same columns.
FEATURE_COLS = [
    # Context
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
    # Access history (past-only, no leakage)
    "past_access_count",
    "log_past_count",
    "rolling_hit_rate",
    # Temporal inter-arrival features
    "time_since_last_request",
    "request_interval_mean",
    "request_interval_std",
    # NEW: TTL-specific derived signals
    "ttl_ratio",   # how early/late this request is relative to the key's rhythm
    "is_burst",    # 1 if access pattern is irregular/bursty
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

    # NEW FEATURE: ttl_ratio
    # How early or late is this request relative to the key's typical rhythm?
    # A ratio < 1 means requests are coming faster than usual (keep TTL short).
    # A ratio > 1 means requests are coming slower (extend TTL).
    df["ttl_ratio"] = (
        df["time_since_last_request"] / (df["request_interval_mean"] + 1)
    ).clip(0, 10)

    # NEW FEATURE: is_burst
    # 1 when the access pattern is erratic (std > mean), meaning timing is
    # unpredictable — the model should be more conservative with TTL.
    df["is_burst"] = (
        df["request_interval_std"] > df["request_interval_mean"]
    ).astype(int)

    print(f"   Done: {df.shape[1]} columns, {len(df):,} rows")
    return df


#  3. BUILD TARGETS (no leakage) 
def build_targets(df: pd.DataFrame) -> pd.DataFrame:
    print("\nBuilding targets...")
    df = df.copy()

    # Target 1: dynamic_ttl
    # Smoothed with a per-key rolling median BEFORE clipping to reduce the
    # impact of extreme gaps caused by one-off user behaviour.
    df["next_request_ts"] = df.groupby("cache_key")["timestamp"].shift(-1)
    df["dynamic_ttl_raw"] = (
        (df["next_request_ts"] - df["timestamp"]) / 1000.0
    )

    # Per-key rolling median (window=5, past-only) as a smoothed fallback
    df["ttl_smoothed"] = (
        df.groupby("cache_key")["dynamic_ttl_raw"]
        .transform(lambda x: x.shift(1).rolling(5, min_periods=1).median())
    )
    # Use raw where available, otherwise fall back to smoothed / global median
    global_median = df["dynamic_ttl_raw"].median()
    global_median = global_median if pd.notna(global_median) else 300.0

    df["dynamic_ttl"] = (
        df["dynamic_ttl_raw"]
        .fillna(df["ttl_smoothed"])
        .fillna(global_median)
        .clip(TTL_MIN, TTL_MAX)
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


#  4. TRAIN 
def train(df: pd.DataFrame):
    print("\nTraining models...")

    # Build feature matrix — FEATURE_COLS already includes ttl_ratio & is_burst
    # which were created in engineer_features(), so no columns added here.
    X = df[FEATURE_COLS].fillna(0)

    # Shared time-based split index (80/20, no shuffle — prevents temporal leakage)
    split_idx = int(len(X) * 0.8)

    #  Model 1: TTL Regressor 
    # We predict log1p(ttl) because the target is right-skewed (std ≈ mean).
    # Log-transform compresses large values, reduces variance, and gives the
    # model a much smoother loss surface. We reverse with expm1() at eval time
    # and flag this in the saved bundle so inference does the same.
    y_ttl_raw = df["dynamic_ttl"]
    y_ttl_log = np.log1p(y_ttl_raw)

    Xtr,  Xte  = X[:split_idx],          X[split_idx:]
    ytr,  yte  = y_ttl_log[:split_idx],  y_ttl_log[split_idx:]

    ttl_model = LGBMRegressor(
        n_estimators=800,
        learning_rate=0.02,
        max_depth=-1,          # uncapped depth — let num_leaves control complexity
        num_leaves=64,
        min_child_samples=10,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_alpha=0.05,
        reg_lambda=0.05,
        random_state=42,
        verbose=-1,
    )
    ttl_model.fit(Xtr, ytr)

    # Reverse log-transform for interpretable MAE/R² on original seconds scale
    ttl_preds = np.expm1(ttl_model.predict(Xte))
    yte_raw   = y_ttl_raw.iloc[split_idx:].values

    ttl_mae = round(float(mean_absolute_error(yte_raw, ttl_preds)), 2)
    ttl_r2  = round(float(r2_score(yte_raw, ttl_preds)), 3)
    print(f"\n   [1] TTL Regressor (log-transformed, time-split)")
    print(f"       MAE : {ttl_mae}s")
    print(f"       R²  : {ttl_r2}")
    print(f"       (Target: R² ≥ 0.60)")

    # Model 2: Eviction Score Regressor 
    y_evict = df["eviction_score"]
    Xtr2, Xte2 = X[:split_idx],          X[split_idx:]
    ytr2, yte2 = y_evict.iloc[:split_idx], y_evict.iloc[split_idx:]

    evict_model = LGBMRegressor(
        n_estimators=400,
        learning_rate=0.03,
        max_depth=6,
        num_leaves=40,
        min_child_samples=20,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        verbose=-1,
    )
    evict_model.fit(Xtr2, ytr2)
    evict_preds = evict_model.predict(Xte2)
    evict_mae = round(float(mean_absolute_error(yte2, evict_preds)), 2)
    evict_r2  = round(float(r2_score(yte2, evict_preds)), 3)
    print(f"\n   [2] Eviction Score Regressor (time-split)")
    print(f"       MAE : {evict_mae}")
    print(f"       R²  : {evict_r2}")
    print(f"       (Expected: R² 0.4–0.75)")

    # Model 3: Prefetch Classifier 
    prefetch_mask = df["next_route"].notna()
    X_pref = X[prefetch_mask].reset_index(drop=True)
    prefetch_cols = [f"prefetch_{rt}" for rt in ROUTE_TYPES]
    y_pref = df.loc[prefetch_mask, prefetch_cols].reset_index(drop=True)

    split_idx_pref = int(len(X_pref) * 0.8)
    Xtr3, Xte3 = X_pref[:split_idx_pref], X_pref[split_idx_pref:]
    ytr3, yte3 = y_pref[:split_idx_pref], y_pref[split_idx_pref:]

    base_clf = LGBMClassifier(
        n_estimators=250,
        learning_rate=0.03,
        max_depth=5,
        num_leaves=20,
        min_child_samples=20,
        random_state=42,
        verbose=-1,
    )
    prefetch_model = MultiOutputClassifier(base_clf, n_jobs=-1)
    prefetch_model.fit(Xtr3, ytr3)
    pref_preds = prefetch_model.predict(Xte3)
    pref_f1 = round(float(f1_score(yte3, pref_preds, average="macro", zero_division=0)), 3)
    print(f"\n   [3] Prefetch Multi-Label Classifier (time-split)")
    print(f"       F1 (macro) : {pref_f1}")
    print(f"       (Expected: F1 0.5–0.8)")

    metrics = {
        "ttl_mae":           ttl_mae,
        "ttl_r2":            ttl_r2,
        "evict_mae":         evict_mae,
        "evict_r2":          evict_r2,
        "prefetch_f1":       pref_f1,
        "train_rows":        split_idx,
        "test_rows":         len(X) - split_idx,
        "ttl_target_mean":   round(float(y_ttl_raw.mean()), 1),
        "ttl_target_std":    round(float(y_ttl_raw.std()), 1),
        "evict_target_mean": round(float(y_evict.mean()), 1),
        "evict_target_std":  round(float(y_evict.std()), 1),
    }

    return ttl_model, evict_model, prefetch_model, metrics


# 5. SAVE 
def save_models(ttl_model, evict_model, prefetch_model, df, metrics=None):
    print(f"\nSaving to {MODEL_DIR}/")
    bundle = {
        "ttl_model":         ttl_model,
        "evict_model":       evict_model,
        "prefetch_model":    prefetch_model,
        "feature_cols":      FEATURE_COLS,   # includes ttl_ratio & is_burst
        "route_types":       ROUTE_TYPES,
        "prefetch_cols":     [f"prefetch_{rt}" for rt in ROUTE_TYPES],
        # IMPORTANT: inference must call np.expm1() on the TTL prediction
        "ttl_log_transform": True,
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
        "trained_at":        pd.Timestamp.now().isoformat(),
        "training_rows":     len(df),
        "feature_cols":      FEATURE_COLS,
        "route_types":       ROUTE_TYPES,
        "ttl_bounds":        {"min": TTL_MIN, "max": TTL_MAX},
        "ttl_log_transform": True,
        "route_type_map":    {r: i for i, r in enumerate(ROUTE_TYPES)},
        "page_type_map":     {
            "collection": 0, "product_detail": 1, "best_seller": 2,
            "new_arrivals": 3, "similar": 4,
        },
        "price_tier_map":    {"unknown": 0, "budget": 1, "mid": 2, "premium": 3},
        "metrics":           metrics or {},
        "feature_importances": feat_imp,
    }
    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"   Model saved : {MODEL_PATH.name}")
    print(f"   Meta  saved : {META_PATH.name}")
    print(f"   ⚠  Inference note: TTL predictions must be reversed with np.expm1()")


# 6. FEATURE IMPORTANCE 
def print_importance(ttl_model):
    print("\nTop features — TTL model:")
    # zip against FEATURE_COLS (now 19 cols) — lengths always match
    pairs = sorted(
        zip(FEATURE_COLS, ttl_model.feature_importances_),
        key=lambda x: x[1], reverse=True,
    )
    max_imp = max(v for _, v in pairs)
    for feat, imp in pairs[:10]:
        bar = "█" * int(imp / max_imp * 20)
        print(f"   {feat:<32} {bar} {imp:.0f}")


# MAIN 
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    args = parser.parse_args()

    if not args.data.exists():
        print(f"Data file not found: {args.data}")
        return

    print("=" * 60)
    print("  LightCache — Phase 4: Model Training (v4 — improved TTL)")
    print("=" * 60)

    df = load_data(args.data)
    df = engineer_features(df)   # ttl_ratio & is_burst built here
    df = build_targets(df)
    ttl_model, evict_model, prefetch_model, metrics = train(df)
    save_models(ttl_model, evict_model, prefetch_model, df, metrics)
    print_importance(ttl_model)

    print("\n" + "=" * 60)
    print("  Training complete — 3 models saved (v4)")
    print("  Reminder: update your inference code to call np.expm1()")
    print("            on the TTL model output.")
    print("  Next: python app.py")
    print("=" * 60)


if __name__ == "__main__":
    main()