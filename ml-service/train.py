
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

    # TEMPORAL FEATURES 
    # time_since_last_request: how long ago was this key last accessed?
    # This is the single most important signal for predicting when it will
    # be accessed again — keys with short inter-arrival times will have
    # short optimal TTLs, and vice versa.
    df["prev_request_ts"] = df.groupby("cache_key")["timestamp"].shift(1)
    df["time_since_last_request"] = (
        (df["timestamp"] - df["prev_request_ts"]) / 1000.0  # ms to seconds
    ).fillna(0).clip(0, TTL_MAX)

    # request_interval_mean: average gap between requests for this key
    # Gives the model a stable baseline of how "frequent" this key is
    def rolling_interval_mean(group):
        intervals = group.diff().shift(1)  # past intervals only
        return intervals.rolling(10, min_periods=1).mean().fillna(300)

    df["request_interval_mean"] = (
        df.groupby("cache_key")["timestamp"]
        .transform(lambda x: rolling_interval_mean(x) / 1000.0)
        .clip(0, TTL_MAX)
    )

    # request_interval_std: how variable are the gaps?
    # High std = unpredictable access pattern = model should be more conservative
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



# 3. BUILD TARGETS (no leakage)
def build_targets(df: pd.DataFrame) -> pd.DataFrame:
    print("\nBuilding targets...")
    df = df.copy()

    # Target 1: dynamic_ttl 
    # Ideal TTL = actual time until the same cache key is requested again.
    # Grouped by cache_key so timestamps from different keys never mix.
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

    # Target 2: eviction_score 
    # Future access count within next 10 minutes.
    # High future demand = high cache value = high eviction score (keep it).
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
    # What route type is requested next for the same cache key?
    # Grouped by cache_key — no cross-key contamination.
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
    # Temporal inter-arrival features (the TTL fix)
    "time_since_last_request",
    "request_interval_mean",
    "request_interval_std",
]


def train(df: pd.DataFrame):
    print("\nTraining models...")
    X = df[FEATURE_COLS].fillna(0)

    # Model 1: Dynamic TTL 
    y_ttl = df["dynamic_ttl"]
    Xtr, Xte, ytr, yte = train_test_split(
        X, y_ttl, test_size=0.2, random_state=42, shuffle=True
    )
    ttl_model = LGBMRegressor(
        n_estimators=400, learning_rate=0.03, max_depth=6,
        num_leaves=31, min_child_samples=20,
        subsample=0.8, colsample_bytree=0.8,
        reg_alpha=0.1, reg_lambda=0.1,
        random_state=42, verbose=-1,
    )
    ttl_model.fit(Xtr, ytr)
    ttl_preds = ttl_model.predict(Xte)
    print(f"\n   [1] TTL Regressor")
    print(f"       MAE : {mean_absolute_error(yte, ttl_preds):.1f}s")
    print(f"       R2  : {r2_score(yte, ttl_preds):.3f}")
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
    print(f"\n   [2] Eviction Score Regressor")
    print(f"       MAE : {mean_absolute_error(yte2, evict_preds):.2f}")
    print(f"       R2  : {r2_score(yte2, evict_preds):.3f}")
    print(f"       (Expected: R2 0.4–0.75)")

    # Model 3: Prefetch Classifier 
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
    f1 = f1_score(yte3, pref_preds, average="macro", zero_division=0)
    print(f"\n   [3] Prefetch Multi-Label Classifier")
    print(f"       F1 (macro) : {f1:.3f}")
    print(f"       (Expected: F1 0.5–0.8)")

    return ttl_model, evict_model, prefetch_model



# 5. SAVE
def save_models(ttl_model, evict_model, prefetch_model, df):
    print(f"\nSaving to {MODEL_DIR}/")
    bundle = {
        "ttl_model":      ttl_model,
        "evict_model":    evict_model,
        "prefetch_model": prefetch_model,
        "feature_cols":   FEATURE_COLS,
        "route_types":    ROUTE_TYPES,
        "prefetch_cols":  [f"prefetch_{rt}" for rt in ROUTE_TYPES],
    }
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(bundle, f)

    meta = {
        "trained_at":     pd.Timestamp.now().isoformat(),
        "training_rows":  len(df),
        "feature_cols":   FEATURE_COLS,
        "route_types":    ROUTE_TYPES,
        "ttl_bounds":     {"min": TTL_MIN, "max": TTL_MAX},
        "route_type_map": {r: i for i, r in enumerate(ROUTE_TYPES)},
        "page_type_map":  {
            "collection": 0, "product_detail": 1, "best_seller": 2,
            "new_arrivals": 3, "similar": 4,
        },
        "price_tier_map": {"unknown": 0, "budget": 1, "mid": 2, "premium": 3},
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
    print("  LightCache — Phase 4: Model Training (v3)")
    print("=" * 55)

    df = load_data(args.data)
    df = engineer_features(df)
    df = build_targets(df)
    ttl_model, evict_model, prefetch_model = train(df)
    save_models(ttl_model, evict_model, prefetch_model, df)
    print_importance(ttl_model)

    print("\n" + "=" * 55)
    print("  Training complete — 3 genuine ML models saved")
    print("  Next: python app.py")
    print("=" * 55)


if __name__ == "__main__":
    main()