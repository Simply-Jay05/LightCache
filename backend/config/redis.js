const { createClient } = require("redis");

let client = null;
let isConnected = false;

const connectRedis = async () => {
  try {
    client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    client.on("error", (err) => {
      // Only log once to avoid console spam
      if (isConnected) {
        console.warn("⚠️  Redis connection lost:", err.message);
        isConnected = false;
      }
    });

    client.on("reconnecting", () => {
      console.log("🔄 Redis reconnecting...");
    });

    await client.connect();
    isConnected = true;
    console.log("✅ Redis connected successfully");
  } catch (err) {
    console.warn("⚠️  Redis not available — caching disabled:", err.message);
    console.warn("   Start Redis with: redis-server");
    isConnected = false;
    client = null;
  }
};

// Safe get — returns null if Redis is down
const cacheGet = async (key) => {
  if (!client || !isConnected) return null;
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

// Safe set — silently fails if Redis is down
const cacheSet = async (key, value, ttlSeconds = 300) => {
  if (!client || !isConnected) return;
  try {
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Silent fail — cache is best-effort
  }
};

// Safe delete
const cacheDel = async (key) => {
  if (!client || !isConnected) return;
  try {
    await client.del(key);
  } catch {
    // Silent fail
  }
};

// Delete all keys matching a pattern (e.g. "products:*")
const cacheDelPattern = async (pattern) => {
  if (!client || !isConnected) return;
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch {
    // Silent fail
  }
};

// Log a cache event to Redis Stream for ML training data
const logCacheEvent = async (eventData) => {
  if (!client || !isConnected) return;
  try {
    await client.xAdd("cache:logs", "*", {
      ...eventData,
      timestamp: Date.now().toString(),
    });
  } catch {
    // Silent fail — logs are best-effort
  }
};

// Get raw Redis client for stats endpoint
const getClient = () => client;
const getIsConnected = () => isConnected;

module.exports = {
  connectRedis,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  logCacheEvent,
  getClient,
  getIsConnected,
};
