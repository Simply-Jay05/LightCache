import argparse
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import pickle
from lightgbm import LGBMRegressor, LGBMClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, f1_score
from sklearn.multioutput import MultiOutputClassifier

warnings.filterwarnings("ignore")

# Paths
BASE_DIR    = Path(__file__).parent
MODEL_DIR   = BASE_DIR / "model"
MODEL_PATH  = MODEL_DIR / "lightcache_model.pkl"
META_PATH   = MODEL_DIR / "model_meta.json"
DEFAULT_DATA = BASE_DIR.parent / "backend" / "logs" / "cache_events.jsonl"

MODEL_DIR.mkdir(exist_ok=True)

TTL_MIN = 30
TTL_MAX = 1800

# All possible route types — order matters for the prefetch classifier
ROUTE_TYPES = [
    "products_list",
    "product_single",
    "best_seller",
    "new_arrivals",
    "similar_products",
]

# Co-occurrence map 
# Which routes commonly follow a given route in a real browsing session.
# Used to build the prefetch training labels.
COOCCURRENCE = {
    "product_single":   ["similar_products", "best_seller",  "products_list"],
    "products_list":    ["product_single",   "new_arrivals", "best_seller"],
    "best_seller":      ["product_single",   "similar_products", "products_list"],
    "new_arrivals":     ["product_single",   "products_list", "best_seller"],
    "similar_products": ["product_single",   "products_list", "new_arrivals"],
}



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
    print(f"   Loaded  : {len(df):,} rows")
    if skipped:
        print(f"   Skipped : {skipped} malformed lines")
    return df



