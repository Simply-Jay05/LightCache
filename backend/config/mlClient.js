const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ML_TIMEOUT_MS = 200;
const ML_ENABLED = process.env.ML_ENABLED !== "false";

// ML Mode
// Persisted in Redis so it survives backend restarts.
// "redis_only"  = plain Redis caching, ML service not consulted
// "ml_active"   = ML service consulted on every cache miss
const ML_MODE_KEY = "lightcache:ml_mode";
let _mlModeCache = "redis_only"; // in-memory cache to avoid Redis round-trip on every request

const getRedisClient = () => {
  try {
    return require("./redis").getClient();
  } catch {
    return null;
  }
};

const getMlMode = async () => {
  const client = getRedisClient();
  if (!client) return _mlModeCache;
  try {
    const val = await client.get(ML_MODE_KEY);
    if (val === "ml_active" || val === "redis_only") {
      _mlModeCache = val;
      return val;
    }
  } catch {
    /* silent */
  }
  return _mlModeCache;
};

const setMlMode = async (mode) => {
  if (mode !== "redis_only" && mode !== "ml_active")
    throw new Error("Invalid mode");
  _mlModeCache = mode;
  const client = getRedisClient();
  if (client) {
    try {
      await client.set(ML_MODE_KEY, mode);
    } catch {
      /* silent */
    }
  }
};

// Returns data readiness info by proxying the ml-service
const getMlReadiness = async () => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/admin/readiness`, {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) return await response.json();
  } catch {
    /* silent */
  }
  return null;
};

//  Per-key stats tracker: Tracks hits, total accesses, last request timestamp, and
// inter-arrival intervals so we can pass temporal features to the model.
const keyStats = new Map();

const updateKeyStats = (cacheKey, isHit) => {
  const now = Date.now();
  const existing = keyStats.get(cacheKey) || {
    hits: 0,
    total: 0,
    lastTs: null,
    intervals: [], // last 10 inter-arrival times in ms
  };

  // Compute interval since last request for this key
  const interval = existing.lastTs !== null ? now - existing.lastTs : null;
  const intervals = existing.intervals.slice(-9); // keep last 9
  if (interval !== null) intervals.push(interval);

  keyStats.set(cacheKey, {
    hits: existing.hits + (isHit ? 1 : 0),
    total: existing.total + 1,
    lastTs: now,
    intervals,
  });
};

const getKeyStats = (cacheKey) => {
  const stats = keyStats.get(cacheKey);
  if (!stats || stats.total === 0) {
    return {
      key_access_count: 1,
      key_hit_rate: 0.5,
      time_since_last_request: 0,
      request_interval_mean: 300,
      request_interval_std: 0,
    };
  }

  const now = Date.now();
  const timeSinceLast =
    stats.lastTs !== null
      ? (now - stats.lastTs) / 1000 // ms to seconds
      : 0;

  const intervals = stats.intervals;
  let intervalMean = 300;
  let intervalStd = 0;

  if (intervals.length > 0) {
    const meanMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    intervalMean = meanMs / 1000; // ms to seconds

    if (intervals.length > 1) {
      const variance =
        intervals.reduce((sum, v) => sum + Math.pow(v - meanMs, 2), 0) /
        intervals.length;
      intervalStd = Math.sqrt(variance) / 1000; // ms to seconds
    }
  }

  return {
    key_access_count: stats.total,
    key_hit_rate: parseFloat((stats.hits / stats.total).toFixed(4)),
    time_since_last_request: parseFloat(timeSinceLast.toFixed(2)),
    request_interval_mean: parseFloat(intervalMean.toFixed(2)),
    request_interval_std: parseFloat(intervalStd.toFixed(2)),
  };
};

// ML predict call
const getPrediction = async ({
  route_type,
  page_type,
  item_id,
  cache_key,
  ttl_used,
  latency_ms,
  is_hit,
  price_tier = "unknown",
}) => {
  if (!ML_ENABLED) return null;
  // Check persisted mode — skip ML entirely if admin set redis_only
  if (_mlModeCache === "redis_only") return null;

  const now = new Date();
  const hour = now.getHours();
  const weekday = now.getDay();
  const isWeekend = weekday === 0 || weekday === 6 ? 1 : 0;
  const isPeakHour = hour >= 9 && hour <= 21 ? 1 : 0;

  const stats = getKeyStats(cache_key);

  const body = {
    route_type,
    page_type,
    item_id: item_id || "",
    cache_key,
    hour_of_day: hour,
    weekday,
    is_weekend: isWeekend,
    is_peak_hour: isPeakHour,
    price_tier,
    ttl_used,
    latency_ms: latency_ms || 0,
    is_hit: is_hit ? 1 : 0,
    // Key stats (includes new temporal features)
    key_access_count: stats.key_access_count,
    key_hit_rate: stats.key_hit_rate,
    time_since_last_request: stats.time_since_last_request,
    request_interval_mean: stats.request_interval_mean,
    request_interval_std: stats.request_interval_std,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) return null;

    const result = await response.json();
    // result contains: ttl_seconds, eviction_score, prefetch_routes
    return result;
  } catch {
    return null;
  }
};

// Health check
const checkMlService = async () => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
};

module.exports = {
  getPrediction,
  updateKeyStats,
  getKeyStats,
  checkMlService,
  getMlMode,
  setMlMode,
  getMlReadiness,
  keyStats,
};
