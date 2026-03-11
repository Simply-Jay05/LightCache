/**
 LOG CONSUMER

 Reads cache events from the Redis Stream (cache:logs) and appends them to a .jsonl file every FLUSH_INTERVAL_MS milliseconds.
 Each line in the .jsonl file is one training sample for the LightGBM model.
 Run: node scripts/logConsumer.js
 */

require("dotenv").config({ path: "../.env" });
const { createClient } = require("redis");
const fs = require("fs");
const path = require("path");

// Config
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const STREAM_KEY = "cache:logs";
const FLUSH_INTERVAL_MS = 5 * 60 * 1000; // flush every 5 minutes
const LOG_DIR = path.join(__dirname, "../logs");
const LOG_FILE = path.join(LOG_DIR, "cache_events.jsonl");
const CHECKPOINT_FILE = path.join(LOG_DIR, "last_stream_id.txt");

// Setup
if (!fs.existsSync(LOG_DIR)) {
  // Ensure logs directory exists
  fs.mkdirSync(LOG_DIR, { recursive: true });
  console.log(`📁 Created logs directory: ${LOG_DIR}`);
}

let client;
let totalFlushed = 0;

//  Read the last processed stream ID from disk. On first run returns "0" (start of stream).
const getLastId = () => {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return fs.readFileSync(CHECKPOINT_FILE, "utf8").trim();
    }
  } catch {}
  return "0";
};

// Save the last processed stream ID to disk so we never re-process the same entries after a restart.
const saveLastId = (id) => {
  try {
    fs.writeFileSync(CHECKPOINT_FILE, id, "utf8");
  } catch (err) {
    console.error("Failed to save checkpoint:", err.message);
  }
};

// Enrich a raw log entry with computed features the ML model needs.
// This is where we add derived fields that weren't in the original event.
const enrichEntry = (entry) => {
  const hour = parseInt(entry.hour_of_day || "0", 10);
  const weekday = parseInt(entry.weekday || "0", 10);
  const latency = parseFloat(entry.latency_ms || "0");
  const ttl = parseInt(entry.ttl_used || "300", 10);

  // Derived features
  const isWeekend = weekday === 0 || weekday === 6 ? 1 : 0;
  const isPeakHour = hour >= 9 && hour <= 21 ? 1 : 0;

  // Price tier — extracted from cache key if product query includes price filter
  let priceTier = "unknown";
  try {
    const q = JSON.parse(entry.query || "{}");
    if (q.minPrice || q.maxPrice) {
      const max = parseFloat(q.maxPrice || "999");
      if (max <= 30) priceTier = "budget";
      else if (max <= 70) priceTier = "mid";
      else priceTier = "premium";
    }
  } catch {}

  return {
    // Original fields
    event_type: entry.event_type || "",
    cache_key: entry.cache_key || "",
    route_type: entry.route_type || "",
    page_type: entry.page_type || "",
    item_id: entry.item_id || "",
    ttl_used: ttl,
    latency_ms: latency,
    hour_of_day: hour,
    weekday,
    timestamp: parseInt(entry.timestamp || Date.now(), 10),

    // Derived features for ML
    is_weekend: isWeekend,
    is_peak_hour: isPeakHour,
    price_tier: priceTier,
    is_hit: entry.event_type === "HIT" ? 1 : 0,

    // A hit means the TTL was long enough — a miss means it expired too soon
    ttl_label: entry.event_type === "HIT" ? ttl : Math.max(ttl * 0.5, 60),
  };
};

// Main flush loop
const flushLogs = async () => {
  let lastId = getLastId();
  let newEntries = 0;

  try {
    // Read all new entries since last checkpoint. XRANGE returns entries in ascending order
    const entries = await client.xRange(
      STREAM_KEY,
      lastId === "0" ? "-" : lastId,
      "+",
    );

    if (entries.length === 0) {
      console.log(`💤 No new log entries (last id: ${lastId})`);
      return;
    }

    // Skip the first entry if it matches lastId exactly (already processed)
    const toProcess =
      lastId === "0" ? entries : entries.filter((e) => e.id !== lastId);

    if (toProcess.length === 0) {
      console.log(`💤 No new log entries since last flush`);
      return;
    }

    // Build .jsonl lines
    const lines = toProcess.map((entry) => {
      const enriched = enrichEntry(entry.message);
      return JSON.stringify(enriched);
    });

    // Append to file
    fs.appendFileSync(LOG_FILE, lines.join("\n") + "\n", "utf8");

    // Update checkpoint to last processed ID
    const newLastId = toProcess[toProcess.length - 1].id;
    saveLastId(newLastId);

    newEntries = toProcess.length;
    totalFlushed += newEntries;

    console.log(
      `✅ Flushed ${newEntries} entries → ${LOG_FILE}` +
        ` (total: ${totalFlushed}, last_id: ${newLastId})`,
    );
  } catch (err) {
    console.error("❌ Flush error:", err.message);
  }
};

// Stats printer
const printStats = async () => {
  try {
    // Count lines in .jsonl file
    if (!fs.existsSync(LOG_FILE)) {
      console.log("📊 Stats: no log file yet");
      return;
    }
    const content = fs.readFileSync(LOG_FILE, "utf8");
    const lines = content.split("\n").filter((l) => l.trim());
    const hits = lines.filter((l) => l.includes('"is_hit":1')).length;
    const misses = lines.filter((l) => l.includes('"is_hit":0')).length;
    const hitRate =
      lines.length > 0 ? ((hits / lines.length) * 100).toFixed(1) : "0.0";

    // Count stream length
    const streamLen = await client.xLen(STREAM_KEY).catch(() => "?");

    console.log("─".repeat(55));
    console.log(`📊 Log Stats`);
    console.log(`   Total entries in file : ${lines.length}`);
    console.log(`   Hits                  : ${hits}`);
    console.log(`   Misses                : ${misses}`);
    console.log(`   Hit rate              : ${hitRate}%`);
    console.log(`   Stream backlog        : ${streamLen} entries`);
    console.log(`   Log file              : ${LOG_FILE}`);
    console.log("─".repeat(55));
  } catch (err) {
    console.error("Stats error:", err.message);
  }
};

// Boot
const start = async () => {
  console.log("LightCache Log Consumer starting...");
  console.log(`   Redis  : ${REDIS_URL}`);
  console.log(`   Stream : ${STREAM_KEY}`);
  console.log(`   Output : ${LOG_FILE}`);
  console.log(`   Flush  : every ${FLUSH_INTERVAL_MS / 1000}s`);
  console.log("");

  // Connect to Redis
  client = createClient({ url: REDIS_URL });
  client.on("error", (err) => console.error("Redis error:", err.message));
  await client.connect();
  console.log("✅ Connected to Redis");

  // Run immediately on start
  await flushLogs();
  await printStats();

  // Then run on interval
  setInterval(async () => {
    await flushLogs();
    await printStats();
  }, FLUSH_INTERVAL_MS);

  console.log(
    `\n  Next flush in ${FLUSH_INTERVAL_MS / 1000}s — press Ctrl+C to stop\n`,
  );
};

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n Shutting down log consumer...");
  await flushLogs(); // Final flush before exit
  await client.quit();
  process.exit(0);
});

start().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
