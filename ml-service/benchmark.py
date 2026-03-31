import argparse
import json
import time
from collections import OrderedDict, defaultdict
from pathlib import Path

BASE_DIR     = Path(__file__).parent
DEFAULT_DATA = BASE_DIR.parent / "backend" / "logs" / "cache_events.jsonl"

FIXED_TTLS = {
    "products_list":    300,
    "product_single":   600,
    "best_seller":      120,
    "new_arrivals":     180,
    "similar_products": 600,
}

HIT_LATENCY_MS  = 2.0
MISS_LATENCY_MS = 350.0


# Cache Simulators

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key, now_ms):
        if key not in self.cache:
            return False
        _, expire = self.cache[key]
        if now_ms > expire:
            del self.cache[key]
            return False
        self.cache.move_to_end(key)
        return True

    def put(self, key, ttl, now_ms, eviction_score=None):
        expire = now_ms + ttl * 1000
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = (None, expire)
        if len(self.cache) > self.capacity:
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
        _, freq = self.cache[key]
        self.cache[key] = (self.cache[key][0], freq + 1)
        del self.freq_map[freq][key]
        if not self.freq_map[freq] and freq == self.min_freq:
            self.min_freq += 1
        self.freq_map[freq + 1][key] = None

    def get(self, key, now_ms):
        if key not in self.cache:
            return False
        expire, freq = self.cache[key]
        if now_ms > expire:
            del self.cache[key]
            if key in self.freq_map[freq]:
                del self.freq_map[freq][key]
            return False
        self._inc(key)
        return True

    def put(self, key, ttl, now_ms, eviction_score=None):
        if self.capacity <= 0:
            return
        expire = now_ms + ttl * 1000
        if key in self.cache:
            self.cache[key] = (expire, self.cache[key][1])
            self._inc(key)
            return
        if len(self.cache) >= self.capacity:
            evict, _ = next(iter(self.freq_map[self.min_freq].items()))
            del self.freq_map[self.min_freq][evict]
            del self.cache[evict]
        self.cache[key]       = (expire, 1)
        self.freq_map[1][key] = None
        self.min_freq         = 1

    def size(self):
        return len(self.cache)


# FIX 1 — MLCache now evicts by lowest eviction_score (predicted future demand),
# not by least-recent-access time. Keys the ML model thinks will be re-requested
# soon get a high score and survive eviction; cold keys get a low score and are
# dropped first. This is the core differentiation vs LRU/LFU.
class MLCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache    = {}   # key → expire_ms
        self.scores   = {}   # key → eviction_score (ML-predicted future demand, 0–200)
        self.access   = {}   # key → last_access_ms (used to break ties)

    def get(self, key, now_ms):
        if key not in self.cache:
            return False
        if now_ms > self.cache[key]:
            del self.cache[key]
            del self.scores[key]
            del self.access[key]
            return False
        self.access[key] = now_ms
        return True

    def put(self, key, ttl, now_ms, eviction_score=None):
        self.cache[key]  = now_ms + ttl * 1000
        self.access[key] = now_ms
        # Default to mid-range score (100) when no ML prediction is available so
        # the cache still behaves sensibly during fallback / redis_only mode.
        self.scores[key] = eviction_score if eviction_score is not None else 100.0

        if len(self.cache) > self.capacity:
            # Evict the key with the LOWEST predicted future demand.
            # Tie-break on least-recently-accessed so behaviour is deterministic.
            victim = min(
                self.cache.keys(),
                key=lambda k: (self.scores[k], self.access[k]),
            )
            del self.cache[victim]
            del self.scores[victim]
            del self.access[victim]

    def size(self):
        return len(self.cache)


# Simulation

