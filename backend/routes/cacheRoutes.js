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

module.exports = router;
