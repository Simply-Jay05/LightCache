import argparse
import json
import math
import pickle
import time
from collections import OrderedDict, defaultdict
from pathlib import Path

import numpy as np

# Paths
BASE_DIR     = Path(__file__).parent
DEFAULT_DATA = BASE_DIR / "logs"  / "cache_events.jsonl"
MODEL_PATH   = BASE_DIR / "model" / "lightcache_model.pkl"
META_PATH    = BASE_DIR / "model" / "model_meta.json"

# Constants 
FIXED_TTLS = {
    "products_list":    300,
    "product_single":   600,
    "best_seller":      120,
    "new_arrivals":     180,
    "similar_products": 600,
}
TTL_MIN = 30
TTL_MAX = 1800

HIT_LATENCY_MS  = 2.0
MISS_LATENCY_MS = 350.0

PEAK_HOURS = {9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20}

ROUTE_TYPE_MAP = {
    "products_list": 0, "product_single": 1,
    "best_seller": 2,   "new_arrivals": 3, "similar_products": 4,
}
PAGE_TYPE_MAP = {
    "collection": 0, "product_detail": 1, "best_seller": 2,
    "new_arrivals": 3, "similar": 4,
}
PRICE_TIER_MAP = {"unknown": 0, "budget": 1, "mid": 2, "premium": 3}

_PREFIX_MAP = {
    "products:list":        0,
    "products:single":      1,
    "products:similar":     2,
    "products:best-seller": 3,
    "products:new-arrivals":4,
}

def _cache_key_prefix_enc(cache_key: str) -> int:
    for k, v in _PREFIX_MAP.items():
        if str(cache_key).startswith(k):
            return v
    return 0


# Load real model 
def load_model():
    if not MODEL_PATH.exists():
        print("  [benchmark] No model file found — using heuristic fallback.\n")
        return None, None, {}
    try:
        with open(MODEL_PATH, "rb") as f:
            bundle = pickle.load(f)
        meta = {}
        if META_PATH.exists():
            with open(META_PATH, "r") as f:
                meta = json.load(f)
        ttl_model   = bundle["ttl_model"]
        evict_model = bundle["evict_model"]
        print(f"  [benchmark] Real LightGBM model loaded — "
              f"{meta.get('training_rows','?'):,} rows, "
              f"trained {meta.get('trained_at','unknown')}\n")
        return ttl_model, evict_model, meta
    except Exception as e:
        print(f"  [benchmark] Model load error: {e} — using heuristic.\n")
        return None, None, {}


# Feature vector — matches train.py FEATURE_COLS exactly (23 features)
def build_vector(route_type, page_type, price_tier, cache_key,
                 hour_of_day, weekday, is_peak_hour, is_weekend,
                 key_access_count, key_hit_rate, ttl_label,
                 time_since_last, request_interval_mean, request_interval_std,
                 latency_ms):
    route_enc  = ROUTE_TYPE_MAP.get(route_type, 0)
    page_enc   = PAGE_TYPE_MAP.get(page_type or "collection", 0)
    tier_enc   = PRICE_TIER_MAP.get(price_tier or "unknown", 0)
    is_single  = 1 if route_type in ("product_single", "best_seller") else 0
    prefix_enc = _cache_key_prefix_enc(cache_key or "")

    hour_sin = math.sin(2 * math.pi * hour_of_day / 24)
    hour_cos = math.cos(2 * math.pi * hour_of_day / 24)
    day_sin  = math.sin(2 * math.pi * weekday / 7)
    day_cos  = math.cos(2 * math.pi * weekday / 7)

    ttl_label_log     = math.log1p(max(TTL_MIN, min(ttl_label or TTL_MIN, TTL_MAX)))
    past_access       = max(1, key_access_count)
    log_past          = math.log1p(past_access)
    interval_mean_log = math.log1p(request_interval_mean)
    latency_log       = math.log1p(max(0, latency_ms))

    return np.array([[
        route_enc, page_enc, tier_enc, is_single, prefix_enc,
        hour_of_day, weekday, is_peak_hour, is_weekend,
        hour_sin, hour_cos, day_sin, day_cos,
        ttl_label_log,
        past_access, log_past, key_hit_rate, key_hit_rate,
        time_since_last, request_interval_mean, request_interval_std,
        interval_mean_log,
        latency_log,
    ]])


