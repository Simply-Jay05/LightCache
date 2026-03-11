/**
 LOG INSPECTOR

 Quick utility to inspect what's been collected in cache_events.jsonl
 Run any time to check your training data quality.

 Usage:
 node scripts/inspectLogs.js
 node scripts/inspectLogs.js --tail 20   (show last 20 entries)
 */

const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "../logs/cache_events.jsonl");
const args = process.argv.slice(2);
const tailCount = args.includes("--tail")
  ? parseInt(args[args.indexOf("--tail") + 1], 10)
  : null;

if (!fs.existsSync(LOG_FILE)) {
  console.log("❌ No log file found yet.");
  console.log(`   Expected: ${LOG_FILE}`);
  console.log("   Make sure logConsumer.js has run and received some traffic.");
  process.exit(0);
}

const content = fs.readFileSync(LOG_FILE, "utf8");
const lines = content.split("\n").filter((l) => l.trim());

if (lines.length === 0) {
  console.log("❌ Log file is empty.");
  process.exit(0);
}

const entries = lines
  .map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  })
  .filter(Boolean);

// Summary
const hits = entries.filter((e) => e.is_hit === 1);
const misses = entries.filter((e) => e.is_hit === 0);
const hitRate = ((hits.length / entries.length) * 100).toFixed(1);

// Average latency by type
const avgLatency = (arr) =>
  arr.length > 0
    ? (arr.reduce((s, e) => s + e.latency_ms, 0) / arr.length).toFixed(1)
    : "0.0";

// Breakdown by route type
const byRoute = {};
entries.forEach((e) => {
  const r = e.route_type || "unknown";
  if (!byRoute[r]) byRoute[r] = { hits: 0, misses: 0 };
  if (e.is_hit) byRoute[r].hits++;
  else byRoute[r].misses++;
});

// Breakdown by hour
const byHour = {};
entries.forEach((e) => {
  const h = e.hour_of_day;
  if (!byHour[h]) byHour[h] = 0;
  byHour[h]++;
});

// TTL distribution
const ttls = entries.map((e) => e.ttl_used).filter((t) => t > 0);
const avgTtl =
  ttls.length > 0
    ? (ttls.reduce((a, b) => a + b, 0) / ttls.length).toFixed(0)
    : "0";

console.log("═".repeat(55));
console.log("  LightCache — Training Data Inspector");
console.log("═".repeat(55));
console.log(`  File        : ${LOG_FILE}`);
console.log(`  Total rows  : ${entries.length}`);
console.log(`  Hits        : ${hits.length} (${hitRate}%)`);
console.log(`  Misses      : ${misses.length}`);
console.log(`  Avg latency : ${avgLatency(entries)} ms`);
console.log(`    → hits    : ${avgLatency(hits)} ms`);
console.log(`    → misses  : ${avgLatency(misses)} ms`);
console.log(`  Avg TTL     : ${avgTtl}s`);

console.log("\n  By route type:");
Object.entries(byRoute).forEach(([route, counts]) => {
  const total = counts.hits + counts.misses;
  const rate = ((counts.hits / total) * 100).toFixed(0);
  console.log(
    `    ${route.padEnd(20)} hits: ${counts.hits}, misses: ${counts.misses} (${rate}% hit)`,
  );
});

console.log("\n  By hour of day (request count):");
const hours = Object.entries(byHour).sort(
  (a, b) => Number(a[0]) - Number(b[0]),
);
hours.forEach(([hour, count]) => {
  const bar = "█".repeat(Math.min(Math.ceil(count / 2), 30));
  console.log(`    ${String(hour).padStart(2, "0")}:00  ${bar} ${count}`);
});

// Tail
if (tailCount) {
  console.log(`\n  Last ${tailCount} entries:`);
  console.log("─".repeat(55));
  entries.slice(-tailCount).forEach((e, i) => {
    const ts = new Date(e.timestamp).toLocaleTimeString();
    const hit = e.is_hit ? "🟢 HIT " : "🔴 MISS";
    console.log(
      `  ${hit} [${e.route_type}] ${e.cache_key} | ${e.latency_ms}ms | ${ts}`,
    );
  });
}

console.log("═".repeat(55));
console.log(`\n  ✅ Ready for ML training when entries > 1000`);
console.log(`  Current: ${entries.length} / 1000 minimum\n`);
