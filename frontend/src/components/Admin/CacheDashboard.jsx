import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
});

const CacheDashboard = () => {
  const [stats, setStats] = useState(null);
  const [ab, setAb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [flushing, setFlushing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, abRes] = await Promise.all([
        axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/cache/stats`,
          authHeaders(),
        ),
        axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/cache/ab`,
          authHeaders(),
        ),
      ]);
      setStats(statsRes.data);
      setAb(abRes.data);
    } catch (err) {
      setError("Failed to load cache data. Make sure Redis is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // auto-refresh every 15s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleFlush = async () => {
    if (!window.confirm("Flush all product cache keys?")) return;
    setFlushing(true);
    try {
      const res = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/cache/flush`,
        authHeaders(),
      );
      alert(res.data.message);
      fetchData();
    } catch {
      alert("Flush failed");
    } finally {
      setFlushing(false);
    }
  };

  const handleFlushLogs = async () => {
    if (
      !window.confirm(
        "Clear all cache logs from Redis Stream? This cannot be undone.",
      )
    )
      return;
    try {
      const res = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/cache/flush-logs`,
        authHeaders(),
      );
      alert(res.data.message);
      fetchData();
    } catch {
      alert("Flush logs failed");
    }
  };

  if (loading)
    return (
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Cache Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-4 border rounded-lg animate-pulse bg-gray-100 h-24"
            />
          ))}
        </div>
      </div>
    );

  if (error)
    return (
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Cache Dashboard</h1>
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={fetchData}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );

  const { summary, by_route, by_hour, cached_keys, top_keys, recent_logs } =
    stats;
  const maxHour = Math.max(...by_hour);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cache Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Auto-refreshes every 15s</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
          >
            Refresh
          </button>
          <button
            onClick={handleFlush}
            disabled={flushing}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm disabled:opacity-50"
          >
            {flushing ? "Flushing..." : "Flush Cache"}
          </button>
          <button
            onClick={handleFlushLogs}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Requests",
            value: summary.total_requests.toLocaleString(),
          },
          { label: "Hit Rate", value: summary.hit_rate, highlight: true },
          { label: "Cached Keys", value: summary.cached_keys },
          { label: "ML Usage Rate", value: summary.ml_usage_rate },
        ].map((card) => (
          <div key={card.label} className="p-4 border rounded-lg">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p
              className={`text-2xl font-bold mt-1 ${card.highlight ? "text-green-600" : ""}`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Hits", value: summary.hits.toLocaleString() },
          { label: "Misses", value: summary.misses.toLocaleString() },
          { label: "Avg Hit Latency", value: summary.avg_hit_latency },
          { label: "Avg Miss Latency", value: summary.avg_miss_latency },
        ].map((card) => (
          <div key={card.label} className="p-4 border rounded-lg">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {["overview", "ab-comparison", "keys", "logs"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            {tab.replace("-", " ")}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ─────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Route breakdown */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold">Performance by Route</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {["Route", "Hits", "Misses", "Hit Rate", "Avg Latency"].map(
                    (h) => (
                      <th key={h} className="px-4 py-2 text-left">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {by_route.map((r) => (
                  <tr key={r.route} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{r.route}</td>
                    <td className="px-4 py-2 text-green-600">{r.hits}</td>
                    <td className="px-4 py-2 text-red-500">{r.misses}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full"
                            style={{ width: `${r.hit_rate}%` }}
                          />
                        </div>
                        <span>{r.hit_rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">{r.avg_latency}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Hourly traffic */}
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-4">Requests by Hour of Day</h2>
            <div className="flex items-end gap-1 h-24">
              {by_hour.map((count, hour) => (
                <div
                  key={hour}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-black rounded-sm"
                    style={{
                      height:
                        maxHour > 0 ? `${(count / maxHour) * 80}px` : "2px",
                      minHeight: count > 0 ? "2px" : "0",
                    }}
                  />
                  {hour % 4 === 0 && (
                    <span className="text-xs text-gray-400">{hour}h</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: A/B Comparison ───────────────────────────────────────────────── */}
      {activeTab === "ab-comparison" && ab && (
        <div className="space-y-6">
          {/* A/B Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Total Log Entries",
                value: ab.summary.total_entries.toLocaleString(),
              },
              {
                label: "ML-Predicted TTL",
                value: ab.summary.ml_entries.toLocaleString(),
              },
              {
                label: "Fixed TTL",
                value: ab.summary.fallback_entries.toLocaleString(),
              },
              { label: "ML Coverage", value: ab.summary.ml_coverage },
            ].map((card) => (
              <div key={card.label} className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Per-route A/B table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold">ML vs Fixed TTL — Per Route</h2>
              <p className="text-xs text-gray-500 mt-1">
                TTL Difference = ML avg TTL minus fixed TTL. Positive = ML
                caches longer.
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {[
                    "Route",
                    "Fixed TTL",
                    "ML Avg TTL",
                    "Difference",
                    "Fixed Hit Rate",
                    "ML Hit Rate",
                  ].map((h) => (
                    <th key={h} className="px-4 py-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ab.by_route.map((r) => (
                  <tr key={r.route} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{r.route}</td>
                    <td className="px-4 py-2">{r.fixed_ttl}s</td>
                    <td className="px-4 py-2">
                      {r.ml_avg_ttl !== null ? `${r.ml_avg_ttl}s` : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {r.ttl_difference !== null ? (
                        <span
                          className={
                            r.ttl_difference > 0
                              ? "text-green-600"
                              : "text-red-500"
                          }
                        >
                          {r.ttl_difference > 0 ? "+" : ""}
                          {r.ttl_difference}s
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2">{r.fixed_hit_rate}%</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          parseFloat(r.ml_hit_rate) >
                          parseFloat(r.fixed_hit_rate)
                            ? "text-green-600 font-medium"
                            : ""
                        }
                      >
                        {r.ml_hit_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Keys ─────────────────────────────────────────────────────────── */}
      {activeTab === "keys" && (
        <div className="space-y-6">
          {/* Top accessed keys */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold">Most Accessed Cache Keys</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {["Cache Key", "Total Requests", "Hits", "Hit Rate"].map(
                    (h) => (
                      <th key={h} className="px-4 py-2 text-left">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {top_keys.map((k) => (
                  <tr key={k.key} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs truncate max-w-xs">
                      {k.key}
                    </td>
                    <td className="px-4 py-2">{k.total}</td>
                    <td className="px-4 py-2 text-green-600">{k.hits}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full"
                            style={{ width: `${k.hit_rate}%` }}
                          />
                        </div>
                        <span>{k.hit_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Live Redis keys with TTL */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold">Live Redis Keys with TTL</h2>
              <p className="text-xs text-gray-500 mt-1">
                Showing up to 50 keys
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Key</th>
                  <th className="px-4 py-2 text-left">TTL Remaining</th>
                </tr>
              </thead>
              <tbody>
                {cached_keys.map((k) => (
                  <tr key={k.key} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{k.key}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          k.ttl < 30 ? "text-red-500" : "text-gray-700"
                        }
                      >
                        {k.ttl}s
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Logs ─────────────────────────────────────────────────────────── */}
      {activeTab === "logs" && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-semibold">Recent Cache Events</h2>
            <p className="text-xs text-gray-500 mt-1">
              Last 30 events, newest first
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {["Event", "Route", "Key", "TTL", "ML", "Latency", "Time"].map(
                  (h) => (
                    <th key={h} className="px-4 py-2 text-left">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {recent_logs.map((log, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        log.event_type === "HIT"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {log.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {log.route_type}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs truncate max-w-[200px]">
                    {log.cache_key}
                  </td>
                  <td className="px-4 py-2">{log.ttl_used}s</td>
                  <td className="px-4 py-2">
                    {log.ml_used ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        ML
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">fixed</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{log.latency_ms}ms</td>
                  <td className="px-4 py-2 text-xs text-gray-400">
                    {log.timestamp
                      ? new Date(log.timestamp).toLocaleTimeString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CacheDashboard;