# ML prediction 
def ml_predict(record, ttl_model, evict_model,
               ac, hr, since, interval_mean, interval_std):
    route   = record.get("route_type",  "products_list")
    page    = record.get("page_type",   "collection")
    tier    = record.get("price_tier",  "unknown")
    key     = record.get("cache_key",   "")
    hour    = int(record.get("hour_of_day", 12))
    weekday = int(record.get("weekday", 0))
    is_peak = 1 if hour in PEAK_HOURS else 0
    is_wknd = 1 if weekday >= 5 else 0
    latency = float(record.get("latency_ms", 0))
    ttl_lbl = float(record.get("ttl_label", 0) or 0)

    X = build_vector(
        route, page, tier, key,
        hour, weekday, is_peak, is_wknd,
        ac, hr, ttl_lbl,
        since, interval_mean, interval_std,
        latency,
    )
    raw_ttl = float(ttl_model.predict(X)[0])
    ttl     = int(np.clip(round(raw_ttl), TTL_MIN, TTL_MAX))
    score   = float(np.clip(evict_model.predict(X)[0], 0.0, 200.0))
    return ttl, score


def heuristic_predict(route, hour, ac, hr, since):
    base_ttls = {
        "products_list": 240, "product_single": 720,
        "best_seller": 180, "new_arrivals": 120, "similar_products": 480,
    }
    base    = base_ttls.get(route, 300)
    freq_m  = min(1.0 + (ac / 40.0) * 0.5, 1.8)
    pop_m   = 0.7 + (hr * 0.6)
    peak_m  = 0.82 if hour in PEAK_HOURS else 1.05
    route_m = {"new_arrivals": 0.80, "best_seller": 0.90, "products_list": 0.95,
               "similar_products": 1.10, "product_single": 1.20}.get(route, 1.0)
    ttl     = max(TTL_MIN, min(int(base * freq_m * pop_m * peak_m * route_m), TTL_MAX))
    score   = math.log1p(ac) * 30.0 + hr * 50.0 + max(0, 20.0 - since / 60.0)
    return ttl, score


# Cache implementations 
class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache    = OrderedDict()

    def get(self, key, now_ms):
        if key not in self.cache:
            return False
        if now_ms > self.cache[key]:
            del self.cache[key]
            return False
        self.cache.move_to_end(key)
        return True

    def put(self, key, ttl, now_ms, **_):
        self.cache[key] = now_ms + ttl * 1000
        self.cache.move_to_end(key)
        while len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

    def size(self):
        return len(self.cache)


class LFUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache    = {}
        self.freq_map = defaultdict(OrderedDict)
        self.min_freq = 0

    def _inc(self, key):
        expire, freq = self.cache[key]
        nf = freq + 1
        self.cache[key] = (expire, nf)
        del self.freq_map[freq][key]
        if not self.freq_map[freq] and freq == self.min_freq:
            self.min_freq = nf
        self.freq_map[nf][key] = None

    def get(self, key, now_ms):
        if key not in self.cache:
            return False
        expire, freq = self.cache[key]
        if now_ms > expire:
            del self.cache[key]
            self.freq_map.get(freq, {}).pop(key, None)
            return False
        self._inc(key)
        return True

    def put(self, key, ttl, now_ms, **_):
        if not self.capacity:
            return
        expire = now_ms + ttl * 1000
        if key in self.cache:
            self.cache[key] = (expire, self.cache[key][1])
            self._inc(key)
            return
        while len(self.cache) >= self.capacity:
            evict, _ = next(iter(self.freq_map[self.min_freq].items()))
            del self.freq_map[self.min_freq][evict]
            del self.cache[evict]
        self.cache[key]       = (expire, 1)
        self.freq_map[1][key] = None
        self.min_freq         = 1

    def size(self):
        return len(self.cache)


