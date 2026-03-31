const { cacheGet, cacheSet, logCacheEvent } = require("../config/redis");
const {
  getPrediction,
  updateKeyStats,
  keyStats,
} = require("../config/mlClient");
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

// Maps each route type to the Redis key prefix used by buildCacheKey.
// Used to scan keyStats for real item IDs that belong to a given route.
const ROUTE_KEY_PREFIX = {
  products_list: "products:list:",
  product_single: "products:single:",
  best_seller: "products:best-seller",
  new_arrivals: "products:new-arrivals",
  similar_products: "products:similar:",
};

// Routes whose cache key encodes a specific item ID (prefix + id).
// These are the only ones where we can extract and prefetch individual products.
const ITEM_ID_ROUTES = new Set(["product_single", "similar_products"]);

// Routes with a single, fixed cache key — just warm that one key directly.
const SINGLETON_ROUTES = new Set(["best_seller", "new_arrivals"]);

//  The backend resolves route-type strings returned by the ML model into actual cache keys by scanning the in-memory keyStats
//  map, which already tracks access counts for every key seen this session.
//  For item-scoped routes (product_single, similar_products): Finds the top-N most-accessed keys matching the route's key prefix, extracts the item ID from each key, and returns { cacheKey, itemId }.
//  For singleton routes (best_seller, new_arrivals): Returns the single fixed cache key with no item ID needed.
//  For list routes (products_list): Returns the top-N most-accessed list keys (each encodes a query string).

const resolveTopCandidates = (routeType, n = 3) => {
  const prefix = ROUTE_KEY_PREFIX[routeType];
  if (!prefix) return [];

  // Singleton routes have exactly one key — return it directly
  if (SINGLETON_ROUTES.has(routeType)) {
    return [{ cacheKey: prefix, itemId: null }];
  }

  // Scan keyStats for all keys that belong to this route type
  const candidates = [];
  for (const [key, stats] of keyStats.entries()) {
    if (key.startsWith(prefix)) {
      const itemId = ITEM_ID_ROUTES.has(routeType)
        ? key.slice(prefix.length) // e.g. "products:single:abc123" → "abc123"
        : null;
      candidates.push({ cacheKey: key, itemId, total: stats.total });
    }
  }

  // Sort by access count descending, take top N
  return candidates
    .sort((a, b) => b.total - a.total)
    .slice(0, n)
    .map(({ cacheKey, itemId }) => ({ cacheKey, itemId }));
};

// For each resolved candidate:
//   1. Skip if already in Redis (still warm — nothing to do).
//   2. Fetch the real data from MongoDB based on route type + item ID.
//   3. Store in Redis with the ML-provided TTL.

const warmPrefetchCandidates = async (candidates, routeType, ttl) => {
  // Lazy-load Product to avoid circular deps at module load time
  const Product = require("../models/Product");

  for (const { cacheKey, itemId } of candidates) {
    try {
      // Skip if already cached — no point warming a warm key
      const existing = await cacheGet(cacheKey);
      if (existing !== null) {
        console.log(
          `⚡ PREFETCH SKIP [${routeType}] ${cacheKey} (already warm)`,
        );
        continue;
      }

      let data = null;

      switch (routeType) {
        case "product_single":
          if (itemId) data = await Product.findById(itemId).lean();
          break;

        case "similar_products":
          if (itemId) {
            const product = await Product.findById(itemId).lean();
            if (product) {
              data = await Product.find({
                _id: { $ne: itemId },
                gender: product.gender,
                category: product.category,
              })
                .limit(4)
                .lean();
            }
          }
          break;

        case "best_seller":
          data = await Product.findOne().sort({ rating: -1 }).lean();
          break;

        case "new_arrivals":
          data = await Product.find().sort({ createdAt: -1 }).limit(8).lean();
          break;

        case "products_list": {
          // Cache key encodes the query string — parse it back to run the same query
          const prefix = ROUTE_KEY_PREFIX.products_list;
          const qs = cacheKey.slice(prefix.length);
          const params = Object.fromEntries(new URLSearchParams(qs));
          const query = {};
          if (params.collection) query.collections = params.collection;
          if (params.category) query.category = params.category;
          if (params.gender) query.gender = params.gender;
          if (params.minPrice || params.maxPrice) {
            query.price = {};
            if (params.minPrice) query.price.$gte = Number(params.minPrice);
            if (params.maxPrice) query.price.$lte = Number(params.maxPrice);
          }
          data = await Product.find(query)
            .limit(Number(params.limit) || 0)
            .lean();
          break;
        }

        default:
          continue;
      }

      if (data) {
        await cacheSet(cacheKey, data, ttl);
        console.log(`⚡ PREFETCH WARM [${routeType}] ${cacheKey} TTL:${ttl}s`);
      }
    } catch (err) {
      // Non-critical — prefetch failure must never affect the main response
      console.warn(
        `⚡ PREFETCH FAIL [${routeType}] ${cacheKey}: ${err.message}`,
      );
    }
  }
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

const cacheMiddleware = (type) => {
  return async (req, res, next) => {
    const cacheKey = buildCacheKey(req, type);
    const fallbackTtl = DEFAULT_TTLS[type] || 300;
    const minTtl = MIN_TTLS[type] || 120;
    const startTime = Date.now();
    const pageType = getPageType(req);
    const priceTier = getPriceTier(req);

    // CACHE HIT
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

    // CACHE MISS
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

      // PREFETCH
      // Only run when ML is active and returned prefetch candidates.
      // Resolves route-type labels → actual product cache keys using keyStats, then warms them from MongoDB after the response has already been sent.
      if (mlUsed && prediction.prefetch_routes?.length > 0) {
        const prefetchTtl = ttl; // use same ML-derived TTL for prefetched entries
        setImmediate(() => {
          // Build and flatten candidate lists for all recommended route types
          const allCandidates = prediction.prefetch_routes.flatMap(
            (routeType) =>
              resolveTopCandidates(routeType, 3).map((c) => ({
                ...c,
                routeType,
              })),
          );

          if (allCandidates.length > 0) {
            console.log(
              `⚡ PREFETCH START [${type}] → warming ${allCandidates.length} keys ` +
                `(routes: ${prediction.prefetch_routes.join(", ")})`,
            );
            // Group by routeType and warm each group — non-blocking
            const byRoute = allCandidates.reduce((acc, c) => {
              (acc[c.routeType] = acc[c.routeType] || []).push(c);
              return acc;
            }, {});
            Object.entries(byRoute).forEach(([routeType, candidates]) => {
              warmPrefetchCandidates(candidates, routeType, prefetchTtl).catch(
                () => {},
              );
            });
          }
        });
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = { cacheMiddleware, buildCacheKey, DEFAULT_TTLS };