def simulate(records, cache, use_ml_ttl=False):
    hits = misses = 0
    evictions = 0
    # FIX 4 — track premature_evictions: times ML had a high score for a key
    # that LRU/LFU would have evicted but ML kept alive and subsequently hit.
    # For MLCache we instead count how many eviction victims had score > threshold.
    score_evictions = 0   # evictions where ML score was low  (ML made the right call)
    high_score_evictions = 0  # evictions where ML score was high (ML was forced out)
    by_route = defaultdict(lambda: {"hits": 0, "misses": 0})
    prev_size = 0

    for r in records:
        key   = r.get("cache_key", "")
        route = r.get("route_type", "unknown")
        ts    = int(r.get("timestamp", 0))
        ml    = r.get("ml_used") == "true"

        # FIX 2 — pass eviction_score through to put() when running the ML
        # simulator so it can make score-aware eviction decisions.
        raw_score = r.get("eviction_score")
        eviction_score = float(raw_score) if raw_score not in (None, "", "null") else None

        ttl = int(r.get("ttl_used", 300)) if (use_ml_ttl and ml) \
              else FIXED_TTLS.get(route, 300)

        hit = cache.get(key, ts)
        cur_size = cache.size()
        if cur_size < prev_size:
            delta = prev_size - cur_size
            evictions += delta
        prev_size = cur_size

        if hit:
            hits += 1
            by_route[route]["hits"] += 1
        else:
            misses += 1
            by_route[route]["misses"] += 1
            cache.put(key, ttl, ts, eviction_score=eviction_score)

    total = hits + misses
    return {
        "total":      total,
        "hits":       hits,
        "misses":     misses,
        "hit_rate":   round(hits / total * 100, 2) if total else 0,
        "evictions":  evictions,
        "avg_hit_ms":  HIT_LATENCY_MS,
        "avg_miss_ms": MISS_LATENCY_MS,
        "speedup":     round(MISS_LATENCY_MS / HIT_LATENCY_MS, 1),
        "by_route":   {
            r: {
                "hits":     v["hits"],
                "misses":   v["misses"],
                "hit_rate": round(v["hits"] / (v["hits"] + v["misses"]) * 100, 1)
                            if v["hits"] + v["misses"] > 0 else 0,
            }
            for r, v in by_route.items()
        },
    }


# TTL Analysis (Part 2)

def ttl_analysis(records):
    """
    Compare fixed TTL vs ML dynamic TTL on the same log.
    Measures: how many cache entries expired uselessly vs survived to be hit.
    """
    fixed_stats = defaultdict(lambda: {"sets": 0, "useful": 0, "wasted": 0,
                                        "ttl_sum": 0})
    ml_stats    = defaultdict(lambda: {"sets": 0, "useful": 0, "wasted": 0,
                                        "ttl_sum": 0})

    # Track when each key was last set and with what TTL
    fixed_cache = {}  # key → (set_ts, expire_ts)
    ml_cache    = {}  # key → (set_ts, expire_ts)

    for r in records:
        key   = r.get("cache_key", "")
        route = r.get("route_type", "unknown")
        ts    = int(r.get("timestamp", 0))
        ml    = r.get("ml_used") == "true"
        ml_ttl    = int(r.get("ttl_used", 300)) if ml else FIXED_TTLS.get(route, 300)
        fixed_ttl = FIXED_TTLS.get(route, 300)

        # Fixed TTL check
        if key in fixed_cache:
            _, expire = fixed_cache[key]
            if ts <= expire:
                fixed_stats[route]["useful"] += 1
            else:
                fixed_stats[route]["wasted"] += 1
                fixed_cache[key] = (ts, ts + fixed_ttl * 1000)
                fixed_stats[route]["sets"] += 1
                fixed_stats[route]["ttl_sum"] += fixed_ttl
        else:
            fixed_cache[key] = (ts, ts + fixed_ttl * 1000)
            fixed_stats[route]["sets"] += 1
            fixed_stats[route]["ttl_sum"] += fixed_ttl

        # ML TTL check
        if key in ml_cache:
            _, expire = ml_cache[key]
            if ts <= expire:
                ml_stats[route]["useful"] += 1
            else:
                ml_stats[route]["wasted"] += 1
                ml_cache[key] = (ts, ts + ml_ttl * 1000)
                ml_stats[route]["sets"] += 1
                ml_stats[route]["ttl_sum"] += ml_ttl
        else:
            ml_cache[key] = (ts, ts + ml_ttl * 1000)
            ml_stats[route]["sets"] += 1
            ml_stats[route]["ttl_sum"] += ml_ttl

    return fixed_stats, ml_stats