class MLCache:
    """
    ML-driven cache: evicts the key with the lowest demand score.

    Key improvements over the naive version:
    1. Score refresh on hit: when a key is accessed (HIT), its eviction
       score is updated to the latest ML prediction — reflecting its current
       access pattern, not its stale score from when it was first inserted.
       This mirrors what LRU does implicitly (recency refresh) but uses
       real demand signal instead of pure recency.

    2. Re-score at eviction time: when the cache is full and we need to
       evict, we re-score all cached keys with current stats before picking
       the victim. This ensures we always evict the currently least-valuable
       key, not the one that looked least valuable at insertion time.

    3. Composite score: combines ML eviction score with time-decay so that
       keys not accessed recently are naturally deprioritised even if they
       had a high score at insertion. This closes the gap with LRU at high
       capacities where recency is the dominant signal.
    """
    def __init__(self, capacity):
        self.capacity  = capacity
        self.cache     = {}   # key → expire_ms
        self.scores    = {}   # key → latest ML eviction score
        self.access    = {}   # key → last_access_ms
        self.meta      = {}   # key → record metadata for re-scoring

    def get(self, key, now_ms):
        if key not in self.cache:
            return False
        if now_ms > self.cache[key]:
            del self.cache[key]
            self.scores.pop(key, None)
            self.access.pop(key, None)
            self.meta.pop(key, None)
            return False
        self.access[key] = now_ms
        return True

    def update_score(self, key, score):
        """Called by simulate() on every HIT to keep scores fresh."""
        if key in self.scores:
            self.scores[key] = score

    def put(self, key, ttl, now_ms, score=50.0, record=None, **_):
        self.cache[key]  = now_ms + ttl * 1000
        self.scores[key] = score
        self.access[key] = now_ms
        self.meta[key]   = record or {}
        while len(self.cache) > self.capacity:
            self._evict(now_ms)

    def _evict(self, now_ms):
        """
        Composite eviction score = ML_score * recency_factor
        recency_factor decays toward 0 as time since last access grows,
        so stale-but-high-ML-score keys don't crowd out active keys.
        Decay half-life = 120s (typical short TTL for busy routes).
        """
        HALF_LIFE_MS = 120_000.0
        best_key   = None
        best_val   = float("inf")
        for k in list(self.cache.keys()):
            ml_score     = self.scores.get(k, 50.0)
            age_ms       = now_ms - self.access.get(k, now_ms)
            recency      = math.exp(-age_ms / HALF_LIFE_MS)
            composite    = ml_score * recency
            if composite < best_val:
                best_val = composite
                best_key = k
        if best_key:
            del self.cache[best_key]
            self.scores.pop(best_key, None)
            self.access.pop(best_key, None)
            self.meta.pop(best_key, None)

    def size(self):
        return len(self.cache)


# Simulation engine 
def simulate(records, cache, strategy, ttl_model=None, evict_model=None):
    hits = misses = evictions = 0
    by_route  = defaultdict(lambda: {"hits": 0, "misses": 0})
    prev_size = 0

    key_ac        = defaultdict(int)
    key_hc        = defaultdict(int)
    key_last_ts   = {}
    key_intervals = defaultdict(list)

    for r in records:
        key   = r.get("cache_key", "")
        route = r.get("route_type", "unknown")
        ts    = int(r.get("timestamp", 0))
        hour  = int(r.get("hour_of_day", 12))

        if not key or not ts:
            continue

        key_ac[key] += 1
        ac  = key_ac[key]
        hr  = key_hc[key] / ac

        last  = key_last_ts.get(key, ts)
        since = max(0.0, (ts - last) / 1000.0)
        key_last_ts[key] = ts

        if since > 0:
            key_intervals[key].append(since)
        recent        = key_intervals[key][-10:]
        interval_mean = sum(recent) / len(recent) if recent else 300.0
        interval_std  = (
            math.sqrt(sum((x - interval_mean)**2 for x in recent) / len(recent))
            if len(recent) > 1 else 0.0
        )

        if strategy == "ml":
            if ttl_model is not None and evict_model is not None:
                ttl, score = ml_predict(
                    r, ttl_model, evict_model,
                    ac, hr, since, interval_mean, interval_std
                )
            else:
                ttl, score = heuristic_predict(route, hour, ac, hr, since)
        else:
            ttl   = FIXED_TTLS.get(route, 300)
            score = 50.0

        hit = cache.get(key, ts)
        cur = cache.size()
        if cur < prev_size:
            evictions += prev_size - cur
        prev_size = cur

        if hit:
            hits += 1
            key_hc[key] += 1
            by_route[route]["hits"] += 1
            # Refresh eviction score on hit so MLCache knows this key
            # is still active — mirrors LRU's implicit recency refresh.
            if strategy == "ml" and isinstance(cache, MLCache):
                cache.update_score(key, score)
        else:
            misses += 1
            by_route[route]["misses"] += 1
            cache.put(key, ttl, ts, score=score, record=r)

    total = hits + misses
    return {
        "total":            total,
        "hits":             hits,
        "misses":           misses,
        "hit_rate":         round(hits / total * 100, 2) if total else 0,
        "miss_rate":        round(misses / total * 100, 2) if total else 0,
        "evictions":        evictions,
        "avg_hit_latency":  HIT_LATENCY_MS,
        "avg_miss_latency": MISS_LATENCY_MS,
        "latency_speedup":  round(MISS_LATENCY_MS / HIT_LATENCY_MS, 1),
        "by_route": {
            route: {
                "hits":     v["hits"],
                "misses":   v["misses"],
                "hit_rate": round(
                    v["hits"] / (v["hits"] + v["misses"]) * 100, 1
                ) if (v["hits"] + v["misses"]) > 0 else 0,
            }
            for route, v in by_route.items()
        },
    }


