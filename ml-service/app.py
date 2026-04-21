import json
import math
import os
import pickle
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Paths
BASE_DIR   = Path(__file__).parent
MODEL_PATH = BASE_DIR / "model" / "lightcache_model.pkl"
META_PATH  = BASE_DIR / "model" / "model_meta.json"

BENCHMARK_MODEL_PATH = BASE_DIR / "model" / "benchmark_results.json"
BENCHMARK_LOGS_PATH  = BASE_DIR / "logs"  / "benchmark_results.json"
BENCHMARK_DATA_PATH  = BASE_DIR / "logs"  / "cache_events.jsonl"

# Model globals (None until trained)
# TTL_MODEL is now a dict with "stage1_classifier" and "stage2_regressor"
# for the two-stage hurdle model, OR a plain LGBMRegressor for old pickles.
TTL_MODEL      = None
EVICT_MODEL    = None
PREFETCH_MODEL = None
FEATURE_COLS   = []
ROUTE_TYPES    = []
META           = {}

# Default fallback values used when no model is loaded
DEFAULT_META = {
    "trained_at":    None,
    "training_rows": 0,
    "ttl_bounds":    {"min": 30, "max": 1800},
    "route_type_map":  {"products_list": 0, "product_single": 1,
                        "best_seller": 2, "new_arrivals": 3, "similar_products": 4},
    "page_type_map":   {"collection": 0, "product_detail": 1,
                        "best_seller": 2, "new_arrivals": 3, "similar": 4},
    "price_tier_map":  {"unknown": 0, "budget": 1, "mid": 2, "premium": 3},
}

MODEL_READY = False   # flips True once a model is successfully loaded


def predict_ttl(ttl_model, X: np.ndarray, ttl_min: int = 30, ttl_max: int = 1800) -> float:
    """
    Unified TTL prediction that handles both model formats:
      - New format: dict with stage1_classifier + stage2_regressor (two-stage hurdle)
      - Old format: plain LGBMRegressor (backwards compatible with old pickles)
    """
    # New two-stage hurdle model
    if isinstance(ttl_model, dict) and "stage1_classifier" in ttl_model:
        clf  = ttl_model["stage1_classifier"]
        reg  = ttl_model["stage2_regressor"]
        tmax = ttl_model.get("ttl_max", ttl_max)

        prob_capped = clf.predict_proba(X)[:, 1]
        is_capped   = prob_capped[0] >= 0.5

        if is_capped:
            return float(tmax)

        raw = float(reg.predict(X)[0])
        return float(np.clip(raw, ttl_min, tmax - 1))

    # Legacy single-model format (backwards compatible)
    return float(ttl_model.predict(X)[0])


def try_load_model() -> bool:
    """
    Attempt to load the model from disk.
    Returns True if successful, False if model does not exist yet.
    Safe to call multiple times — always replaces globals atomically.
    """
    global TTL_MODEL, EVICT_MODEL, PREFETCH_MODEL, FEATURE_COLS, ROUTE_TYPES
    global META, MODEL_READY

    if not MODEL_PATH.exists():
        print("  No model found yet — running in fixed-TTL fallback mode.")
        print("   System will collect user traffic data and retrain automatically.")
        META = DEFAULT_META
        return False

    try:
        with open(MODEL_PATH, "rb") as f:
            bundle = pickle.load(f)

        TTL_MODEL      = bundle["ttl_model"]
        EVICT_MODEL    = bundle["evict_model"]
        PREFETCH_MODEL = bundle["prefetch_model"]
        FEATURE_COLS   = bundle["feature_cols"]
        ROUTE_TYPES    = bundle["route_types"]

        with open(META_PATH, "r") as f:
            META = json.load(f)

        MODEL_READY = True

        # Log which TTL model type was loaded
        ttl_type = (
            "two-stage hurdle"
            if isinstance(TTL_MODEL, dict) and "stage1_classifier" in TTL_MODEL
            else "single regressor (legacy)"
        )
        print(f"✅ Model loaded — trained on {META['training_rows']:,} rows")
        print(f"   Trained at : {META['trained_at']}")
        print(f"   TTL model  : {ttl_type}")
        return True

    except Exception as e:
        print(f"⚠️  Model file exists but failed to load: {e}")
        print("   Falling back to fixed-TTL mode.")
        META = DEFAULT_META
        return False


# Schemas
class PredictRequest(BaseModel):
    route_type:               str
    page_type:                str
    item_id:                  Optional[str]   = ""
    cache_key:                str
    hour_of_day:              int
    weekday:                  int
    is_weekend:               int
    is_peak_hour:             int
    price_tier:               Optional[str]   = "unknown"
    ttl_used:                 Optional[int]   = 300
    latency_ms:               Optional[float] = 0.0
    key_access_count:         Optional[int]   = 1
    key_hit_rate:             Optional[float] = 0.5
    is_hit:                   Optional[int]   = 0
    time_since_last_request:  Optional[float] = 0.0
    request_interval_mean:    Optional[float] = 300.0
    request_interval_std:     Optional[float] = 0.0


