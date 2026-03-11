const { cacheGet, cacheSet, logCacheEvent } = require("../config/redis");

// Default TTLs per route type (seconds)

const DEFAULT_TTLS = {
  products_list: 300,      // 5 min  — product listings change occasionally
  product_single: 600,     // 10 min — individual products change rarely
  best_seller: 120,        // 2 min  — best seller rank can shift
  new_arrivals: 180,       // 3 min  — new arrivals update periodically
  similar_products: 600,   // 10 min — similar products rarely change
};


//  Build a deterministic cache key from the request
//  e.g. "products:list:gender=Women&category=Bottom Wear&limit=8"
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


// Extract a rough page type from the request for logging
const getPageType = (req) => {
  if (req.path.includes("best-seller")) return "best_seller";
  if (req.path.includes("new-arrivals")) return "new_arrivals";
  if (req.path.includes("similar")) return "similar";
  if (req.params.id) return "product_detail";
  return "collection";
};


// Cache middleware factory
// Usage: router.get("/", cacheMiddleware("products_list"), handler)
const cacheMiddleware = (type) => {
  return async (req, res, next) => {
    const cacheKey = buildCacheKey(req, type);
    const ttl = DEFAULT_TTLS[type] || 300;
    const startTime = Date.now();

    // Try cache first
    const cached = await cacheGet(cacheKey);

    if (cached !== null) {
      // CACHE HIT — log it and return immediately
      const latency = Date.now() - startTime;

      await logCacheEvent({
        event_type: "HIT",
        cache_key: cacheKey,
        route_type: type,
        page_type: getPageType(req),
        item_id: req.params.id || "",
        query: JSON.stringify(req.query),
        ttl_used: ttl.toString(),
        latency_ms: latency.toString(),
        hour_of_day: new Date().getHours().toString(),
        weekday: new Date().getDay().toString(),
      });

      console.log(`CACHE HIT  [${type}] ${cacheKey} (${latency}ms)`);

      return res.json({
        ...cached,
        _cache: { hit: true, key: cacheKey, ttl },
      });
    }

    //Cache MISS — intercept res.json to cache the response 
    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      const latency = Date.now() - startTime;

      // Store in cache (strip any existing _cache meta before storing)
      const { _cache, ...cleanData } = data || {};
      await cacheSet(cacheKey, cleanData, ttl);

      // Log the miss
      await logCacheEvent({
        event_type: "MISS",
        cache_key: cacheKey,
        route_type: type,
        page_type: getPageType(req),
        item_id: req.params.id || "",
        query: JSON.stringify(req.query),
        ttl_used: ttl.toString(),
        latency_ms: latency.toString(),
        hour_of_day: new Date().getHours().toString(),
        weekday: new Date().getDay().toString(),
      });

      console.log(`CACHE MISS [${type}] ${cacheKey} (${latency}ms) → cached for ${ttl}s`);

      // Send the original response with cache metadata
      return originalJson({ ...cleanData, _cache: { hit: false, key: cacheKey, ttl } });
    };

    next();
  };
};

module.exports = { cacheMiddleware, buildCacheKey, DEFAULT_TTLS };