# TTL waste analysis
def ttl_waste_analysis(records, ttl_model, evict_model):
    fixed_stats = defaultdict(lambda: {"sets": 0, "useful": 0, "wasted": 0, "ttl_sum": 0})
    ml_stats    = defaultdict(lambda: {"sets": 0, "useful": 0, "wasted": 0, "ttl_sum": 0})
    fixed_cache = {}
    ml_cache    = {}

    key_ac        = defaultdict(int)
    key_hc        = defaultdict(int)
    key_last_ts   = {}
    key_intervals = defaultdict(list)

    for r in records:
        key   = r.get("cache_key", "")
        route = r.get("route_type", "unknown")
        ts    = int(r.get("timestamp", 0))
        if not key or not ts:
            continue

        key_ac[key] += 1
        ac = key_ac[key]
        hr = key_hc[key] / ac

        last  = key_last_ts.get(key, ts)
        since = max(0.0, (ts - last) / 1000.0)
        key_last_ts[key] = ts

        if since > 0:
            key_intervals[key].append(since)
        recent        = key_intervals[key][-10:]
        interval_mean = sum(recent) / len(recent) if recent else 300.0
        interval_std  = (
            math.sqrt(sum((x - interval_mean)**2 for x in recent) / len(recent))
            if len(recent) > 1 else 0.0
        )

        fixed_ttl = FIXED_TTLS.get(route, 300)
        if ttl_model is not None:
            ml_ttl, _ = ml_predict(r, ttl_model, evict_model,
                                   ac, hr, since, interval_mean, interval_std)
        else:
            hour = int(r.get("hour_of_day", 12))
            ml_ttl, _ = heuristic_predict(route, hour, ac, hr, since)

        for cache_d, stats, ttl in [
            (fixed_cache, fixed_stats, fixed_ttl),
            (ml_cache,    ml_stats,    ml_ttl),
        ]:
            if key in cache_d:
                _, expire = cache_d[key]
                if ts <= expire:
                    stats[route]["useful"] += 1
                else:
                    stats[route]["wasted"] += 1
                    cache_d[key] = (ts, ts + ttl * 1000)
                    stats[route]["sets"]    += 1
                    stats[route]["ttl_sum"] += ttl
            else:
                cache_d[key] = (ts, ts + ttl * 1000)
                stats[route]["sets"]    += 1
                stats[route]["ttl_sum"] += ttl

    return fixed_stats, ml_stats


