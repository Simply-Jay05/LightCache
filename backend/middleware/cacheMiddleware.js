const { cacheGet, cacheSet, logCacheEvent } = require("../config/redis");
const {
  getPrediction,
  updateKeyStats,
  getKeyStats,
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

// Minimum TTL floor — prevents pathologically short TTLs in production
const MIN_TTLS = {
  products_list: 120,
  product_single: 180,
  best_seller: 90,
  new_arrivals: 120,
  similar_products: 180,
};

const ROUTE_KEY_PREFIX = {
  products_list: "products:list:",
  product_single: "products:single:",
  best_seller: "products:best-seller",
  new_arrivals: "products:new-arrivals",
  similar_products: "products:similar:",
};

const ITEM_ID_ROUTES = new Set(["product_single", "similar_products"]);
const SINGLETON_ROUTES = new Set(["best_seller", "new_arrivals"]);

const TTL_MIN = 30;
const TTL_MAX = 1800;

function intervalAnchoredTtl(mlTtl, intervalMeanSecs, accessCount, minTtl) {
  // Only anchor to interval after first access — first access has no interval data
  if (accessCount > 1 && intervalMeanSecs > 0) {
    const ivTtl = Math.min(Math.round(intervalMeanSecs * 1.3), TTL_MAX);
    // Take the larger: model prediction or interval anchor
    const anchored = Math.max(mlTtl, ivTtl);
    return Math.max(minTtl, Math.min(anchored, TTL_MAX));
  }
  return Math.max(minTtl, Math.min(mlTtl, TTL_MAX));
}

//  Composite eviction score

//  Lower score = better eviction candidate (should be dropped first).
//  Combines three signals:
//  1. ML eviction score (0–200): model's demand prediction
//  2. Recency decay: exp(-age / half_life) where half_life = 40% of key TTL
//  3. TTL remaining ratio: avoid evicting keys about to expire naturally

function compositeEvictionScore(meta, nowMs) {
  const { evictionScore, ttlSeconds, lastAccessMs } = meta;
  const halfLifeMs = Math.max(30_000, ttlSeconds * 1000 * 0.4);
  const ageMs = Math.max(0, nowMs - lastAccessMs);
  const recency = Math.exp(-ageMs / halfLifeMs);
  const expireMs = lastAccessMs + ttlSeconds * 1000;
  const ttlRemMs = Math.max(0, expireMs - nowMs);
  const ttlRemRatio = ttlRemMs / Math.max(ttlSeconds * 1000, 1);
  return evictionScore * recency * (0.3 + 0.7 * ttlRemRatio);
}

// In-memory eviction metadata store
// Tracks evictionScore, ttlSeconds, lastAccessMs for every ML-cached key.
// Used by smartEvict() and TTL refresh on hit.
// Map: cacheKey → { evictionScore, ttlSeconds, lastAccessMs }
const evictionMeta = new Map();

function registerForEviction(cacheKey, evictionScore, ttlSeconds) {
  evictionMeta.set(cacheKey, {
    evictionScore,
    ttlSeconds,
    lastAccessMs: Date.now(),
  });
}

function refreshEvictionMeta(cacheKey, newScore) {
  const existing = evictionMeta.get(cacheKey);
  if (existing) {
    existing.lastAccessMs = Date.now();
    if (newScore != null) existing.evictionScore = newScore;
  }
}

// Smart eviction — evict keys with lowest composite score until
// evictionMeta.size <= targetCount. Call this proactively to enforce
// a soft cap on cached keys using ML demand awareness instead of
// Redis's default LRU.
// @param {number} targetCount - evict until this many keys remain

async function smartEvict(targetCount = 0) {
  const client = getClient();
  if (!client || evictionMeta.size === 0) return;

  const nowMs = Date.now();
  const scored = [];
  for (const [key, meta] of evictionMeta.entries()) {
    scored.push({ key, score: compositeEvictionScore(meta, nowMs) });
  }
  scored.sort((a, b) => a.score - b.score); // ascending — lowest first

  let evicted = 0;
  for (const { key, score } of scored) {
    if (evictionMeta.size <= targetCount) break;
    try {
      const exists = await client.exists(key);
      if (exists) {
        await client.del(key);
        await client.del(`meta:${key}`);
        console.log(
          `🗑️  SMART EVICT [composite score: ${score.toFixed(2)}] ${key}`,
        );
      }
      evictionMeta.delete(key);
      evicted++;
    } catch (err) {
      console.warn(`Smart evict failed for ${key}: ${err.message}`);
    }
  }
  if (evicted > 0) {
    console.log(`🗑️  SMART EVICT complete — removed ${evicted} keys`);
  }
}

// Prefetch helpers
const resolveTopCandidates = (routeType, n = 3) => {
  const prefix = ROUTE_KEY_PREFIX[routeType];
  if (!prefix) return [];
  if (SINGLETON_ROUTES.has(routeType))
    return [{ cacheKey: prefix, itemId: null }];

  const candidates = [];
  for (const [key, stats] of keyStats.entries()) {
    if (key.startsWith(prefix)) {
      const itemId = ITEM_ID_ROUTES.has(routeType)
        ? key.slice(prefix.length)
        : null;
      candidates.push({ cacheKey: key, itemId, total: stats.total });
    }
  }
  return candidates
    .sort((a, b) => b.total - a.total)
    .slice(0, n)
    .map(({ cacheKey, itemId }) => ({ cacheKey, itemId }));
};

const warmPrefetchCandidates = async (candidates, routeType, ttl) => {
  const Product = require("../models/Product");
  for (const { cacheKey, itemId } of candidates) {
    try {
      const existing = await cacheGet(cacheKey);
      if (existing !== null) continue;
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
      console.warn(
        `⚡ PREFETCH FAIL [${routeType}] ${cacheKey}: ${err.message}`,
      );
    }
  }
};

// Key helpers
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

// Redis meta helpers
const setKeyMeta = async (cacheKey, ttl, mlUsed, rawTtl, evictionScore) => {
  const client = getClient();
  if (!client) return;
  try {
    await client.setEx(
      `meta:${cacheKey}`,
      ttl + 60, // slightly longer than the data key so meta outlasts it
      JSON.stringify({
        ml_used: mlUsed,
        ttl_used: ttl,
        raw_ml_ttl: rawTtl,
        eviction_score: evictionScore,
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

// TTL refresh on HIT

// Mirrors benchmark MLCache.get() TTL refresh:
// self.cache[key] = now_ms + self.ttls.get(key, 300) * 1000

// Resets the Redis TTL of a cached key to its original ML-predicted TTL.
// Without this, a popular key inserted with TTL=800s expires 800s after
// the first access regardless of how many subsequent hits it receives.
//  With refresh, every hit resets the countdown — the key stays alive
//  as long as it keeps being accessed.

const refreshKeyTtl = async (cacheKey, ttlSeconds) => {
  const client = getClient();
  if (!client || !ttlSeconds) return;
  try {
    await client.expire(cacheKey, ttlSeconds);
  } catch {
    /* non-critical */
  }
};

// Main middleware
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

      const meta = await getKeyMeta(cacheKey);
      const mlUsed = meta?.ml_used ?? false;
      const ttlUsed = meta?.ttl_used ?? fallbackTtl;

      if (mlUsed) {
        // BENCHMARK STRATEGY 2: TTL refresh on hit
        // Extend the key's Redis TTL back to its original predicted value.
        // A key accessed 20 times should stay alive 20× longer than one
        // accessed once — this is what the benchmark MLCache does implicitly.
        await refreshKeyTtl(cacheKey, ttlUsed);
        refreshEvictionMeta(cacheKey, meta?.eviction_score ?? null);

        // Fire background score refresh — non-blocking, never delays response
        const stats = getKeyStats(cacheKey);
        getPrediction({
          route_type: type,
          page_type: pageType,
          item_id: req.params.id || "",
          cache_key: cacheKey,
          ttl_used: ttlUsed,
          latency_ms: latency,
          is_hit: true,
          price_tier: priceTier,
          key_access_count: stats.key_access_count,
          key_hit_rate: stats.key_hit_rate,
          time_since_last_request: stats.time_since_last_request,
          request_interval_mean: stats.request_interval_mean,
          request_interval_std: stats.request_interval_std,
        })
          .then((freshPred) => {
            if (freshPred?.eviction_score != null) {
              refreshEvictionMeta(cacheKey, freshPred.eviction_score);
            }
          })
          .catch(() => {});
      }

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
        is_hit: "1",
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

      const stats = getKeyStats(cacheKey);

      const prediction = await getPrediction({
        route_type: type,
        page_type: pageType,
        item_id: req.params.id || "",
        cache_key: cacheKey,
        ttl_used: fallbackTtl,
        latency_ms: latency,
        is_hit: false,
        price_tier: priceTier,
        key_access_count: stats.key_access_count,
        key_hit_rate: stats.key_hit_rate,
        time_since_last_request: stats.time_since_last_request,
        request_interval_mean: stats.request_interval_mean,
        request_interval_std: stats.request_interval_std,
      });

      if (prediction?.ttl_seconds) {
        rawMlTtl = prediction.ttl_seconds;
        evictScore = prediction.eviction_score ?? 50;
        mlUsed = true;

        // BENCHMARK STRATEGY 1: Interval-anchored TTL
        // Apply max(ml_ttl, 1.3 × interval_mean) so popular keys survive
        // until the next actual request arrives.
        // Mirrors benchmark MLCache._interval_ttl() and the simulate() line:
        //   iv_ttl = max(TTL_MIN, min(int(interval_mean * 1.3), TTL_MAX))
        //   ttl    = max(ttl, iv_ttl) if ac > 1 else ttl
        const intervalMean =
          prediction.interval_mean_seconds ??
          stats.request_interval_mean ??
          300;

        ttl = intervalAnchoredTtl(
          rawMlTtl,
          intervalMean,
          stats.key_access_count,
          minTtl,
        );
      }

      // Store data and metadata in Redis
      await cacheSet(cacheKey, data, ttl);
      await setKeyMeta(cacheKey, ttl, mlUsed, rawMlTtl, evictScore);

      // BENCHMARK STRATEGY 3: Register for smart eviction
      // Track this key in evictionMeta so smartEvict() can use composite
      // scoring instead of Redis's default LRU when proactively trimming.
      if (mlUsed && evictScore !== null) {
        registerForEviction(cacheKey, evictScore, ttl);
      }

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
        is_hit: "0",
      });

      const ttlSource = mlUsed
        ? `ML:${ttl}s (raw:${rawMlTtl}s, iv-anchored)`
        : `fallback:${ttl}s`;
      console.log(
        `🔴 CACHE MISS [${type}] ${cacheKey} (${latency}ms) → TTL ${ttlSource}`,
      );

      // PREFETCH
      if (mlUsed && prediction.prefetch_routes?.length > 0) {
        setImmediate(() => {
          const allCandidates = prediction.prefetch_routes.flatMap(
            (routeType) =>
              resolveTopCandidates(routeType, 3).map((c) => ({
                ...c,
                routeType,
              })),
          );
          if (allCandidates.length > 0) {
            const byRoute = allCandidates.reduce((acc, c) => {
              (acc[c.routeType] = acc[c.routeType] || []).push(c);
              return acc;
            }, {});
            Object.entries(byRoute).forEach(([routeType, candidates]) => {
              warmPrefetchCandidates(candidates, routeType, ttl).catch(
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

module.exports = { cacheMiddleware, buildCacheKey, DEFAULT_TTLS, smartEvict };