class PredictResponse(BaseModel):
    ttl_seconds:     int
    eviction_score:  float
    prefetch_routes: List[str]
    inference_ms:    float
    model_version:   str


# Feature vector builder
def build_vector(req: PredictRequest) -> np.ndarray:
    route_map = META.get("route_type_map",  DEFAULT_META["route_type_map"])
    page_map  = META.get("page_type_map",   DEFAULT_META["page_type_map"])
    tier_map  = META.get("price_tier_map",  DEFAULT_META["price_tier_map"])

    route_enc = route_map.get(req.route_type, 0)
    page_enc  = page_map.get(req.page_type, 0)
    tier_enc  = tier_map.get(req.price_tier or "unknown", 0)
    is_single = 1 if req.route_type in ("product_single", "best_seller") else 0

    hour_sin = math.sin(2 * math.pi * req.hour_of_day / 24)
    hour_cos = math.cos(2 * math.pi * req.hour_of_day / 24)
    day_sin  = math.sin(2 * math.pi * req.weekday / 7)
    day_cos  = math.cos(2 * math.pi * req.weekday / 7)

    past_access = req.key_access_count or 1
    log_past    = math.log1p(past_access)

    return np.array([[
        route_enc, page_enc, tier_enc, is_single,
        req.hour_of_day, req.weekday, req.is_peak_hour,
        hour_sin, hour_cos, day_sin, day_cos,
        past_access, log_past, req.key_hit_rate or 0.5,
        req.time_since_last_request or 0.0,
        req.request_interval_mean or 300.0,
        req.request_interval_std or 0.0,
    ]])


# Predict
def run_predict(req: PredictRequest) -> PredictResponse:
    if not MODEL_READY:
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. System is collecting training data."
        )

    t0 = time.perf_counter()
    X  = build_vector(req)

    # ── TTL: works with both two-stage and legacy single-model formats ────
    ttl_min     = META.get("ttl_bounds", {}).get("min", 30)
    ttl_max     = META.get("ttl_bounds", {}).get("max", 1800)
    raw_ttl     = predict_ttl(TTL_MODEL, X, ttl_min=ttl_min, ttl_max=ttl_max)
    ttl_seconds = int(np.clip(round(raw_ttl), ttl_min, ttl_max))
    # ──────────────────────────────────────────────────────────────────────

    raw_evict      = float(EVICT_MODEL.predict(X)[0])
    eviction_score = round(float(np.clip(raw_evict, 0, 200)), 2)

    proba_list = PREFETCH_MODEL.predict_proba(X)
    scores = []
    for i, proba in enumerate(proba_list):
        route = ROUTE_TYPES[i]
        if route == req.route_type:
            continue
        scores.append((route, float(proba[0][1])))
    scores.sort(key=lambda x: x[1], reverse=True)
    prefetch_routes = [r for r, _ in scores[:3]]

    inference_ms = round((time.perf_counter() - t0) * 1000, 3)

    return PredictResponse(
        ttl_seconds=ttl_seconds,
        eviction_score=eviction_score,
        prefetch_routes=prefetch_routes,
        inference_ms=inference_ms,
        model_version=META.get("trained_at", "no-model"),
    )


# Benchmark
def run_benchmark_if_needed():
    import subprocess, shutil

    BENCHMARK_LOGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    BENCHMARK_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

    if not BENCHMARK_DATA_PATH.exists():
        print("Benchmark: no log data yet — skipping")
        return

    try:
        print("Running LRU/LFU/LightCache benchmark simulation...")
        result = subprocess.run(
            ["python", str(BASE_DIR / "benchmark.py"),
             "--data", str(BENCHMARK_DATA_PATH),
             "--output", str(BENCHMARK_MODEL_PATH)],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            shutil.copy2(BENCHMARK_MODEL_PATH, BENCHMARK_LOGS_PATH)
            print("Benchmark complete and copied to shared volume.")
        else:
            print(f"Benchmark error: {result.stderr[:200]}")
    except Exception as e:
        print(f"Benchmark failed (non-critical): {e}")


# Lifespan
@asynccontextmanager
async def lifespan(app):
    try_load_model()

    if MODEL_READY:
        try:
            dummy = PredictRequest(
                route_type="product_single", page_type="product_detail",
                cache_key="warmup", hour_of_day=12, weekday=1,
                is_weekend=0, is_peak_hour=1,
            )
            result = run_predict(dummy)
            print(f"Warmup complete — first inference took {result.inference_ms}ms")
        except Exception as e:
            print(f"Warmup failed (non-critical): {e}")

    import threading
    threading.Thread(target=run_benchmark_if_needed, daemon=True).start()

    yield


# App
app = FastAPI(
    title="LightCache ML Service",
    description="Dynamic TTL, eviction score and prefetch predictions",
    version="3.0.0",
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])


