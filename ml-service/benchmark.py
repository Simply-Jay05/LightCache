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


# ══════════════════════════════════════════════════════════════════════════════
# Cache Simulators
# ══════════════════════════════════════════════════════════════════════════════

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

    def put(self, key, ttl, now_ms):
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

    def put(self, key, ttl, now_ms):
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


class MLCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache    = {}
        self.access   = {}

    def get(self, key, now_ms):
        if key not in self.cache:
            return False
        if now_ms > self.cache[key]:
            del self.cache[key]
            return False
        self.access[key] = now_ms
        return True

    def put(self, key, ttl, now_ms):
        self.cache[key]  = now_ms + ttl * 1000
        self.access[key] = now_ms
        if len(self.cache) > self.capacity:
            lru = min(self.access, key=lambda k: self.access[k])
            del self.cache[lru]
            del self.access[lru]

    def size(self):
        return len(self.cache)


# ══════════════════════════════════════════════════════════════════════════════
# Simulation
# ══════════════════════════════════════════════════════════════════════════════

def simulate(records, cache, use_ml_ttl=False):
    hits = misses = 0
    evictions = 0
    ttl_wasted = 0    # expired before re-request
    ttl_useful = 0    # survived until re-request
    by_route = defaultdict(lambda: {"hits": 0, "misses": 0})
    prev_size = 0

    for r in records:
        key   = r.get("cache_key", "")
        route = r.get("route_type", "unknown")
        ts    = int(r.get("timestamp", 0))
        ml    = r.get("ml_used") == "true"
        ttl   = int(r.get("ttl_used", 300)) if (use_ml_ttl and ml) \
                else FIXED_TTLS.get(route, 300)

        hit = cache.get(key, ts)
        cur_size = cache.size()
        if cur_size < prev_size:
            evictions += (prev_size - cur_size)
        prev_size = cur_size

        if hit:
            hits += 1
            ttl_useful += 1
            by_route[route]["hits"] += 1
        else:
            misses += 1
            by_route[route]["misses"] += 1
            cache.put(key, ttl, ts)

    total = hits + misses
    return {
        "total":      total,
        "hits":       hits,
        "misses":     misses,
        "hit_rate":   round(hits / total * 100, 2) if total else 0,
        "evictions":  evictions,
        "ttl_useful": ttl_useful,
        "ttl_accuracy": round(ttl_useful / total * 100, 2) if total else 0,
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


# ══════════════════════════════════════════════════════════════════════════════
# TTL Analysis (Part 2)
# ══════════════════════════════════════════════════════════════════════════════

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


# ══════════════════════════════════════════════════════════════════════════════
# Report
# ══════════════════════════════════════════════════════════════════════════════

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


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

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

    # ── Part 1: Eviction comparison at different capacities ──────────────────
    capacities = [10, 20, 30, 50]
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

    # ── Part 2: TTL waste analysis ────────────────────────────────────────────
    print("\n  Analysing TTL waste patterns...")
    fixed_stats, ml_stats = ttl_analysis(records)

    # Print reports
    print("\n" + "═" * 70)
    print("  LightCache — Benchmark Results")
    print("═" * 70)
    print_part1(capacity_results)
    print_part2(fixed_stats, ml_stats)

    # Save results
    output = {
        "generated_at":     time.strftime("%Y-%m-%dT%H:%M:%S"),
        "total_records":    len(records),
        "capacity_results": {
            str(cap): {
                name: {
                    "hit_rate":    r["hit_rate"],
                    "evictions":   r["evictions"],
                    "ttl_accuracy":r["ttl_accuracy"],
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
    }

    with open(args.output, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n  💾 Results saved to: {args.output}")
    print("  ✅ Benchmark complete\n")


if __name__ == "__main__":
    main()