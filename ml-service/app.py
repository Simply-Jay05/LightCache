import json
import math
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

# Load model bundle 
BASE_DIR   = Path(__file__).parent
MODEL_PATH = BASE_DIR / "model" / "lightcache_model.pkl"
META_PATH  = BASE_DIR / "model" / "model_meta.json"

print("Loading LightCache model bundle...")

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model not found: {MODEL_PATH}\nRun train.py first.")

with open(MODEL_PATH, "rb") as f:
    bundle = pickle.load(f)

TTL_MODEL      = bundle["ttl_model"]
EVICT_MODEL    = bundle["evict_model"]
PREFETCH_MODEL = bundle["prefetch_model"]
FEATURE_COLS   = bundle["feature_cols"]
ROUTE_TYPES    = bundle["route_types"]

with open(META_PATH, "r") as f:
    META = json.load(f)

TTL_MIN        = META["ttl_bounds"]["min"]
TTL_MAX        = META["ttl_bounds"]["max"]
ROUTE_MAP      = META["route_type_map"]
PAGE_MAP       = META["page_type_map"]
PRICE_TIER_MAP = META["price_tier_map"]

print(f"Model loaded — trained on {META['training_rows']:,} rows")
print(f"Trained at: {META['trained_at']}")


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
    route_enc = ROUTE_MAP.get(req.route_type, 0)
    page_enc  = PAGE_MAP.get(req.page_type, 0)
    tier_enc  = PRICE_TIER_MAP.get(req.price_tier or "unknown", 0)
    is_single = 1 if req.route_type in ("product_single", "best_seller") else 0

    hour_sin = math.sin(2 * math.pi * req.hour_of_day / 24)
    hour_cos = math.cos(2 * math.pi * req.hour_of_day / 24)
    day_sin  = math.sin(2 * math.pi * req.weekday / 7)
    day_cos  = math.cos(2 * math.pi * req.weekday / 7)

    past_access = req.key_access_count or 1
    log_past    = math.log1p(past_access)

    return np.array([[
        route_enc,
        page_enc,
        tier_enc,
        is_single,
        req.hour_of_day,
        req.weekday,
        req.is_peak_hour,
        hour_sin,
        hour_cos,
        day_sin,
        day_cos,
        past_access,
        log_past,
        req.key_hit_rate or 0.5,
        req.time_since_last_request or 0.0,
        req.request_interval_mean or 300.0,
        req.request_interval_std or 0.0,
    ]])


# Predict function (used both by endpoint and warmup) 
def run_predict(req: PredictRequest) -> PredictResponse:
    t0 = time.perf_counter()

    X = build_vector(req)

    # Output 1 — Dynamic TTL
    raw_ttl     = float(TTL_MODEL.predict(X)[0])
    ttl_seconds = int(np.clip(round(raw_ttl), TTL_MIN, TTL_MAX))

    # Output 2 — Eviction Score
    raw_evict      = float(EVICT_MODEL.predict(X)[0])
    eviction_score = round(float(np.clip(raw_evict, 0, 200)), 2)

    # Output 3 — Prefetch Routes (top-3 by classifier confidence)
    proba_list = PREFETCH_MODEL.predict_proba(X)
    scores = []
    for i, proba in enumerate(proba_list):
        route = ROUTE_TYPES[i]
        if route == req.route_type:
            continue
        prob = float(proba[0][1])
        scores.append((route, prob))
    scores.sort(key=lambda x: x[1], reverse=True)
    prefetch_routes = [r for r, _ in scores[:3]]

    inference_ms = round((time.perf_counter() - t0) * 1000, 3)

    return PredictResponse(
        ttl_seconds=ttl_seconds,
        eviction_score=eviction_score,
        prefetch_routes=prefetch_routes,
        inference_ms=inference_ms,
        model_version=META["trained_at"],
    )


# Paths for benchmark results — primary in model/, copy to shared logs/ volume
BENCHMARK_MODEL_PATH = BASE_DIR / "model" / "benchmark_results.json"
BENCHMARK_LOGS_PATH  = BASE_DIR / "logs" / "benchmark_results.json"
BENCHMARK_DATA_PATH  = BASE_DIR / "logs" / "cache_events.jsonl"


