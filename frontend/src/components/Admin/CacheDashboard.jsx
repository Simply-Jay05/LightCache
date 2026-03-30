import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import { useNavigate } from "react-router-dom";

const CacheDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [flushing, setFlushing] = useState(false);
  const [retrainHistory, setRetrainHistory] = useState(null);
  const [benchmark, setBenchmark] = useState(null);

  // Auth helpers
  const authHeaders = useCallback(
    () => ({
      headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
    }),
    [],
  );

  const handleUnauthorized = useCallback(() => {
    dispatch(logout());
    navigate("/login", { replace: true });
  }, [dispatch, navigate]);

  const authGet = useCallback(
    async (url) => {
      try {
        return await axios.get(url, authHeaders());
      } catch (err) {
        if (err.response?.status === 401) {
          handleUnauthorized();
          throw err;
        }
        throw err;
      }
    },
    [authHeaders, handleUnauthorized],
  );

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const BASE = import.meta.env.VITE_BACKEND_URL;

      const [statsRes, retrainRes, benchmarkRes] = await Promise.all([
        authGet(`${BASE}/api/cache/stats`),
        authGet(`${BASE}/api/ml/retrain-history`).catch(() => ({
          data: { history: [] },
        })),
        authGet(`${BASE}/api/cache/benchmark`).catch(() => ({ data: null })),
      ]);

      setStats(statsRes.data);
      setRetrainHistory(retrainRes.data);
      setBenchmark(benchmarkRes?.data || null);
    } catch (err) {
      if (err.response?.status === 401) return;
      setError("Failed to load cache data. Make sure Redis is running.");
    } finally {
      setLoading(false);
    }
  }, [authGet]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Actions
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
    } catch (err) {
      if (err.response?.status === 401) return handleUnauthorized();
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
    } catch (err) {
      if (err.response?.status === 401) return handleUnauthorized();
      alert("Flush logs failed");
    }
  };

  // Loading / error states
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

  // Benchmark data helpers
  const CAPACITIES = benchmark?.capacity_results
    ? Object.keys(benchmark.capacity_results)
        .map(Number)
        .sort((a, b) => a - b)
    : [];

  const STRATEGIES = benchmark?.capacity_results?.[CAPACITIES[0]]
    ? Object.keys(benchmark.capacity_results[String(CAPACITIES[0])])
    : [];

  const SUMMARY_CAP = "50";
  const summaryData = benchmark?.capacity_results?.[SUMMARY_CAP];

  const strategyStyle = (name) => {
    if (name === "LFU")
      return { border: "border-blue-400", badge: "bg-blue-100 text-blue-800" };
    if (name === "LRU")
      return { border: "border-gray-300", badge: "bg-gray-100 text-gray-700" };
    if (name.includes("ML"))
      return { border: "border-black", badge: "bg-black text-white" };
    return { border: "border-gray-200", badge: "bg-gray-100 text-gray-600" };
  };

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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

      {/* Tabs — removed A/B tab, benchmark moved to second position */}
      <div className="flex gap-1 mb-6 border-b">
        {["overview", "benchmark", "keys", "logs", "retraining"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
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

      {/* Benchmark */}
      {activeTab === "benchmark" && (
        <div className="space-y-6">
          {!benchmark?.capacity_results ? (
            <div className="border rounded-lg p-10 text-center">
              <div className="text-4xl mb-3">📊</div>
              <h2 className="font-semibold text-lg mb-2">Benchmark Running…</h2>
              <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
                The LRU / LFU / LightCache simulation runs automatically on
                startup once log data is available. Click Refresh in a few
                moments.
              </p>
              <code className="bg-gray-100 px-3 py-2 rounded text-xs block max-w-lg mx-auto mt-2">
                docker compose exec ml-service python benchmark.py
              </code>
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-semibold text-lg">
                  Eviction Strategy Comparison — LRU vs LFU vs LightCache (ML)
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Trace-driven simulation on{" "}
                  {benchmark.total_records?.toLocaleString()} real cache events
                  · Generated{" "}
                  {benchmark.generated_at
                    ? new Date(benchmark.generated_at).toLocaleString()
                    : "—"}
                </p>
              </div>

              {/* Strategy summary cards at capacity=50 */}
              {summaryData && (
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${STRATEGIES.length}, minmax(0,1fr))`,
                  }}
                >
                  {STRATEGIES.map((name) => {
                    const s = strategyStyle(name);
                    const d = summaryData[name];
                    const allRates = STRATEGIES.map(
                      (n) => summaryData[n]?.hit_rate ?? 0,
                    );
                    const best = Math.max(...allRates) === d?.hit_rate;
                    return (
                      <div
                        key={name}
                        className={`border-2 ${s.border} rounded-lg p-5`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="font-bold text-base">{name}</h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${s.badge}`}
                          >
                            {name.includes("ML") ? "Our System" : name}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-sm text-gray-500">
                              Hit Rate
                            </span>
                            <span
                              className={`text-sm font-bold ${best ? "text-green-600" : ""}`}
                            >
                              {d?.hit_rate}%
                            </span>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-sm text-gray-500">
                              Evictions
                            </span>
                            <span className="text-sm font-medium">
                              {d?.evictions?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">
                              TTL Accuracy
                            </span>
                            <span className="text-sm font-medium">
                              {d?.ttl_accuracy}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Hit rate across capacities */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <h2 className="font-semibold">Hit Rate by Cache Capacity</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    LightCache uses ML-predicted TTL — holding high-value items
                    in cache longer.
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Capacity (keys)</th>
                      {STRATEGIES.map((s) => (
                        <th key={s} className="px-4 py-2 text-left">
                          {s}
                        </th>
                      ))}
                      <th className="px-4 py-2 text-left">ML vs LFU Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CAPACITIES.map((cap) => {
                      const row = benchmark.capacity_results[String(cap)];
                      const mlRate = row["ML (LightCache)"]?.hit_rate ?? 0;
                      const lfuRate = row["LFU"]?.hit_rate ?? 0;
                      const diff = (mlRate - lfuRate).toFixed(2);
                      return (
                        <tr key={cap} className="border-t">
                          <td className="px-4 py-2 font-medium">{cap}</td>
                          {STRATEGIES.map((name) => {
                            const hr = row[name]?.hit_rate ?? 0;
                            const best = Math.max(
                              ...STRATEGIES.map((s) => row[s]?.hit_rate ?? 0),
                            );
                            return (
                              <td key={name} className="px-4 py-2">
                                <span
                                  className={
                                    hr === best
                                      ? "text-green-600 font-bold"
                                      : ""
                                  }
                                >
                                  {hr}%
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-4 py-2">
                            <span
                              className={
                                parseFloat(diff) >= 0
                                  ? "text-green-600 font-medium"
                                  : "text-red-500"
                              }
                            >
                              {parseFloat(diff) >= 0 ? "+" : ""}
                              {diff}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Per-route hit rate at cap=50 */}
              {summaryData && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b">
                    <h2 className="font-semibold">
                      Hit Rate by Route (capacity = 50 keys)
                    </h2>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Route</th>
                        {STRATEGIES.map((s) => (
                          <th key={s} className="px-4 py-2 text-left">
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(summaryData[STRATEGIES[0]]?.by_route ?? {})
                        .sort()
                        .map((route) => (
                          <tr key={route} className="border-t">
                            <td className="px-4 py-2 font-mono text-xs">
                              {route}
                            </td>
                            {STRATEGIES.map((name) => {
                              const hr =
                                summaryData[name]?.by_route?.[route]
                                  ?.hit_rate ?? 0;
                              const best = Math.max(
                                ...STRATEGIES.map(
                                  (s) =>
                                    summaryData[s]?.by_route?.[route]
                                      ?.hit_rate ?? 0,
                                ),
                              );
                              return (
                                <td key={name} className="px-4 py-2">
                                  <span
                                    className={
                                      hr === best && hr > 0
                                        ? "text-green-600 font-medium"
                                        : ""
                                    }
                                  >
                                    {hr}%
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Evictions table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <h2 className="font-semibold">Evictions by Capacity</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Evictions occur when the cache is full. LFU evicts
                    least-frequently-used; LRU evicts least-recently-used;
                    LightCache uses ML eviction scores.
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Capacity</th>
                      {STRATEGIES.map((s) => (
                        <th key={s} className="px-4 py-2 text-left">
                          {s} Evictions
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CAPACITIES.map((cap) => {
                      const row = benchmark.capacity_results[String(cap)];
                      return (
                        <tr key={cap} className="border-t">
                          <td className="px-4 py-2 font-medium">{cap}</td>
                          {STRATEGIES.map((name) => (
                            <td key={name} className="px-4 py-2">
                              {(row[name]?.evictions ?? 0).toLocaleString()}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Keys ─────────────────────────────────────────────────────────────── */}
      {activeTab === "keys" && (
        <div className="space-y-6">
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

      {/* Logs */}
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
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${log.event_type === "HIT" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
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

      {/* Retraining */}
      {activeTab === "retraining" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {
                label: "Model Trained At",
                value: retrainHistory?.latest?.retrained_at
                  ? new Date(
                      retrainHistory.latest.retrained_at,
                    ).toLocaleString()
                  : "Initial model",
              },
              {
                label: "Total Retrains",
                value: retrainHistory?.total_retrains ?? 0,
              },
              {
                label: "Latest TTL R²",
                value: retrainHistory?.latest?.ttl_r2 ?? "—",
              },
            ].map((card) => (
              <div key={card.label} className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-xl font-bold mt-1">{card.value}</p>
              </div>
            ))}
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold">Retraining History</h2>
              <p className="text-xs text-gray-500 mt-1">
                Model retrains every <span className="font-medium">3 days</span>{" "}
                on a <span className="font-medium">30-day rolling window</span>
              </p>
            </div>
            {!retrainHistory || retrainHistory.history.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                No retraining history yet. First retrain runs after 3 days or
                when 1,000+ new rows are collected.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    {[
                      "Date",
                      "Rows",
                      "TTL MAE",
                      "TTL R²",
                      "Duration",
                      "Hot Reload",
                    ].map((h) => (
                      <th key={h} className="px-4 py-2 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...retrainHistory.history].reverse().map((entry, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2 text-xs">
                        {new Date(entry.retrained_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        {entry.training_rows?.toLocaleString()}
                      </td>
                      <td className="px-4 py-2">{entry.ttl_mae}s</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            parseFloat(entry.ttl_r2) > 0.3
                              ? "text-green-600"
                              : "text-yellow-600"
                          }
                        >
                          {entry.ttl_r2}
                        </span>
                      </td>
                      <td className="px-4 py-2">{entry.elapsed_seconds}s</td>
                      <td className="px-4 py-2">
                        {entry.hot_reloaded ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            ✓ Yes
                          </span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            ✗ No
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheDashboard;