# Endpoints

@app.get("/health")
def health():
    return {
        "status":        "ok",
        "model_ready":   MODEL_READY,
        "trained_at":    META.get("trained_at"),
        "training_rows": META.get("training_rows", 0),
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    return run_predict(req)


@app.get("/model/info")
def model_info():
    ttl_type = (
        "two-stage hurdle"
        if isinstance(TTL_MODEL, dict) and "stage1_classifier" in TTL_MODEL
        else "single regressor (legacy)" if TTL_MODEL is not None
        else "not loaded"
    )
    return {
        "model_ready":   MODEL_READY,
        "trained_at":    META.get("trained_at"),
        "training_rows": META.get("training_rows", 0),
        "features":      FEATURE_COLS,
        "route_types":   ROUTE_TYPES,
        "ttl_bounds":    META.get("ttl_bounds"),
        "ttl_model_type": ttl_type,
    }


@app.get("/admin/readiness")
def readiness():
    MIN_ROWS  = int(os.getenv("MIN_ROWS_TO_RETRAIN", "1000"))
    row_count = 0
    if BENCHMARK_DATA_PATH.exists():
        try:
            with open(BENCHMARK_DATA_PATH, "r", encoding="utf-8") as f:
                row_count = sum(1 for line in f if line.strip())
        except Exception:
            pass

    history_file = BASE_DIR / "model" / "retrain_history.json"
    last_trained = None
    if history_file.exists():
        try:
            with open(history_file, "r") as f:
                hist = json.load(f)
            if hist:
                last_trained = hist[-1].get("retrained_at")
        except Exception:
            pass

    return {
        "row_count":    row_count,
        "min_rows":     MIN_ROWS,
        "ready":        row_count >= MIN_ROWS,
        "model_exists": MODEL_PATH.exists(),
        "model_ready":  MODEL_READY,
        "last_trained": last_trained,
        "pct":          round(min(row_count / max(MIN_ROWS, 1) * 100, 100), 1),
    }


@app.post("/admin/reload")
def reload_model():
    """Hot-reload model from disk without restarting. Called after retraining."""
    global TTL_MODEL, EVICT_MODEL, PREFETCH_MODEL, FEATURE_COLS, ROUTE_TYPES
    global META, MODEL_READY

    if not MODEL_PATH.exists():
        raise HTTPException(status_code=404, detail="Model file not found")

    success = try_load_model()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to load model")

    return {
        "status":        "reloaded",
        "trained_at":    META.get("trained_at"),
        "training_rows": META.get("training_rows"),
    }


@app.post("/admin/trigger-retrain")
def trigger_retrain():
    """Force immediate retraining from the admin dashboard."""
    import subprocess

    if not BENCHMARK_DATA_PATH.exists():
        raise HTTPException(status_code=400,
            detail="No training data found. Collect real traffic first.")

    MIN_ROWS  = int(os.getenv("MIN_ROWS_TO_RETRAIN", "1000"))
    row_count = sum(1 for line in open(BENCHMARK_DATA_PATH) if line.strip())
    if row_count < MIN_ROWS:
        raise HTTPException(status_code=400,
            detail=f"Only {row_count} rows — need {MIN_ROWS}. "
                   "Use simulate-from-real to augment, or wait for more traffic.")

    try:
        result = subprocess.run(
            ["python", str(BASE_DIR / "train.py"),
             "--data", str(BENCHMARK_DATA_PATH)],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode != 0:
            raise HTTPException(status_code=500,
                detail=f"Training failed: {result.stderr[:500]}")

        success = try_load_model()
        if not success:
            raise HTTPException(status_code=500,
                detail="Training completed but model failed to load")

        fresh = META.get("metrics", {})
        return {
            "status":        "retrained",
            "training_rows": row_count,
            "trained_at":    META.get("trained_at"),
            "ttl_mae":       fresh.get("ttl_mae"),
            "ttl_r2":        fresh.get("ttl_r2"),
            "message":       "Model retrained and hot-reloaded. You can now activate ML mode.",
        }
    except HTTPException:
        raise
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Training timed out (>5 min)")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/simulate-from-real")
def simulate_from_real():
    """Generate synthetic rows mirroring real traffic distribution."""
    import random, math as _math

    MIN_ROWS  = int(os.getenv("MIN_ROWS_TO_RETRAIN", "1000"))
    real_rows = []
    if BENCHMARK_DATA_PATH.exists():
        with open(BENCHMARK_DATA_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        real_rows.append(json.loads(line))
                    except Exception:
                        pass

    if len(real_rows) < 10:
        raise HTTPException(status_code=400,
            detail="Need at least 10 real rows to base simulation on.")

    existing = len(real_rows)
    needed   = max(0, MIN_ROWS - existing)
    if needed == 0:
        return {"status": "already_ready", "real_rows": existing,
                "generated": 0, "total": existing}

    route_choices  = [r.get("route_type",  "products_list") for r in real_rows]
    page_choices   = [r.get("page_type",   "collection")    for r in real_rows]
    tier_choices   = [r.get("price_tier",  "unknown")       for r in real_rows]
    event_choices  = [r.get("event_type",  "MISS")          for r in real_rows]
    ttl_values     = [float(r.get("ttl_used",   300)) for r in real_rows]
    latency_values = [float(r.get("latency_ms",  50)) for r in real_rows]
    hour_choices   = [int(r.get("hour_of_day",   12)) for r in real_rows]

    ttl_mean = sum(ttl_values) / len(ttl_values)
    ttl_std  = _math.sqrt(sum((x-ttl_mean)**2 for x in ttl_values)  / len(ttl_values)) or 30
    lat_mean = sum(latency_values) / len(latency_values)
    lat_std  = _math.sqrt(sum((x-lat_mean)**2 for x in latency_values) / len(latency_values)) or 20

    now_ms = time.time() * 1000
    generated = []
    for _ in range(needed):
        ttl_raw = max(30, ttl_mean + random.gauss(0, ttl_std * 0.3))
        lat_raw = max(1,  lat_mean + random.gauss(0, lat_std  * 0.3))
        generated.append({
            "event_type":  random.choice(event_choices),
            "cache_key":   f"products:sim:{random.randint(1,500)}",
            "route_type":  random.choice(route_choices),
            "page_type":   random.choice(page_choices),
            "item_id":     str(random.randint(1, 500)),
            "query":       "{}",
            "ttl_used":    str(round(ttl_raw)),
            "latency_ms":  str(round(lat_raw, 2)),
            "hour_of_day": str(random.choice(hour_choices)),
            "weekday":     str(random.randint(0, 6)),
            "ml_used":     "false",
            "price_tier":  random.choice(tier_choices),
            "timestamp":   str(int(now_ms + random.uniform(-7*24*3600*1000, 0))),
        })

    BENCHMARK_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(BENCHMARK_DATA_PATH, "a", encoding="utf-8") as f:
        for row in generated:
            f.write(json.dumps(row) + "\n")

    total = existing + len(generated)
    return {"status": "simulated", "real_rows": existing,
            "generated": len(generated), "total": total,
            "ready": total >= MIN_ROWS}


@app.post("/admin/reset-data")
def reset_data():
    """Wipe all training data and model artefacts to start fresh."""
    deleted = []
    for p in [
        BENCHMARK_DATA_PATH, MODEL_PATH, META_PATH,
        BENCHMARK_MODEL_PATH, BENCHMARK_LOGS_PATH,
        BASE_DIR / "model" / "retrain_history.json",
        BASE_DIR / "model" / "lightcache_model_backup.pkl",
        BASE_DIR / "logs"  / "cache_events_window.jsonl",
    ]:
        if p.exists():
            p.unlink()
            deleted.append(p.name)

    global MODEL_READY
    MODEL_READY = False

    return {
        "status":  "reset",
        "deleted": deleted,
        "message": "All data and model artefacts wiped. "
                   "System will retrain once enough real traffic is collected.",
    }


@app.get("/benchmark/results")
def benchmark_results():
    if not BENCHMARK_MODEL_PATH.exists():
        raise HTTPException(status_code=404,
            detail="No benchmark results yet. Run benchmark.py first.")
    with open(BENCHMARK_MODEL_PATH, "r") as f:
        return json.load(f)


@app.get("/admin/retrain-history")
def retrain_history():
    history_file = BASE_DIR / "model" / "retrain_history.json"
    if not history_file.exists():
        return {"history": [], "message": "No retraining history yet"}
    with open(history_file, "r") as f:
        history = json.load(f)
    return {"history": history, "total_retrains": len(history),
            "latest": history[-1] if history else None}


@app.get("/admin/model-metrics")
def model_metrics():
    if not META_PATH.exists():
        raise HTTPException(status_code=404, detail="Model not trained yet.")
    with open(META_PATH, "r") as f:
        meta = json.load(f)
    return {
        "trained_at":          meta.get("trained_at"),
        "training_rows":       meta.get("training_rows"),
        "ttl_bounds":          meta.get("ttl_bounds"),
        "metrics":             meta.get("metrics", {}),
        "feature_importances": meta.get("feature_importances", []),
        "feature_cols":        meta.get("feature_cols", []),
        "route_types":         meta.get("route_types", []),
    }


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000,
                reload=False, log_level="info")