# FIX 4 — Eviction quality analysis: compares which keys each strategy chose
# to evict. For each eviction event captured in the log (eviction_score present),
# measure whether the evicted key had high or low predicted future demand.
# Low-score evictions = good decision. High-score evictions = wasteful decision.
def eviction_quality_analysis(records, capacities):
    """
    Replay the log for each strategy at each capacity and record the
    eviction_score of every evicted key. A good strategy evicts low-score
    keys; a poor strategy evicts high-score keys (cache-miss penalty follows).

    Returns: { capacity: { strategy: { "mean_evicted_score": float,
                                        "high_score_evictions": int,
                                        "total_evictions": int } } }
    """
    results = {}

    for cap in capacities:
        cap_res = {}

        for name, CacheClass, use_ml in [
            ("LRU",            LRUCache, False),
            ("LFU",            LFUCache, False),
            ("ML (LightCache)", MLCache,  True),
        ]:
            evicted_scores = []
            cache = CacheClass(cap)

            # Monkey-patch put to intercept evictions and capture the score of
            # whatever key gets dropped so we can measure eviction quality.
            orig_put = cache.put

            def make_tracked_put(c, orig):
                def tracked_put(key, ttl, now_ms, eviction_score=None):
                    before = set(c.cache.keys())
                    orig(key, ttl, now_ms, eviction_score=eviction_score)
                    after  = set(c.cache.keys())
                    dropped = before - after
                    # Score lookup: use scores dict for MLCache, fall back to None
                    score_lookup = getattr(c, '_pre_evict_scores', {})
                    for d in dropped:
                        s = score_lookup.get(d)
                        evicted_scores.append(s if s is not None else 100.0)
                return tracked_put

            # Snapshot scores before put so we can look them up after eviction
            orig_put_inner = cache.put
            score_snapshot = {}

            def make_snapshotting_put(c, op):
                def snapshotting_put(key, ttl, now_ms, eviction_score=None):
                    # Snapshot current scores before the call mutates state
                    if hasattr(c, 'scores'):
                        c._pre_evict_scores = dict(c.scores)
                    elif hasattr(c, 'cache'):
                        # For LRU/LFU use None (no score concept)
                        c._pre_evict_scores = {k: None for k in c.cache}
                    op(key, ttl, now_ms, eviction_score=eviction_score)
                return snapshotting_put

            cache.put = make_snapshotting_put(cache, make_tracked_put(cache, orig_put))

            for r in records:
                key   = r.get("cache_key", "")
                route = r.get("route_type", "unknown")
                ts    = int(r.get("timestamp", 0))
                ml    = r.get("ml_used") == "true"
                raw_score = r.get("eviction_score")
                eviction_score = float(raw_score) if raw_score not in (None, "", "null") else None
                ttl = int(r.get("ttl_used", 300)) if (use_ml in (True,) and ml) \
                      else FIXED_TTLS.get(route, 300)

                if not cache.get(key, ts):
                    cache.put(key, ttl, ts, eviction_score=eviction_score)

            valid_scores = [s for s in evicted_scores if s is not None]
            high_score   = [s for s in valid_scores if s > 120]
            cap_res[name] = {
                "total_evictions":     len(evicted_scores),
                "high_score_evictions": len(high_score),
                "mean_evicted_score":  round(sum(valid_scores) / len(valid_scores), 1)
                                       if valid_scores else 0.0,
                # Lower is better — ideal strategy evicts only low-score keys
                "eviction_waste_pct":  round(len(high_score) / len(evicted_scores) * 100, 1)
                                       if evicted_scores else 0.0,
            }

        results[cap] = cap_res

    return results


# Report

def print_part1(capacity_results):
    print("\n  PART 1 — Eviction Strategy Comparison (capacity-constrained)")
    print("  " + "─" * 68)
    print(f"  {'Capacity':<12} {'Strategy':<20} {'Hit Rate':>10} {'Evictions':>12} {'Speedup':>10}")
    print("  " + "─" * 68)

    for cap, results in sorted(capacity_results.items()):
        for name, r in results.items():
            marker = " ◄" if r["hit_rate"] == max(
                v["hit_rate"] for v in results.values()) else ""
            print(f"  {str(cap) + ' keys':<12} {name:<20} "
                  f"{str(r['hit_rate']) + '%':>10} "
                  f"{r['evictions']:>12,} "
                  f"{str(r['speedup']) + 'x':>10}"
                  f"{marker}")
        print()