# 2. FEATURE ENGINEERING
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    print("\n🔧 Engineering features...")
    df = df.copy()

    route_map = {r: i for i, r in enumerate(ROUTE_TYPES)}
    page_map  = {
        "collection": 0, "product_detail": 1, "best_seller": 2,
        "new_arrivals": 3, "similar": 4,
    }
    tier_map = {"unknown": 0, "budget": 1, "mid": 2, "premium": 3}

    df["route_type_enc"]  = df["route_type"].map(route_map).fillna(0).astype(int)
    df["page_type_enc"]   = df["page_type"].map(page_map).fillna(0).astype(int)
    df["price_tier_enc"]  = df["price_tier"].map(tier_map).fillna(0).astype(int)

    df["hour_of_day"]  = df["hour_of_day"].fillna(0).astype(int).clip(0, 23)
    df["weekday"]      = df["weekday"].fillna(0).astype(int).clip(0, 6)
    df["is_weekend"]   = df["is_weekend"].fillna(0).astype(int)
    df["is_peak_hour"] = df["is_peak_hour"].fillna(0).astype(int)

    # Cyclical time encoding so hour 23 and 0 are close together
    df["hour_sin"] = np.sin(2 * np.pi * df["hour_of_day"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour_of_day"] / 24)
    df["day_sin"]  = np.sin(2 * np.pi * df["weekday"] / 7)
    df["day_cos"]  = np.cos(2 * np.pi * df["weekday"] / 7)

    key_counts = df["cache_key"].value_counts()
    df["key_access_count"] = df["cache_key"].map(key_counts).fillna(1).astype(int)
    df["log_key_count"] = np.log1p(df["key_access_count"])

    key_hit_rate = df.groupby("cache_key")["is_hit"].mean()
    df["key_hit_rate"] = df["cache_key"].map(key_hit_rate).fillna(0.5)

    df["latency_ms"]  = df["latency_ms"].fillna(0).astype(float).clip(0, 5000)
    df["log_latency"] = np.log1p(df["latency_ms"])
    df["ttl_used"]    = df["ttl_used"].fillna(300).astype(int).clip(TTL_MIN, TTL_MAX)
    df["is_single_item"] = df["route_type"].isin(
        ["product_single", "best_seller"]
    ).astype(int)

    print(f"   Done: {df.shape[1]} columns, {len(df):,} rows")
    return df



# 3. BUILD TARGETS
def build_targets(df: pd.DataFrame) -> pd.DataFrame:
    print("\n🎯 Building targets...")
    df = df.copy()

    # Target 1: dynamic_ttl 
    # Popular items earn a TTL boost. Missed items get a small uplift.
    popularity_boost  = np.log1p(df["key_access_count"]) * 30
    df["dynamic_ttl"] = (df["ttl_used"] + popularity_boost).clip(TTL_MIN, TTL_MAX)
    miss_mask = df["is_hit"] == 0
    df.loc[miss_mask, "dynamic_ttl"] = (
        df.loc[miss_mask, "dynamic_ttl"] * 1.5
    ).clip(TTL_MIN, TTL_MAX)

    # Target 2: eviction_score 
    # Higher score = keep in cache longer.
    # Low-hit-rate + low-latency items should be evicted first.
    df["eviction_score"] = (
          df["key_hit_rate"] * 100
        + df["log_latency"]  * 10
        + df["log_key_count"] * 5
        - df["is_weekend"].astype(float) * 5
    ).clip(0, 200)

    # Target 3: prefetch labels (multi-label, one column per route type) 
    # For each row, mark which route types should be prefetched next.
    # Label is 1 if that route type commonly follows the current one.
    for rt in ROUTE_TYPES:
        col = f"prefetch_{rt}"
        df[col] = df["route_type"].apply(
            lambda current_route: 1 if rt in COOCCURRENCE.get(current_route, []) else 0
        )

    prefetch_cols = [f"prefetch_{rt}" for rt in ROUTE_TYPES]
    print(f"   dynamic_ttl    — mean: {df['dynamic_ttl'].mean():.0f}s  "
          f"range: {df['dynamic_ttl'].min():.0f}–{df['dynamic_ttl'].max():.0f}s")
    print(f"   eviction_score — mean: {df['eviction_score'].mean():.1f}  "
          f"range: {df['eviction_score'].min():.1f}–{df['eviction_score'].max():.1f}")
    print(f"   prefetch cols  — {prefetch_cols}")
    return df



# 4. TRAIN
FEATURE_COLS = [
    "route_type_enc", "page_type_enc", "price_tier_enc",
    "hour_of_day", "weekday", "is_weekend", "is_peak_hour",
    "hour_sin", "hour_cos", "day_sin", "day_cos",
    "key_access_count", "log_key_count", "key_hit_rate",
    "latency_ms", "log_latency", "ttl_used", "is_single_item", "is_hit",
]


def train(df: pd.DataFrame):
    print("\n🚀 Training models...")
    X = df[FEATURE_COLS].fillna(0)

    # Model 1: Dynamic TTL (regression)
    y_ttl = df["dynamic_ttl"]
    Xtr, Xte, ytr, yte = train_test_split(X, y_ttl, test_size=0.2, random_state=42)
    ttl_model = LGBMRegressor(
        n_estimators=300, learning_rate=0.05, max_depth=6,
        num_leaves=31, min_child_samples=20,
        subsample=0.8, colsample_bytree=0.8,
        reg_alpha=0.1, reg_lambda=0.1,
        random_state=42, verbose=-1,
    )
    ttl_model.fit(Xtr, ytr)
    preds = ttl_model.predict(Xte)
    print(f"\n   [1] TTL Regressor")
    print(f"       MAE : {mean_absolute_error(yte, preds):.1f}s")
    print(f"       R²  : {r2_score(yte, preds):.3f}")

    # Model 2: Eviction Score (regression) 
    y_evict = df["eviction_score"]
    Xtr2, Xte2, ytr2, yte2 = train_test_split(X, y_evict, test_size=0.2, random_state=42)
    evict_model = LGBMRegressor(
        n_estimators=200, learning_rate=0.05, max_depth=5,
        num_leaves=25, min_child_samples=20,
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, verbose=-1,
    )
    evict_model.fit(Xtr2, ytr2)
    preds2 = evict_model.predict(Xte2)
    print(f"\n   [2] Eviction Score Regressor")
    print(f"       MAE : {mean_absolute_error(yte2, preds2):.2f}")
    print(f"       R²  : {r2_score(yte2, preds2):.3f}")

    # Model 3: Prefetch Classifier (multi-label) 
    prefetch_cols = [f"prefetch_{rt}" for rt in ROUTE_TYPES]
    y_prefetch = df[prefetch_cols]
    Xtr3, Xte3, ytr3, yte3 = train_test_split(
        X, y_prefetch, test_size=0.2, random_state=42
    )
    base_clf = LGBMClassifier(
        n_estimators=150, learning_rate=0.05, max_depth=4,
        num_leaves=15, min_child_samples=20,
        random_state=42, verbose=-1,
    )
    prefetch_model = MultiOutputClassifier(base_clf, n_jobs=-1)
    prefetch_model.fit(Xtr3, ytr3)
    preds3 = prefetch_model.predict(Xte3)
    f1 = f1_score(yte3, preds3, average="macro", zero_division=0)
    print(f"\n   [3] Prefetch Multi-Label Classifier")
    print(f"       F1 (macro) : {f1:.3f}")
    print(f"       Labels     : {prefetch_cols}")

    return ttl_model, evict_model, prefetch_model



# 5. SAVE
def save_models(ttl_model, evict_model, prefetch_model, df):
    print(f"\n💾 Saving to {MODEL_DIR}/")

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
        "trained_at":    pd.Timestamp.now().isoformat(),
        "training_rows": len(df),
        "feature_cols":  FEATURE_COLS,
        "route_types":   ROUTE_TYPES,
        "ttl_bounds":    {"min": TTL_MIN, "max": TTL_MAX},
        "route_type_map": {r: i for i, r in enumerate(ROUTE_TYPES)},
        "page_type_map": {
            "collection": 0, "product_detail": 1, "best_seller": 2,
            "new_arrivals": 3, "similar": 4,
        },
        "price_tier_map": {"unknown": 0, "budget": 1, "mid": 2, "premium": 3},
    }
    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"   ✅ {MODEL_PATH.name}")
    print(f"   ✅ {META_PATH.name}")



# 6. FEATURE IMPORTANCE
def print_importance(ttl_model):
    print("\n📊 Top 10 features — TTL model:")
    pairs = sorted(
        zip(FEATURE_COLS, ttl_model.feature_importances_),
        key=lambda x: x[1], reverse=True,
    )
    max_imp = max(v for _, v in pairs)
    for feat, imp in pairs[:10]:
        bar = "█" * int(imp / max_imp * 20)
        print(f"   {feat:<25} {bar} {imp:.0f}")



# MAIN
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    args = parser.parse_args()

    if not args.data.exists():
        print(f"❌ Data file not found: {args.data}")
        print("   Run Locust first to generate training data.")
        return

    print("═" * 55)
    print("  LightCache — Phase 4: Model Training")
    print("═" * 55)

    df = load_data(args.data)
    df = engineer_features(df)
    df = build_targets(df)
    ttl_model, evict_model, prefetch_model = train(df)
    save_models(ttl_model, evict_model, prefetch_model, df)
    print_importance(ttl_model)

    print("\n" + "═" * 55)
    print("  ✅ Training complete — 3 models saved")
    print("  Next: python app.py")
    print("═" * 55)


if __name__ == "__main__":
    main()
