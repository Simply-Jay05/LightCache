const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const { getClient, getIsConnected } = require("../config/redis");
const {
  keyStats,
  getMlMode,
  setMlMode,
  getMlReadiness,
} = require("../config/mlClient");
const { DEFAULT_TTLS } = require("../middleware/cacheMiddleware");

// GET /api/cache/stats
router.get("/stats", protect, admin, async (req, res) => {
  const client = getClient();
  if (!client || !getIsConnected()) {
    return res.status(503).json({ message: "Redis not available" });
  }

  try {
    // Stream log analysis
    const streamEntries = await client.xRange("cache:logs", "-", "+");

    let hits = 0,
      misses = 0;
    let hitLatencySum = 0,
      missLatencySum = 0;
    let mlUsedCount = 0;
    const byRoute = {};
    const recentLogs = [];
    const hourBuckets = Array(24).fill(0);

    streamEntries.forEach((entry) => {
      const d = entry.message;
      const isHit = d.event_type === "HIT";
      const rawLatency = parseFloat(d.latency_ms || 0);
      const latency = rawLatency >= 0 && rawLatency < 60000 ? rawLatency : 0;
      const route = d.route_type || "unknown";
      const hour = parseInt(d.hour_of_day || 0, 10);
      const mlUsed = d.ml_used === "true";

      if (isHit) {
        hits++;
        hitLatencySum += latency;
      } else {
        misses++;
        missLatencySum += latency;
      }
      if (mlUsed) mlUsedCount++;

      if (!byRoute[route])
        byRoute[route] = { hits: 0, misses: 0, latencySum: 0 };
      byRoute[route][isHit ? "hits" : "misses"]++;
      byRoute[route].latencySum += latency;

      if (!isNaN(hour) && hour >= 0 && hour < 24) hourBuckets[hour]++;

      recentLogs.push({
        event_type: d.event_type,
        cache_key: d.cache_key,
        route_type: d.route_type,
        latency_ms: latency,
        ttl_used: parseInt(d.ttl_used || 0, 10),
        ml_used: mlUsed,
        eviction_score: d.eviction_score || null,
        timestamp: parseInt(d.timestamp || 0, 10),
      });
    });

    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : "0.0";
    const avgHitLatency = hits > 0 ? (hitLatencySum / hits).toFixed(2) : "0";
    const avgMissLatency =
      misses > 0 ? (missLatencySum / misses).toFixed(2) : "0";
    const mlUsageRate =
      total > 0 ? ((mlUsedCount / misses || 0) * 100).toFixed(1) : "0.0";

    // Route breakdown
    const routeStats = Object.entries(byRoute).map(([route, data]) => ({
      route,
      hits: data.hits,
      misses: data.misses,
      total: data.hits + data.misses,
      hit_rate:
        data.hits + data.misses > 0
          ? ((data.hits / (data.hits + data.misses)) * 100).toFixed(1)
          : "0.0",
      avg_latency:
        data.hits + data.misses > 0
          ? (data.latencySum / (data.hits + data.misses)).toFixed(2)
          : "0",
    }));

    // Cached keys with TTL
    const keys = await client.keys("products:*");
    const cachedKeys = await Promise.all(
      keys.slice(0, 50).map(async (key) => {
        const ttl = await client.ttl(key);
        return { key, ttl };
      }),
    );

    // In-memory key stats from mlClient
    const topKeys = Array.from(keyStats.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 20)
      .map(([key, stats]) => ({
        key,
        total: stats.total,
        hits: stats.hits,
        hit_rate:
          stats.total > 0
            ? ((stats.hits / stats.total) * 100).toFixed(1)
            : "0.0",
      }));

    res.json({
      summary: {
        total_requests: total,
        hits,
        misses,
        hit_rate: `${hitRate}%`,
        avg_hit_latency: `${avgHitLatency}ms`,
        avg_miss_latency: `${avgMissLatency}ms`,
        ml_usage_rate: `${mlUsageRate}%`,
        cached_keys: keys.length,
      },
      by_route: routeStats,
      by_hour: hourBuckets,
      cached_keys: cachedKeys,
      top_keys: topKeys,
      recent_logs: recentLogs.slice(-30).reverse(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/cache/ab
// A/B comparison — compares ML-predicted TTLs vs what fixed TTLs would have been
router.get("/ab", protect, admin, async (req, res) => {
  const client = getClient();
  if (!client || !getIsConnected()) {
    return res.status(503).json({ message: "Redis not available" });
  }

  try {
    const streamEntries = await client.xRange("cache:logs", "-", "+");

    // Separate ML-used vs fallback entries
    const mlEntries = streamEntries.filter((e) => e.message.ml_used === "true");
    const fallbackEntries = streamEntries.filter(
      (e) => e.message.ml_used === "false" || !e.message.ml_used,
    );

    // TTL analysis per route
    const routeTtlComparison = {};
    streamEntries.forEach((entry) => {
      const d = entry.message;
      const route = d.route_type || "unknown";
      const ttl = parseInt(d.ttl_used || 0, 10);
      const fixed = DEFAULT_TTLS[route] || 300;
      const mlUsed = d.ml_used === "true";

      if (!routeTtlComparison[route]) {
        routeTtlComparison[route] = {
          route,
          fixed_ttl: fixed,
          ml_ttl_sum: 0,
          ml_ttl_count: 0,
          fixed_hits: 0,
          ml_hits: 0,
          fixed_misses: 0,
          ml_misses: 0,
        };
      }

      if (mlUsed) {
        routeTtlComparison[route].ml_ttl_sum += ttl;
        routeTtlComparison[route].ml_ttl_count += 1;
        if (d.event_type === "HIT") routeTtlComparison[route].ml_hits++;
        else routeTtlComparison[route].ml_misses++;
      } else {
        if (d.event_type === "HIT") routeTtlComparison[route].fixed_hits++;
        else routeTtlComparison[route].fixed_misses++;
      }
    });

    const comparison = Object.values(routeTtlComparison).map((r) => ({
      route: r.route,
      fixed_ttl: r.fixed_ttl,
      ml_avg_ttl:
        r.ml_ttl_count > 0 ? Math.round(r.ml_ttl_sum / r.ml_ttl_count) : null,
      ttl_difference:
        r.ml_ttl_count > 0
          ? Math.round(r.ml_ttl_sum / r.ml_ttl_count) - r.fixed_ttl
          : null,
      fixed_hit_rate:
        r.fixed_hits + r.fixed_misses > 0
          ? ((r.fixed_hits / (r.fixed_hits + r.fixed_misses)) * 100).toFixed(1)
          : "0.0",
      ml_hit_rate:
        r.ml_hits + r.ml_misses > 0
          ? ((r.ml_hits / (r.ml_hits + r.ml_misses)) * 100).toFixed(1)
          : "0.0",
    }));

    res.json({
      summary: {
        total_entries: streamEntries.length,
        ml_entries: mlEntries.length,
        fallback_entries: fallbackEntries.length,
        ml_coverage:
          streamEntries.length > 0
            ? `${((mlEntries.length / streamEntries.length) * 100).toFixed(1)}%`
            : "0%",
      },
      by_route: comparison,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/cache/flush
router.delete("/flush", protect, admin, async (req, res) => {
  const client = getClient();
  if (!client || !getIsConnected()) {
    return res.status(503).json({ message: "Redis not available" });
  }
  try {
    const keys = await client.keys("products:*");
    if (keys.length > 0) await client.del(keys);
    res.json({ message: `Flushed ${keys.length} cache keys` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/cache/flush-logs
router.delete("/flush-logs", protect, admin, async (req, res) => {
  const client = getClient();
  if (!client || !getIsConnected()) {
    return res.status(503).json({ message: "Redis not available" });
  }
  try {
    await client.del("cache:logs");
    res.json({ message: "Cache logs cleared" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/cache/benchmark
// Returns saved benchmark_results.json produced by benchmark.py.
// The file lives in the ml-service container at /app/model/benchmark_results.json
// and is accessible here via the shared logs_data volume at /app/logs/benchmark_results.json,
// OR fetch it through the ML service HTTP endpoint as a fallback.
const fs = require("fs");
const path = require("path");

const BENCHMARK_PATHS = [
  // Path when running inside Docker (backend container has logs_data mounted at /app/logs)
  path.join("/app", "logs", "benchmark_results.json"),
  // Path when running locally (relative to backend root)
  path.join(__dirname, "..", "logs", "benchmark_results.json"),
  // Fallback: ml-service folder (local dev without Docker)
  path.join(__dirname, "..", "..", "ml-service", "benchmark_results.json"),
];

router.get("/benchmark", protect, admin, async (req, res) => {
  // 1. Try reading from disk first (fastest, works in Docker and local dev)
  for (const filePath of BENCHMARK_PATHS) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(raw);
        return res.json(data);
      }
    } catch {
      // Try next path
    }
  }

  // 2. Fallback: proxy through ML service HTTP endpoint
  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
  try {
    const response = await fetch(`${ML_SERVICE_URL}/benchmark/results`);
    if (response.ok) {
      const data = await response.json();
      return res.json(data);
    }
  } catch {
    // ML service unreachable
  }

  // 3. Nothing found
  res.status(404).json({
    message:
      "No benchmark results found. Run: python benchmark.py inside the ml-service container.",
  });
});

// POST /api/cache/benchmark/run
// Triggers a fresh benchmark run against the current cache_events.jsonl.
// Proxies to the ml-service /benchmark/run endpoint which executes benchmark.py
// synchronously and returns the updated results. Use this after clearing logs
// or generating new traffic — no container restart needed.
router.post("/benchmark/run", protect, admin, async (req, res) => {
  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
  try {
    const response = await fetch(`${ML_SERVICE_URL}/benchmark/run`, {
      method: "POST",
      signal: AbortSignal.timeout(130_000), // slightly longer than benchmark's 120s timeout
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ message: `ML service error: ${text}` });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    if (err.name === "TimeoutError") {
      return res.status(504).json({ message: "Benchmark timed out (>130s)" });
    }
    return res
      .status(503)
      .json({ message: `Could not reach ML service: ${err.message}` });
  }
});

// ── ML Mode control ──────────────────────────────────────────────────────────

// GET /api/cache/mode — returns current mode + readiness info
router.get("/mode", protect, admin, async (req, res) => {
  try {
    const mode = await getMlMode();
    const readiness = await getMlReadiness();
    res.json({ mode, readiness });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/cache/mode — { mode: "redis_only" | "ml_active" }
router.post("/mode", protect, admin, async (req, res) => {
  const { mode } = req.body;
  if (!["redis_only", "ml_active"].includes(mode)) {
    return res
      .status(400)
      .json({ message: "mode must be redis_only or ml_active" });
  }
  try {
    await setMlMode(mode);
    console.log(`[Admin] ML mode switched to: ${mode}`);
    res.json({ mode, message: `Switched to ${mode}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/cache/reset-training-data
// Wipes the JSONL log + model artefacts via the ml-service so the
// scheduler retrains from scratch on real user data.
router.post("/reset-training-data", protect, admin, async (req, res) => {
  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
  try {
    const response = await fetch(`${ML_SERVICE_URL}/admin/reset-data`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ message: `ML service error: ${text}` });
    }
    const data = await response.json();
    // Also switch mode back to redis_only so ML isn't called against a deleted model
    await setMlMode("redis_only");
    res.json({ ...data, mode_reset_to: "redis_only" });
  } catch (err) {
    res
      .status(503)
      .json({ message: `Could not reach ML service: ${err.message}` });
  }
});

router.post("/snapshot", protect, admin, async (req, res) => {
  const client = getClient();
  if (!client || !getIsConnected()) {
    return res.status(503).json({ message: "Redis not available" });
  }

  const { label = "unlabelled", mode = "unknown" } = req.body;

  try {
    const streamEntries = await client.xRange("cache:logs", "-", "+");
    if (streamEntries.length === 0) {
      return res
        .status(400)
        .json({ message: "No log entries found. Browse the store first." });
    }

    // Route payload size estimates (bytes) — used for throughput when
    // response_size_bytes is not logged
    const ROUTE_SIZE_BYTES = {
      products_list: 8192, // ~8KB  list of products
      product_single: 4096, // ~4KB  single product detail
      best_seller: 4096,
      new_arrivals: 16384, // ~16KB list of 8 new arrivals
      similar_products: 8192,
    };

    let hits = 0,
      misses = 0;
    let hitLatSum = 0,
      missLatSum = 0,
      totalLatSum = 0;
    let totalBytes = 0;
    let mlCount = 0;
    const timestamps = [];

    streamEntries.forEach((entry) => {
      const d = entry.message;
      const isHit = d.event_type === "HIT";
      const latency = parseFloat(d.latency_ms || 0);
      const route = d.route_type || "products_list";
      const mlUsed = d.ml_used === "true";
      const ts = parseInt(d.timestamp || 0, 10);

      if (ts > 0) timestamps.push(ts);

      if (isHit) {
        hits++;
        hitLatSum += latency;
      } else {
        misses++;
        missLatSum += latency;
      }

      totalLatSum += latency;
      if (mlUsed) mlCount++;

      const bytes =
        parseInt(d.response_size_bytes || 0, 10) ||
        ROUTE_SIZE_BYTES[route] ||
        4096;
      totalBytes += bytes;
    });

    const total = hits + misses;
    const elapsedMs =
      timestamps.length > 1
        ? Math.max(timestamps[timestamps.length - 1] - timestamps[0], 1)
        : 60_000; // default 60s if only one entry

    const snapshot = {
      label,
      mode,
      captured_at: new Date().toISOString(),
      total_requests: total,
      hits,
      misses,
      hit_rate_pct:
        total > 0 ? parseFloat(((hits / total) * 100).toFixed(2)) : 0,
      avg_rt_ms: total > 0 ? parseFloat((totalLatSum / total).toFixed(2)) : 0,
      avg_hit_rt_ms: hits > 0 ? parseFloat((hitLatSum / hits).toFixed(2)) : 0,
      avg_miss_rt_ms:
        misses > 0 ? parseFloat((missLatSum / misses).toFixed(2)) : 0,
      throughput_kbs: parseFloat(
        (totalBytes / (elapsedMs / 1000) / 1024).toFixed(2),
      ),
      ml_coverage_pct:
        total > 0 ? parseFloat(((mlCount / total) * 100).toFixed(1)) : 0,
      stream_entries: streamEntries.length,
    };

    // Persist snapshot to Redis sorted set keyed by timestamp
    const snapshotKey = "lightcache:snapshots";
    await client.zAdd(snapshotKey, {
      score: Date.now(),
      value: JSON.stringify(snapshot),
    });

    console.log(
      `[Snapshot] Saved: ${label} | mode=${mode} | hit_rate=${snapshot.hit_rate_pct}% | RT=${snapshot.avg_rt_ms}ms | TH=${snapshot.throughput_kbs}KB/s`,
    );
    res.json({ message: "Snapshot saved.", snapshot });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//  GET /api/cache/snapshots
//  Returns all saved snapshots ordered by capture time.
//  Used by the Evaluation tab to build Table A (RT) and Table B (TH).

router.get("/snapshots", protect, admin, async (req, res) => {
  const client = getClient();
  if (!client || !getIsConnected()) {
    return res.status(503).json({ message: "Redis not available" });
  }
  try {
    const raw = await client.zRange("lightcache:snapshots", 0, -1);
    const snapshots = raw.map((s) => JSON.parse(s));
    res.json({ snapshots, count: snapshots.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//  DELETE /api/cache/snapshots
//  Clears all saved snapshots so you can start a fresh evaluation run.

router.delete("/snapshots", protect, admin, async (req, res) => {
  const client = getClient();
  if (!client || !getIsConnected()) {
    return res.status(503).json({ message: "Redis not available" });
  }
  try {
    await client.del("lightcache:snapshots");
    res.json({ message: "All snapshots cleared." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//  GET /api/cache/chapter4-export
//  Returns the complete Chapter 4 evaluation data as a single JSON object:
//  - table_a: Response Time — Fixed TTL Redis vs LightCache ML
//  - table_b: Throughput   — Fixed TTL Redis vs LightCache ML
//  - table_c: Hit Ratio    — LRU vs LFU vs LightCache (from benchmark)
//  - base_paper: reference numbers from IRCache for direct comparison

router.get("/chapter4-export", protect, admin, async (req, res) => {
  const client = getClient();
  if (!client || !getIsConnected()) {
    return res.status(503).json({ message: "Redis not available" });
  }

  try {
    // Table A and B: from snapshots
    const raw = await client.zRange("lightcache:snapshots", 0, -1);
    const snapshots = raw.map((s) => JSON.parse(s));

    // Group by mode for side-by-side table columns
    const fixed = snapshots.filter(
      (s) => s.mode === "fixed_ttl" || s.mode === "redis_only",
    );
    const ml = snapshots.filter((s) => s.mode === "ml_active");

    // Build table_a (RT) and table_b (TH) with fixed vs ML columns
    const labels = [
      ...new Set([...fixed.map((s) => s.label), ...ml.map((s) => s.label)]),
    ];

    const table_a = labels.map((label) => {
      const f = fixed.find((s) => s.label === label);
      const m = ml.find((s) => s.label === label);
      const rt_improvement =
        f && m
          ? parseFloat(
              (((f.avg_rt_ms - m.avg_rt_ms) / f.avg_rt_ms) * 100).toFixed(1),
            )
          : null;
      return {
        label,
        fixed_ttl_rt_ms: f?.avg_rt_ms ?? null,
        lightcache_rt_ms: m?.avg_rt_ms ?? null,
        rt_reduction_pct: rt_improvement,
      };
    });

    const table_b = labels.map((label) => {
      const f = fixed.find((s) => s.label === label);
      const m = ml.find((s) => s.label === label);
      const th_improvement =
        f && m
          ? parseFloat(
              (
                ((m.throughput_kbs - f.throughput_kbs) / f.throughput_kbs) *
                100
              ).toFixed(1),
            )
          : null;
      return {
        label,
        fixed_ttl_th_kbs: f?.throughput_kbs ?? null,
        lightcache_th_kbs: m?.throughput_kbs ?? null,
        th_increase_pct: th_improvement,
      };
    });

    // Overall averages for the thesis discussion paragraph
    const avg_rt_reduction = table_a
      .filter((r) => r.rt_reduction_pct !== null)
      .reduce((sum, r, _, arr) => sum + r.rt_reduction_pct / arr.length, 0);
    const avg_th_increase = table_b
      .filter((r) => r.th_increase_pct !== null)
      .reduce((sum, r, _, arr) => sum + r.th_increase_pct / arr.length, 0);

    // Table C: from benchmark file
    let table_c = null;
    for (const filePath of BENCHMARK_PATHS) {
      try {
        if (fs.existsSync(filePath)) {
          const benchData = JSON.parse(fs.readFileSync(filePath, "utf8"));
          table_c = benchData.chapter4_table_c || null;
          break;
        }
      } catch {
        /* try next */
      }
    }

    res.json({
      exported_at: new Date().toISOString(),
      snapshot_count: snapshots.length,

      // Chapter 4 Table A — Response Time
      table_a: {
        title: "Average Response Time — Fixed TTL Redis vs LightCache (ML)",
        description:
          "Mirrors base paper Table 3. Measures avg RT (ms) per session.",
        rows: table_a,
        avg_rt_reduction_pct: parseFloat(avg_rt_reduction.toFixed(1)),
        base_paper_rt_reduction_pct: 63.78, // from IRCache Table 3 avg
      },

      // Chapter 4 Table B — Throughput
      table_b: {
        title: "Average Throughput — Fixed TTL Redis vs LightCache (ML)",
        description:
          "Mirrors base paper Table 4. Measures avg throughput (KB/s) per session.",
        rows: table_b,
        avg_th_increase_pct: parseFloat(avg_th_increase.toFixed(1)),
        base_paper_th_increase_pct: 32.84, // from IRCache Table 4 avg
      },

      // Chapter 4 Table C — Hit Ratio
      table_c: table_c
        ? {
            title: "Hit Ratio Comparison — LRU vs LFU vs LightCache",
            description:
              "Mirrors base paper Table 6. Benchmark replays real e-commerce traffic log.",
            ...table_c,
          }
        : { message: "Run benchmark.py first to populate Table C." },

      // Base paper reference numbers
      base_paper: {
        citation: "Pramudia et al. (2025), Dinamika Rekayasa Vol.21 No.2",
        rt_reduction_pct: 63.78,
        th_increase_pct: 32.84,
        best_hit_ratio: 62.06,
        best_algorithm: "Random Replacement (RR)",
        lru_avg_hit_ratio: 59.14,
        lfu_avg_hit_ratio: 60.2,
      },

      // Chapter 5 discussion sentences (ready to paste)
      discussion: {
        table_a: avg_rt_reduction
          ? `LightCache achieved an average response time reduction of ${avg_rt_reduction.toFixed(1)}% compared to fixed-TTL Redis caching, versus the ${63.78}% reduction reported by Pramudia et al. (2025) when comparing cached against non-cached systems.`
          : "Collect snapshots in both modes to generate this sentence.",
        table_b: avg_th_increase
          ? `LightCache achieved an average throughput increase of ${avg_th_increase.toFixed(1)}% over fixed-TTL Redis, compared to the base paper's ${32.84}% improvement over non-cached systems.`
          : "Collect snapshots in both modes to generate this sentence.",
        table_c: table_c
          ? `The base paper (Pramudia et al., 2025) achieved a maximum average hit ratio of 62.06% using Random Replacement on the IRCache dataset. LightCache achieved ${table_c.averages?.LightCache?.toFixed(2)}% average hit ratio on real e-commerce traffic across equivalent memory pressures (1–8 MB), representing a ${table_c.lightcache_vs_base_paper_rr > 0 ? "+" : ""}${table_c.lightcache_vs_base_paper_rr?.toFixed(2)}% improvement over the base paper ceiling. This confirms that ML-predicted future demand is a more effective eviction signal than recency (LRU: ${table_c.averages?.LRU?.toFixed(2)}%) and frequency (LFU: ${table_c.averages?.LFU?.toFixed(2)}%) heuristics.`
          : "Run benchmark.py first.",
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