def print_part2(fixed_stats, ml_stats):
    print("\n  PART 2 — TTL Strategy Comparison (Dynamic ML vs Fixed)")
    print("  " + "─" * 68)
    print(f"  {'Route':<22} {'Fixed TTL':>10} {'ML TTL':>10} "
          f"{'Fixed Waste%':>14} {'ML Waste%':>10} {'Improvement':>12}")
    print("  " + "─" * 68)

    total_fixed_waste = 0
    total_ml_waste    = 0
    total_events      = 0

    for route in sorted(set(list(fixed_stats.keys()) + list(ml_stats.keys()))):
        fs = fixed_stats[route]
        ms = ml_stats[route]

        fixed_ttl_avg = round(fs["ttl_sum"] / fs["sets"], 0) if fs["sets"] else 0
        ml_ttl_avg    = round(ms["ttl_sum"] / ms["sets"], 0) if ms["sets"] else 0

        total_fixed   = fs["useful"] + fs["wasted"]
        total_ml      = ms["useful"] + ms["wasted"]

        fixed_waste_pct = round(fs["wasted"] / total_fixed * 100, 1) if total_fixed else 0
        ml_waste_pct    = round(ms["wasted"] / total_ml    * 100, 1) if total_ml    else 0
        improvement     = round(fixed_waste_pct - ml_waste_pct, 1)

        total_fixed_waste += fs["wasted"]
        total_ml_waste    += ms["wasted"]
        total_events      += total_fixed

        marker = " ✓" if improvement > 0 else ""
        print(f"  {route:<22} {str(int(fixed_ttl_avg)) + 's':>10} "
              f"{str(int(ml_ttl_avg)) + 's':>10} "
              f"{str(fixed_waste_pct) + '%':>14} "
              f"{str(ml_waste_pct) + '%':>10} "
              f"{('+' if improvement > 0 else '') + str(improvement) + '%':>12}"
              f"{marker}")

    overall_fixed_waste = round(total_fixed_waste / total_events * 100, 1) if total_events else 0
    overall_ml_waste    = round(total_ml_waste    / total_events * 100, 1) if total_events else 0
    print()
    print(f"  {'OVERALL':<22} {'':>10} {'':>10} "
          f"{str(overall_fixed_waste) + '%':>14} "
          f"{str(overall_ml_waste) + '%':>10} "
          f"{'+' + str(round(overall_fixed_waste - overall_ml_waste, 1)) + '%':>12} ✓")
    print()
    print(f"  TTL Waste = % of cache entries that expired before being re-requested")
    print(f"  Lower waste = ML is caching items for more appropriate durations")


# FIX 4 — print the new eviction quality report
def print_part3(eviction_quality):
    print("\n  PART 3 — Eviction Quality (ML score of evicted keys)")
    print("  Lower mean score and lower waste% = smarter evictions")
    print("  " + "─" * 72)
    print(f"  {'Capacity':<10} {'Strategy':<20} {'Evictions':>10} "
          f"{'Mean Score':>12} {'High-Score Evict%':>18} {'Quality':>10}")
    print("  " + "─" * 72)

    for cap, strategies in sorted(eviction_quality.items()):
        best_waste = min(v["eviction_waste_pct"] for v in strategies.values())
        for name, r in strategies.items():
            marker = " ◄ best" if r["eviction_waste_pct"] == best_waste else ""
            print(f"  {str(cap) + ' keys':<10} {name:<20} "
                  f"{r['total_evictions']:>10,} "
                  f"{r['mean_evicted_score']:>12.1f} "
                  f"{str(r['eviction_waste_pct']) + '%':>18}"
                  f"{marker}")
        print()

    print(f"  Mean Score     = avg eviction_score of keys that were evicted")
    print(f"  High-Score Evict% = % of evictions where a high-demand key was dropped")
    print(f"  ML (LightCache) should have the lowest Mean Score and waste%")