def run_benchmark_if_needed():
    """
    Run benchmark.py simulation and save results.
    - Always runs on startup so the dashboard always has results.
    - Copies output to /app/logs/ (shared Docker volume) so the backend
      can serve it via GET /api/cache/benchmark.
    """
    import subprocess
    import shutil

    # Ensure logs dir exists (needed in Docker before first log consumer flush)
    BENCHMARK_LOGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    BENCHMARK_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Decide which data file to use
    if BENCHMARK_DATA_PATH.exists():
        data_arg = str(BENCHMARK_DATA_PATH)
        print(f"Benchmark: using live log data ({BENCHMARK_DATA_PATH})")
    else:
        # No live data yet — skip benchmark (will run after first log flush)
        print("Benchmark: no log data yet, skipping (will auto-run after data is collected)")
        return

    try:
        print("Running LRU/LFU/LightCache benchmark simulation...")
        result = subprocess.run(
            ["python", str(BASE_DIR / "benchmark.py"),
             "--data", data_arg,
             "--output", str(BENCHMARK_MODEL_PATH)],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            print("Benchmark complete.")
            # Copy to shared volume so backend can read it
            shutil.copy2(BENCHMARK_MODEL_PATH, BENCHMARK_LOGS_PATH)
            print(f"Benchmark results copied to shared volume: {BENCHMARK_LOGS_PATH}")
        else:
            print(f"Benchmark exited with code {result.returncode}: {result.stderr[:200]}")
    except subprocess.TimeoutExpired:
        print("Benchmark timed out (>120s) — skipping")
    except Exception as e:
        print(f"Benchmark failed (non-critical): {e}")


# Lifespan — runs warmup + benchmark before accepting requests
@asynccontextmanager
async def lifespan(app):
    # 1. Model warmup
    print("Running warmup prediction...")
    try:
        dummy = PredictRequest(
            route_type="product_single",
            page_type="product_detail",
            cache_key="warmup",
            hour_of_day=12,
            weekday=1,
            is_weekend=0,
            is_peak_hour=1,
        )
        result = run_predict(dummy)
        print(f"Warmup complete — first inference took {result.inference_ms}ms, model is hot")
    except Exception as e:
        print(f"Warmup failed (non-critical): {e}")

    # 2. Auto-run benchmark (non-blocking — runs in background thread)
    import threading
    benchmark_thread = threading.Thread(target=run_benchmark_if_needed, daemon=True)
    benchmark_thread.start()

    yield  # app runs here until shutdown



# App
app = FastAPI(
    title="LightCache ML Service",
    description="Dynamic TTL, eviction score and prefetch route predictions",
    version="3.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routes
@app.get("/health")
def health():
    return {
        "status": "ok",
        "trained_at": META["trained_at"],
        "training_rows": META["training_rows"],
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        return run_predict(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model/info")
def model_info():
    return {
        "trained_at":    META["trained_at"],
        "training_rows": META["training_rows"],
        "features":      FEATURE_COLS,
        "route_types":   ROUTE_TYPES,
        "ttl_bounds":    META["ttl_bounds"],
        "outputs": {
            "ttl_seconds":     "regression — seconds to cache this item",
            "eviction_score":  "regression — 0-200, higher = keep in cache",
            "prefetch_routes": "top-3 route types to warm next",
        },
    }



@app.post("/admin/reload")
def reload_model():
    """
    Hot-reload the model from disk without restarting the service.
    Called automatically by retrain_scheduler.py after retraining.
    Zero downtime — old model serves requests until new one is loaded.
    """
    global TTL_MODEL, EVICT_MODEL, PREFETCH_MODEL, FEATURE_COLS, ROUTE_TYPES, META

    if not MODEL_PATH.exists():
        raise HTTPException(status_code=404, detail="Model file not found")

    try:
        with open(MODEL_PATH, "rb") as f:
            new_bundle = pickle.load(f)

        # Atomic swap — update globals
        TTL_MODEL      = new_bundle["ttl_model"]
        EVICT_MODEL    = new_bundle["evict_model"]
        PREFETCH_MODEL = new_bundle["prefetch_model"]
        FEATURE_COLS   = new_bundle["feature_cols"]
        ROUTE_TYPES    = new_bundle["route_types"]

        with open(META_PATH, "r") as f:
            META = json.load(f)

        print(f"✅ Model hot-reloaded — trained on {META['training_rows']:,} rows")

        return {
            "status":        "reloaded",
            "trained_at":    META["trained_at"],
            "training_rows": META["training_rows"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reload failed: {str(e)}")



@app.get("/benchmark/results")
def benchmark_results():
    """Returns saved benchmark results from benchmark.py."""
    results_file = BASE_DIR / "model" / "benchmark_results.json"
    if not results_file.exists():
        raise HTTPException(
            status_code=404,
            detail="No benchmark results found. Run benchmark.py first."
        )
    with open(results_file, "r") as f:
        return json.load(f)

@app.get("/admin/retrain-history")
def retrain_history():
    """Returns the full retraining history for the dashboard."""
    history_file = BASE_DIR / "model" / "retrain_history.json"
    if not history_file.exists():
        return {"history": [], "message": "No retraining history yet"}
    with open(history_file, "r") as f:
        history = json.load(f)
    return {
        "history":        history,
        "total_retrains": len(history),
        "latest":         history[-1] if history else None,
    }

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )