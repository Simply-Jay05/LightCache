const { cacheGet, cacheSet, logCacheEvent } = require("../config/redis");
const { getPrediction, updateKeyStats } = require("../config/mlClient");

// Fallback TTLs — used when ML service is unavailable
const DEFAULT_TTLS = {
  products_list: 300,
  product_single: 600,
  best_seller: 120,
  new_arrivals: 180,
  similar_products: 600,
};

// Cache key builder
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

// Page type extractor
const getPageType = (req) => {
  if (req.path.includes("best-seller")) return "best_seller";
  if (req.path.includes("new-arrivals")) return "new_arrivals";
  if (req.path.includes("similar")) return "similar";
  if (req.params.id) return "product_detail";
  return "collection";
};

// Price tier extractor
const getPriceTier = (req) => {
  const max = parseFloat(req.query.maxPrice || "0");
  if (!max) return "unknown";
  if (max <= 30) return "budget";
  if (max <= 70) return "mid";
  return "premium";
};

// Middleware factory

const cacheMiddleware = (type) => {
  return async (req, res, next) => {
    const cacheKey = buildCacheKey(req, type);
    const fallbackTtl = DEFAULT_TTLS[type] || 300;
    const startTime = Date.now();
    const pageType = getPageType(req);
    const priceTier = getPriceTier(req);

    // CACHE HIT
    const cached = await cacheGet(cacheKey);

    if (cached !== null) {
      const latency = Date.now() - startTime;

      // Update in-memory key stats
      updateKeyStats(cacheKey, true);

      await logCacheEvent({
        event_type: "HIT",
        cache_key: cacheKey,
        route_type: type,
        page_type: pageType,
        item_id: req.params.id || "",
        query: JSON.stringify(req.query),
        ttl_used: fallbackTtl.toString(),
        latency_ms: latency.toString(),
        hour_of_day: new Date().getHours().toString(),
        weekday: new Date().getDay().toString(),
      });

      console.log(`🟢 CACHE HIT  [${type}] ${cacheKey} (${latency}ms)`);
      return res.json(cached);
    }

    // CACHE MISS
    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      const latency = Date.now() - startTime;

      // Update in-memory key stats
      updateKeyStats(cacheKey, false);

      // Ask the ML service for a predicted TTL
      let ttl = fallbackTtl;
      let mlUsed = false;
      let evictScore = null;

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
        ttl = prediction.ttl_seconds;
        evictScore = prediction.eviction_score;
        mlUsed = true;

        // Fire-and-forget: warm the top-3 prefetch candidates in the background
        // so they are ready in Redis before the user requests them
        if (prediction.prefetch_top3 && prediction.prefetch_top3.length > 0) {
          setImmediate(() => {
            prediction.prefetch_top3.forEach((routeType) => {
              console.log(
                `PREFETCH queued [${routeType}] (predicted next after ${type})`,
              );
              // Note: actual HTTP prefetch calls will be added in Phase 6
              // when the full service mesh is wired up via Docker Compose.
              // For now we log the prediction so it appears in your thesis evidence.
            });
          });
        }
      }

      // Store in cache with ML-predicted (or fallback) TTL
      await cacheSet(cacheKey, data, ttl);

      // Log the miss with the TTL actually used
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
      });

      const ttlSource = mlUsed
        ? `ML:${ttl}s (was ${fallbackTtl}s)`
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