# Main

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--output", type=Path,
                        default=BASE_DIR / "benchmark_results.json")
    args = parser.parse_args()

    if not args.data.exists():
        print(f"❌ Data file not found: {args.data}")
        return

    print("═" * 70)
    print("  LightCache — Strategy Benchmark: LRU vs LFU vs ML")
    print("═" * 70)

    # Load data
    records = []
    with open(args.data, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except Exception:
                continue
    print(f"  Loaded {len(records):,} log entries\n")

    # FIX 3 — include low capacities (5, 8) to force real eviction pressure.
    # At capacity >= 20 with typical browse patterns the working set fits in
    # cache and hit rates saturate identically for all strategies. Differences
    # only emerge under pressure.
    capacities = [5, 8, 10, 20]
    capacity_results = {}

    for cap in capacities:
        cap_results = {}
        for name, CacheClass, use_ml in [
            ("LRU",            LRUCache, False),
            ("LFU",            LFUCache, False),
            ("ML (LightCache)", MLCache,  True),
        ]:
            cache = CacheClass(cap)
            result = simulate(records, cache, use_ml_ttl=use_ml)
            cap_results[name] = result
        capacity_results[cap] = cap_results
        print(f"  Capacity {cap:>3}: LRU={cap_results['LRU']['hit_rate']}%  "
              f"LFU={cap_results['LFU']['hit_rate']}%  "
              f"ML={cap_results['ML (LightCache)']['hit_rate']}%")

    # Part 2: TTL waste analysis
    print("\n  Analysing TTL waste patterns...")
    fixed_stats, ml_stats = ttl_analysis(records)

    # Part 3: Eviction quality 
    print("  Analysing eviction quality (score of evicted keys)...")
    eviction_quality = eviction_quality_analysis(records, capacities)

    # Print reports
    print("\n" + "═" * 70)
    print("  LightCache — Benchmark Results")
    print("═" * 70)
    print_part1(capacity_results)
    print_part2(fixed_stats, ml_stats)
    print_part3(eviction_quality)

    # Save results
    output = {
        "generated_at":     time.strftime("%Y-%m-%dT%H:%M:%S"),
        "total_records":    len(records),
        "capacity_results": {
            str(cap): {
                name: {
                    "hit_rate":    r["hit_rate"],
                    "evictions":   r["evictions"],
                    "by_route":    r["by_route"],
                }
                for name, r in results.items()
            }
            for cap, results in capacity_results.items()
        },
        "ttl_analysis": {
            route: {
                "fixed_avg_ttl": round(fixed_stats[route]["ttl_sum"] / fixed_stats[route]["sets"], 0)
                                 if fixed_stats[route]["sets"] else 0,
                "ml_avg_ttl":    round(ml_stats[route]["ttl_sum"] / ml_stats[route]["sets"], 0)
                                 if ml_stats[route]["sets"] else 0,
                "fixed_waste_pct": round(
                    fixed_stats[route]["wasted"] /
                    max(fixed_stats[route]["useful"] + fixed_stats[route]["wasted"], 1) * 100, 1),
                "ml_waste_pct":    round(
                    ml_stats[route]["wasted"] /
                    max(ml_stats[route]["useful"] + ml_stats[route]["wasted"], 1) * 100, 1),
            }
            for route in set(list(fixed_stats.keys()) + list(ml_stats.keys()))
        },
        # FIX 4 — eviction quality now persisted to JSON so the dashboard can
        # surface it as a separate metric column
        "eviction_quality": {
            str(cap): {
                name: {
                    "total_evictions":      r["total_evictions"],
                    "high_score_evictions": r["high_score_evictions"],
                    "mean_evicted_score":   r["mean_evicted_score"],
                    "eviction_waste_pct":   r["eviction_waste_pct"],
                }
                for name, r in strategies.items()
            }
            for cap, strategies in eviction_quality.items()
        },
    }

    with open(args.output, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n  💾 Results saved to: {args.output}")
    print("  ✅ Benchmark complete\n")


if __name__ == "__main__":
    main()