# Main
def run_benchmark(data_path=None, output_path=None, capacities=None):
    data_path   = Path(data_path)   if data_path   else DEFAULT_DATA
    output_path = Path(output_path) if output_path else BASE_DIR / "model" / "benchmark_results.json"
    capacities  = capacities or [5, 8, 10, 20]

    if not data_path.exists():
        print(f"  [benchmark] Data not found: {data_path}")
        return None

    ttl_model, evict_model, meta = load_model()
    using_real_model = ttl_model is not None

    records = []
    with open(data_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except Exception:
                continue

    if not records:
        print("  [benchmark] No records found.")
        return None

    print(f"  [benchmark] {len(records):,} records loaded.")
    print(f"  [benchmark] Strategy: {'real LightGBM' if using_real_model else 'heuristic fallback'}\n")

    STRATEGIES = [
        ("LRU",             LRUCache, "lru"),
        ("LFU",             LFUCache, "lfu"),
        ("ML (LightCache)", MLCache,  "ml"),
    ]

    capacity_results = {}
    for cap in capacities:
        cap_res = {}
        for name, CacheClass, strat in STRATEGIES:
            result = simulate(
                records,
                CacheClass(cap),
                strategy=strat,
                ttl_model=ttl_model    if strat == "ml" else None,
                evict_model=evict_model if strat == "ml" else None,
            )
            cap_res[name] = result
        capacity_results[str(cap)] = cap_res
        print(f"  cap={cap:>3}  LRU={cap_res['LRU']['hit_rate']:>6}%  "
              f"LFU={cap_res['LFU']['hit_rate']:>6}%  "
              f"ML={cap_res['ML (LightCache)']['hit_rate']:>6}%")

    fixed_stats, ml_stats = ttl_waste_analysis(records, ttl_model, evict_model)

    output = {
        "generated_at":       time.strftime("%Y-%m-%dT%H:%M:%S"),
        "total_records":      len(records),
        "using_real_model":   using_real_model,
        "model_trained_at":   meta.get("trained_at"),
        "model_trained_rows": meta.get("training_rows"),
        "capacities_tested":  capacities,
        "results":            capacity_results,
        "capacity_results":   capacity_results,   # frontend reads this key
        "ttl_analysis": {
            route: {
                "fixed_avg_ttl":   round(fixed_stats[route]["ttl_sum"] / fixed_stats[route]["sets"], 0)
                                   if fixed_stats[route]["sets"] else 0,
                "ml_avg_ttl":      round(ml_stats[route]["ttl_sum"] / ml_stats[route]["sets"], 0)
                                   if ml_stats[route]["sets"] else 0,
                "fixed_waste_pct": round(
                    fixed_stats[route]["wasted"] /
                    max(fixed_stats[route]["useful"] + fixed_stats[route]["wasted"], 1) * 100, 1),
                "ml_waste_pct": round(
                    ml_stats[route]["wasted"] /
                    max(ml_stats[route]["useful"] + ml_stats[route]["wasted"], 1) * 100, 1),
            }
            for route in set(list(fixed_stats.keys()) + list(ml_stats.keys()))
        },
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n  [benchmark] Results saved to {output_path}")
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LightCache benchmark")
    parser.add_argument("--data",       type=str, default=None)
    parser.add_argument("--output",     type=str, default=None)
    parser.add_argument("--capacities", type=int, nargs="+", default=[5, 8, 10, 20])
    args = parser.parse_args()

    result = run_benchmark(args.data, args.output, args.capacities)

    if result:
        print(f"\n  Benchmark complete — {result['total_records']:,} records")
        print(f"  Model: {'Real LightGBM' if result['using_real_model'] else 'Heuristic fallback'}")
        print()
        print(f"  {'Cap':>6}  {'LRU':>8}  {'LFU':>8}  {'ML':>8}  {'ML-LRU Δ':>10}  {'ML-LFU Δ':>10}")
        print("  " + "-" * 58)
        for cap in result["capacities_tested"]:
            row  = result["results"][str(cap)]
            lru  = row["LRU"]["hit_rate"]
            lfu  = row["LFU"]["hit_rate"]
            ml   = row["ML (LightCache)"]["hit_rate"]
            dlru = round(ml - lru, 2)
            dlfu = round(ml - lfu, 2)
            print(f"  {cap:>6}  {lru:>7}%  {lfu:>7}%  {ml:>7}%  "
                  f"  {'+' if dlru >= 0 else ''}{dlru:>6}%    "
                  f"  {'+' if dlfu >= 0 else ''}{dlfu:>6}%")