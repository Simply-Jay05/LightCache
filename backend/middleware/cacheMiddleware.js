const { cacheGet, cacheSet, logCacheEvent } = require("../config/redis");
const { getPrediction, updateKeyStats } = require("../config/mlClient");
const { getClient } = require("../config/redis");

// Fallback TTLs — used when ML service is unavailable
const DEFAULT_TTLS = {
  products_list: 300,
  product_single: 600,
  best_seller: 120,
  new_arrivals: 180,
  similar_products: 600,
};

// Minimum TTL floor for real user browsing
const MIN_TTLS = {
  products_list: 120,
  product_single: 180,
  best_seller: 90,
  new_arrivals: 120,
  similar_products: 180,
};

const buildCacheKey = (req, type) => {
  const queryString = new URLSearchParams(req.query).toString();
  const paramId = req.params.id || "";
  switch (type) {
    case "products_list":
      return `products:list:${queryString}`;
    case "product_single":
      return `products:single:${paramId}`;
    case "best_seller":
      return `products:best-seller`;
    case "new_arrivals":
      return `products:new-arrivals`;
    case "similar_products":
      return `products:similar:${paramId}`;
    default:
      return `cache:${type}:${queryString}`;
  }
};

const getPageType = (req) => {
  if (req.path.includes("best-seller")) return "best_seller";
  if (req.path.includes("new-arrivals")) return "new_arrivals";
  if (req.path.includes("similar")) return "similar";
  if (req.params.id) return "product_detail";
  return "collection";
};

const getPriceTier = (req) => {
  const max = parseFloat(req.query.maxPrice || "0");
  if (!max) return "unknown";
  if (max <= 30) return "budget";
  if (max <= 70) return "mid";
  return "premium";
};

// Store ML metadata alongside the cached entry so HITs know if ML was used
const setKeyMeta = async (cacheKey, ttl, mlUsed, rawTtl) => {
  const client = getClient();
  if (!client) return;
  try {
    const metaKey = `meta:${cacheKey}`;
    await client.setEx(
      metaKey,
      ttl,
      JSON.stringify({
        ml_used: mlUsed,
        ttl_used: ttl,
        raw_ml_ttl: rawTtl,
      }),
    );
  } catch {
    /* silent */
  }
};

const getKeyMeta = async (cacheKey) => {
  const client = getClient();
  if (!client) return null;
  try {
    const val = await client.get(`meta:${cacheKey}`);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
const cacheMiddleware = (type) => {
  return async (req, res, next) => {
    const cacheKey = buildCacheKey(req, type);
    const fallbackTtl = DEFAULT_TTLS[type] || 300;
    const minTtl = MIN_TTLS[type] || 120;
    const startTime = Date.now();
    const pageType = getPageType(req);
    const priceTier = getPriceTier(req);

    // ── CACHE HIT ─────────────────────────────────────────────────────────────
    const cached = await cacheGet(cacheKey);

    if (cached !== null) {
      const latency = Date.now() - startTime;
      updateKeyStats(cacheKey, true);

      // Look up whether this key was originally cached with ML
      const meta = await getKeyMeta(cacheKey);
      const mlUsed = meta?.ml_used ?? false;
      const ttlUsed = meta?.ttl_used ?? fallbackTtl;

      await logCacheEvent({
        event_type: "HIT",
        cache_key: cacheKey,
        route_type: type,
        page_type: pageType,
        item_id: req.params.id || "",
        query: JSON.stringify(req.query),
        ttl_used: ttlUsed.toString(),
        latency_ms: latency.toString(),
        hour_of_day: new Date().getHours().toString(),
        weekday: new Date().getDay().toString(),
        ml_used: mlUsed.toString(),
      });

      console.log(
        `🟢 CACHE HIT  [${type}] ${cacheKey} (${latency}ms) [${mlUsed ? "ML" : "fixed"}]`,
      );
      return res.json(cached);
    }

    // ── CACHE MISS ────────────────────────────────────────────────────────────
    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      const latency = Date.now() - startTime;
      updateKeyStats(cacheKey, false);

      let ttl = fallbackTtl;
      let mlUsed = false;
      let evictScore = null;
      let rawMlTtl = null;

      const prediction = await getPrediction({
        route_type: type,
        page_type: pageType,
        item_id: req.params.id || "",
        cache_key: cacheKey,
        ttl_used: fallbackTtl,
        latency_ms: latency,
        is_hit: false,
        price_tier: priceTier,
      });

      if (prediction && prediction.ttl_seconds) {
        rawMlTtl = prediction.ttl_seconds;
        ttl = Math.max(prediction.ttl_seconds, minTtl);
        evictScore = prediction.eviction_score;
        mlUsed = true;
      }

      // Store data and metadata
      await cacheSet(cacheKey, data, ttl);
      await setKeyMeta(cacheKey, ttl, mlUsed, rawMlTtl);

      await logCacheEvent({
        event_type: "MISS",
        cache_key: cacheKey,
        route_type: type,
        page_type: pageType,
        item_id: req.params.id || "",
        query: JSON.stringify(req.query),
        ttl_used: ttl.toString(),
        latency_ms: latency.toString(),
        hour_of_day: new Date().getHours().toString(),
        weekday: new Date().getDay().toString(),
        ml_used: mlUsed.toString(),
        eviction_score: evictScore !== null ? evictScore.toString() : "",
        raw_ml_ttl: rawMlTtl !== null ? rawMlTtl.toString() : "",
      });

      const ttlSource = mlUsed
        ? `ML:${ttl}s (raw:${rawMlTtl}s, min:${minTtl}s)`
        : `fallback:${ttl}s`;

      console.log(
        `🔴 CACHE MISS [${type}] ${cacheKey} (${latency}ms) → TTL ${ttlSource}`,
      );

      return originalJson(data);
    };

    next();
  };
};

module.exports = { cacheMiddleware, buildCacheKey, DEFAULT_TTLS };
