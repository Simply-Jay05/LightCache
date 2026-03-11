const express = require("express");
const { getClient, getIsConnected, cacheDelPattern } = require("../config/redis");
const { protect, admin } = require("../middleware/authMiddleware");

const router = express.Router();

// @route GET /api/cache/stats
// @desc Returns live cache statistics: hit rate, key count, memory usage, recent logs
// @access: Private/Admin 
router.get("/stats", protect, admin, async (req, res) => {
  const client = getClient();
  const connected = getIsConnected();

  if (!connected || !client) {
    return res.json({
      connected: false,
      message: "Redis is not connected",
      stats: null,
    });
  }

  try {
    // Get all cache keys
    const allKeys = await client.keys("products:*");

    // Get Redis server info
    const info = await client.info("memory");
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    const memoryUsed = memoryMatch ? memoryMatch[1].trim() : "unknown";

    // Read recent logs from the Redis Stream (last 200 entries)
    const rawLogs = await client.xRevRange("cache:logs", "+", "-", { COUNT: 200 });

    // Parse stream entries
    const logs = rawLogs.map((entry) => ({
      id: entry.id,
      ...entry.message,
    }));

    // Calculate hit/miss counts
    const hits = logs.filter((l) => l.event_type === "HIT").length;
    const misses = logs.filter((l) => l.event_type === "MISS").length;
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : "0.0";

    // Average latency
    const latencies = logs
      .map((l) => parseFloat(l.latency_ms))
      .filter((n) => !isNaN(n));
    const avgLatency =
      latencies.length > 0
        ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1)
        : "0.0";

    // Hit latency vs miss latency
    const hitLatencies = logs
      .filter((l) => l.event_type === "HIT")
      .map((l) => parseFloat(l.latency_ms))
      .filter((n) => !isNaN(n));

    const missLatencies = logs
      .filter((l) => l.event_type === "MISS")
      .map((l) => parseFloat(l.latency_ms))
      .filter((n) => !isNaN(n));

    const avgHitLatency =
      hitLatencies.length > 0
        ? (hitLatencies.reduce((a, b) => a + b, 0) / hitLatencies.length).toFixed(1)
        : "0.0";

    const avgMissLatency =
      missLatencies.length > 0
        ? (missLatencies.reduce((a, b) => a + b, 0) / missLatencies.length).toFixed(1)
        : "0.0";

    // Breakdown by route type
    const byType = {};
    logs.forEach((l) => {
      const t = l.route_type || "unknown";
      if (!byType[t]) byType[t] = { hits: 0, misses: 0 };
      if (l.event_type === "HIT") byType[t].hits++;
      else byType[t].misses++;
    });

    // TTL info for each cached key
    const keyDetails = await Promise.all(
      allKeys.slice(0, 50).map(async (key) => {
        const ttl = await client.ttl(key);
        return { key, ttl };
      })
    );

    res.json({
      connected: true,
      summary: {
        totalKeys: allKeys.length,
        memoryUsed,
        hitRate: `${hitRate}%`,
        totalRequests: total,
        hits,
        misses,
        avgLatencyMs: avgLatency,
        avgHitLatencyMs: avgHitLatency,
        avgMissLatencyMs: avgMissLatency,
      },
      byRouteType: byType,
      recentLogs: logs.slice(0, 20),
      cachedKeys: keyDetails,
    });
  } catch (err) {
    console.error("Cache stats error:", err);
    res.status(500).json({ message: "Failed to fetch cache stats", error: err.message });
  }
});

// @route DELETE /api/cache/flush 
// @desc Clears all product cache keys (useful after seeding or bulk product updates)
// @access Private/Admin 
router.delete("/flush", protect, admin, async (req, res) => {
  try {
    await cacheDelPattern("products:*");
    console.log("Cache flushed by admin");
    res.json({ message: "Cache flushed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to flush cache", error: err.message });
  }
});

// @route DELETE /api/cache/flush-logs 
// @desc Clears the cache:logs stream (for testing fresh runs)
// @access Private/Admin 
router.delete("/flush-logs", protect, admin, async (req, res) => {
  const client = getClient();
  if (!client) return res.status(503).json({ message: "Redis not connected" });
  try {
    await client.del("cache:logs");
    console.log("Cache logs flushed by admin");
    res.json({ message: "Cache logs flushed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to flush logs", error: err.message });
  }
});

module.exports = router;
