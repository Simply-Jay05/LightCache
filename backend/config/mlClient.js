const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ML_TIMEOUT_MS = 200; // if ML takes longer than this, use fallback TTL
const ML_ENABLED = process.env.ML_ENABLED !== "false"; // set ML_ENABLED=false to disable

// In-memory key stats tracker: Tracks per-key access count and hit rate so we can pass them to the ML model.
// Resets on server restart — that's fine, the model handles cold starts gracefully.
const keyStats = new Map();

const updateKeyStats = (cacheKey, isHit) => {
  const existing = keyStats.get(cacheKey) || { hits: 0, total: 0 };
  keyStats.set(cacheKey, {
    hits: existing.hits + (isHit ? 1 : 0),
    total: existing.total + 1,
  });
};

const getKeyStats = (cacheKey) => {
  const stats = keyStats.get(cacheKey);
  if (!stats || stats.total === 0) {
    return { key_access_count: 1, key_hit_rate: 0.5 }; // cold start defaults
  }
  return {
    key_access_count: stats.total,
    key_hit_rate: parseFloat((stats.hits / stats.total).toFixed(4)),
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

  const now = new Date();
  const hour = now.getHours();
  const weekday = now.getDay();
  const isWeekend = weekday === 0 || weekday === 6 ? 1 : 0;
  const isPeakHour = hour >= 9 && hour <= 21 ? 1 : 0;
  const { key_access_count, key_hit_rate } = getKeyStats(cache_key);

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
    key_access_count,
    key_hit_rate,
    is_hit: is_hit ? 1 : 0,
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
    return await response.json();
  } catch {
    // ML service is down, slow, or timed out — fall back silently
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
  keyStats,
};
