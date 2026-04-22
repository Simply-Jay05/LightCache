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

const ROUTE_KEY_PREFIX = {
  products_list: "products:list:",
  product_single: "products:single:",
  best_seller: "products:best-seller",
  new_arrivals: "products:new-arrivals",
  similar_products: "products:similar:",
};

const ITEM_ID_ROUTES = new Set(["product_single", "similar_products"]);
const SINGLETON_ROUTES = new Set(["best_seller", "new_arrivals"]);

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// ML-driven eviction tracking
// In-memory map: cacheKey → { evictionScore, ttlSeconds, lastAccessMs }
// Updated on every MISS (insertion) and HIT (score refresh).
// Used by smartEvict() to pick the best candidate to drop from Redis.
const evictionMeta = new Map();

// Called on cache MISS: registers a new key with its ML eviction metadata.

const registerForEviction = (cacheKey, evictionScore, ttlSeconds) => {
  evictionMeta.set(cacheKey, {
    evictionScore,
    ttlSeconds,
    lastAccessMs: Date.now(),
  });
};

/**
 * Called on cache HIT: refreshes last access time AND eviction score.
 * This mirrors what LRU does implicitly (recency refresh) but backed
 * by the ML demand signal.
 */
const refreshEvictionMeta = (cacheKey, newScore) => {
  const existing = evictionMeta.get(cacheKey);
  if (existing) {
    existing.lastAccessMs = Date.now();
    existing.evictionScore = newScore ?? existing.evictionScore;
  }
};

/**
 * Composite eviction score — same formula as benchmark.py _evict():
 *   ML_score × recency_decay × ttl_remaining_ratio
 *
 * Lower score = better eviction candidate.
 * Computed locally (no HTTP call) for speed.
 */
const compositeEvictionScore = (meta, nowMs) => {
  const { evictionScore, ttlSeconds, lastAccessMs } = meta;
  const halfLifeMs = Math.max(30_000, ttlSeconds * 1000 * 0.4);
  const ageMs = Math.max(0, nowMs - lastAccessMs);
  const recency = Math.exp(-ageMs / halfLifeMs);
  const expireMs = lastAccessMs + ttlSeconds * 1000;
  const ttlRemMs = Math.max(0, expireMs - nowMs);
  const ttlRemRatio = ttlRemMs / Math.max(ttlSeconds * 1000, 1);
  return evictionScore * recency * (0.3 + 0.7 * ttlRemRatio);
};

/**
 * ML-driven eviction: scans evictionMeta, calls Redis to verify the key
 * still exists, then deletes the one with the lowest composite score.
 *
 * Call this proactively when you want to trim the cache — e.g. if you
 * track a soft cap on cached keys and want to enforce it.
 *
 * @param {number} targetCount - evict until evictionMeta.size <= targetCount
 */
const smartEvict = async (targetCount = 0) => {
  const client = getClient();
  if (!client || evictionMeta.size === 0) return;

  const nowMs = Date.now();

  // Score all tracked keys
  const scored = [];
  for (const [key, meta] of evictionMeta.entries()) {
    scored.push({ key, score: compositeEvictionScore(meta, nowMs) });
  }

  // Sort ascending — lowest score = best eviction candidate
  scored.sort((a, b) => a.score - b.score);

  let evicted = 0;
  for (const { key } of scored) {
    if (evictionMeta.size <= targetCount) break;
    try {
      // Verify key still exists in Redis before evicting
      const exists = await client.exists(key);
      if (exists) {
        await client.del(key);
        await client.del(`meta:${key}`);
        console.log(
          `🗑️  SMART EVICT [ML] ${key} (score: ${scored.find((s) => s.key === key)?.score?.toFixed(2)})`,
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
};

// Prefetch helpers
const resolveTopCandidates = (routeType, n = 3) => {
  const prefix = ROUTE_KEY_PREFIX[routeType];
  if (!prefix) return [];

  if (SINGLETON_ROUTES.has(routeType)) {
    return [{ cacheKey: prefix, itemId: null }];
  }

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

// Meta storage in Redis (for HIT recovery of ML metadata)
const setKeyMeta = async (cacheKey, ttl, mlUsed, rawTtl, evictionScore) => {
  const client = getClient();
  if (!client) return;
  try {
    await client.setEx(
      `meta:${cacheKey}`,
      ttl,
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

      // Score refresh on HIT
      // Re-score the key so that evictionMeta reflects current access patterns.
      // Without this, a key accessed 50 times still has its stale insertion score.
      // This is the same mechanism that gives LRU its recency advantage — we
      // replicate it while also updating the ML demand estimate.
      if (mlUsed) {
        // Get a fresh prediction with updated hit stats for this key
        const stats = keyStats.get(cacheKey);
        const accessCnt = stats?.total ?? 1;
        const hitCnt = stats?.hits ?? 0;
        const hitRate = accessCnt > 0 ? hitCnt / accessCnt : 0.5;

        getPrediction({
          route_type: type,
          page_type: pageType,
          item_id: req.params.id || "",
          cache_key: cacheKey,
          ttl_used: ttlUsed,
          latency_ms: latency,
          is_hit: true,
          price_tier: priceTier,
          key_access_count: accessCnt,
          key_hit_rate: hitRate,
        })
          .then((freshPred) => {
            if (freshPred?.eviction_score != null) {
              refreshEvictionMeta(cacheKey, freshPred.eviction_score);
            } else {
              // No fresh prediction — at least refresh the access timestamp
              refreshEvictionMeta(cacheKey, null);
            }
          })
          .catch(() => {
            // Non-critical — never block the HIT response
            refreshEvictionMeta(cacheKey, null);
          });
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

      const stats = keyStats.get(cacheKey);
      const accessCnt = stats?.total ?? 1;
      const hitCnt = stats?.hits ?? 0;
      const hitRate = accessCnt > 0 ? hitCnt / accessCnt : 0.5;

      const prediction = await getPrediction({
        route_type: type,
        page_type: pageType,
        item_id: req.params.id || "",
        cache_key: cacheKey,
        ttl_used: fallbackTtl,
        latency_ms: latency,
        is_hit: false,
        price_tier: priceTier,
        key_access_count: accessCnt,
        key_hit_rate: hitRate,
      });

      if (prediction?.ttl_seconds) {
        rawMlTtl = prediction.ttl_seconds;
        ttl = Math.max(prediction.ttl_seconds, minTtl);
        evictScore = prediction.eviction_score ?? 50;
        mlUsed = true;
      }

      // Store data + metadata in Redis
      await cacheSet(cacheKey, data, ttl);
      await setKeyMeta(cacheKey, ttl, mlUsed, rawMlTtl, evictScore);

      // Register in evictionMeta for ML-driven eviction decisions
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
      });

      const ttlSource = mlUsed
        ? `ML:${ttl}s (raw:${rawMlTtl}s, min:${minTtl}s)`
        : `fallback:${ttl}s`;

      console.log(
        `🔴 CACHE MISS [${type}] ${cacheKey} (${latency}ms) → TTL ${ttlSource}`,
      );

      // Prefetch
      if (mlUsed && prediction.prefetch_routes?.length > 0) {
        const prefetchTtl = ttl;
        setImmediate(() => {
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

module.exports = { cacheMiddleware, buildCacheKey, DEFAULT_TTLS, smartEvict };
