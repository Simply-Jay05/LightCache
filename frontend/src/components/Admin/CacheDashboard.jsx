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

  // ML control state
  const [mlMode, setMlMode] = useState("redis_only");
  const [mlReadiness, setMlReadiness] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [mlActionMsg, setMlActionMsg] = useState(null); // { type: "ok"|"err", text }
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkMsg, setBenchmarkMsg] = useState(null); // { type: "ok"|"err", text }

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

      const [statsRes, retrainRes, benchmarkRes, modeRes] = await Promise.all([
        authGet(`${BASE}/api/cache/stats`),
        authGet(`${BASE}/api/ml/retrain-history`).catch(() => ({
          data: { history: [] },
        })),
        authGet(`${BASE}/api/cache/benchmark`).catch(() => ({ data: null })),
        authGet(`${BASE}/api/cache/mode`).catch(() => ({
          data: { mode: "redis_only", readiness: null },
        })),
      ]);

      setStats(statsRes.data);
      setRetrainHistory(retrainRes.data);
      setBenchmark(benchmarkRes?.data || null);
      setMlMode(modeRes.data.mode || "redis_only");
      setMlReadiness(modeRes.data.readiness || null);
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

  const handleRunBenchmark = async () => {
    setBenchmarkRunning(true);
    setBenchmarkMsg(null);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/cache/benchmark/run`,
        {},
        authHeaders(),
      );
      // Update benchmark state directly with the fresh results
      setBenchmark(res.data);
      setBenchmarkMsg({
        type: "ok",
        text: "Benchmark updated with latest log data.",
      });
    } catch (err) {
      if (err.response?.status === 401) return handleUnauthorized();
      const detail =
        err.response?.data?.message || err.message || "Unknown error";
      setBenchmarkMsg({ type: "err", text: `Benchmark failed: ${detail}` });
    } finally {
      setBenchmarkRunning(false);
      setTimeout(() => setBenchmarkMsg(null), 8000);
    }
  };
  const showMlMsg = (type, text) => {
    setMlActionMsg({ type, text });
    setTimeout(() => setMlActionMsg(null), 6000);
  };

  const handleModeToggle = async (newMode) => {
    if (newMode === "ml_active" && !mlReadiness?.model_exists) {
      showMlMsg(
        "err",
        "No trained model found. Train the model first before activating ML mode.",
      );
      return;
    }
    try {
      const BASE = import.meta.env.VITE_BACKEND_URL;
      await axios.post(
        `${BASE}/api/cache/mode`,
        { mode: newMode },
        authHeaders(),
      );
      setMlMode(newMode);
      showMlMsg(
        "ok",
        newMode === "ml_active"
          ? "ML mode activated — dynamic TTL predictions are now live."
          : "Switched to plain Redis caching. ML service will not be consulted.",
      );
    } catch (err) {
      if (err.response?.status === 401) return handleUnauthorized();
      showMlMsg("err", "Failed to switch mode.");
    }
  };

  const handleSimulate = async () => {
    if (
      !window.confirm(
        "Generate synthetic training rows based on your real captured traffic?\n\n" +
          "This augments cache_events.jsonl to meet the minimum row threshold. " +
          "The synthetic rows mirror your real users' distribution — not random locust patterns.",
      )
    )
      return;
    setSimulating(true);
    setMlActionMsg(null);
    try {
      const BASE = import.meta.env.VITE_BACKEND_URL;
      const res = await axios.post(
        `${BASE}/api/ml/simulate-from-real`,
        {},
        authHeaders(),
      );
      const d = res.data;
      showMlMsg(
        "ok",
        `Done. ${d.real_rows} real rows + ${d.generated} simulated = ${d.total} total. ` +
          (d.ready
            ? "Ready to train!"
            : `Still need ${1000 - d.total} more rows.`),
      );
      fetchData();
    } catch (err) {
      if (err.response?.status === 401) return handleUnauthorized();
      showMlMsg("err", err.response?.data?.message || "Simulation failed.");
    } finally {
      setSimulating(false);
    }
  };

  const handleTriggerRetrain = async () => {
    if (
      !window.confirm(
        "Train the ML model now using current data?\n\n" +
          "This may take 1-3 minutes. The old model stays active until training completes.",
      )
    )
      return;
    setRetraining(true);
    setMlActionMsg(null);
    try {
      const BASE = import.meta.env.VITE_BACKEND_URL;
      const res = await axios.post(
        `${BASE}/api/ml/trigger-retrain`,
        {},
        authHeaders(),
      );
      showMlMsg(
        "ok",
        `Model trained on ${res.data.training_rows?.toLocaleString()} rows. ` +
          "You can now activate ML mode.",
      );
      fetchData();
    } catch (err) {
      if (err.response?.status === 401) return handleUnauthorized();
      showMlMsg(
        "err",
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Training failed.",
      );
    } finally {
      setRetraining(false);
    }
  };

  const handleResetTrainingData = async () => {
    if (
      !window.confirm(
        "RESET ALL TRAINING DATA?\n\n" +
          "This will permanently delete:\n" +
          "• cache_events.jsonl (all captured events)\n" +
          "• The trained model and metadata\n" +
          "• Retrain history\n\n" +
          "ML mode will be switched back to plain Redis. " +
          "Use this to clear locust-simulated data before going live with real users.\n\n" +
          "Type OK to confirm.",
      )
    )
      return;
    try {
      const BASE = import.meta.env.VITE_BACKEND_URL;
      const res = await axios.post(
        `${BASE}/api/cache/reset-training-data`,
        {},
        authHeaders(),
      );
      setMlMode("redis_only");
      showMlMsg(
        "ok",
        `Reset complete. Deleted: ${res.data.deleted?.join(", ") || "all artefacts"}. System now uses plain Redis caching.`,
      );
      fetchData();
    } catch (err) {
      if (err.response?.status === 401) return handleUnauthorized();
      showMlMsg("err", err.response?.data?.message || "Reset failed.");
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

  // Use the largest available capacity for the summary cards.
  // benchmark.py now tests [5, 8, 10, 20] by default (was [10,20,30,50]).
  const SUMMARY_CAP = CAPACITIES.length
    ? String(Math.max(...CAPACITIES))
    : "20";
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {[
          "overview",
          "benchmark",
          "keys",
          "logs",
          "retraining",
          "ml-control",
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors relative ${
              activeTab === tab
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            {tab === "ml-control" ? "ML Control" : tab}
            {tab === "ml-control" && (
              <span
                className={`ml-1.5 inline-block w-2 h-2 rounded-full ${
                  mlMode === "ml_active" ? "bg-green-500" : "bg-gray-300"
                }`}
              />
            )}
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-lg">
                    Eviction Strategy Comparison — LRU vs LFU vs LightCache (ML)
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Trace-driven simulation on{" "}
                    {benchmark.total_records?.toLocaleString()} real cache
                    events · Generated{" "}
                    {benchmark.generated_at
                      ? new Date(benchmark.generated_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button
                    onClick={handleRunBenchmark}
                    disabled={benchmarkRunning}
                    className="text-sm px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                  >
                    {benchmarkRunning ? "Running…" : "Re-run Benchmark"}
                  </button>
                  {benchmarkMsg && (
                    <p
                      className={`text-xs ${
                        benchmarkMsg.type === "ok"
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {benchmarkMsg.text}
                    </p>
                  )}
                </div>
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
                              Eviction Waste
                            </span>
                            {(() => {
                              const eq =
                                benchmark?.eviction_quality?.[SUMMARY_CAP]?.[
                                  name
                                ];
                              const waste = eq?.eviction_waste_pct ?? null;
                              const allWastes = STRATEGIES.map(
                                (n) =>
                                  benchmark?.eviction_quality?.[SUMMARY_CAP]?.[
                                    n
                                  ]?.eviction_waste_pct ?? Infinity,
                              );
                              const bestWaste = Math.min(...allWastes);
                              return (
                                <span
                                  className={`text-sm font-medium ${
                                    waste !== null && waste === bestWaste
                                      ? "text-green-600 font-bold"
                                      : ""
                                  }`}
                                >
                                  {waste !== null ? `${waste}%` : "—"}
                                </span>
                              );
                            })()}
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
                    LightCache uses ML eviction scores — evicting low-demand
                    keys first. Differences are most visible at low capacities
                    (5–10 keys) where pressure is highest.
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
                      Hit Rate by Route (capacity = {SUMMARY_CAP} keys)
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
              {/* Eviction quality — new metric from fixed benchmark */}
              {benchmark?.eviction_quality && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b">
                    <h2 className="font-semibold">
                      Eviction Quality by Capacity
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      <strong>Lower waste% is better.</strong> Waste% = % of
                      evictions where a high-demand key (score &gt; 120) was
                      dropped. LightCache should evict only low-score keys;
                      LRU/LFU evict without demand awareness.
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Capacity</th>
                        {STRATEGIES.map((s) => (
                          <th key={s} className="px-4 py-2 text-left">
                            {s} Waste%
                          </th>
                        ))}
                        <th className="px-4 py-2 text-left">ML vs LRU Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CAPACITIES.map((cap) => {
                        const row = benchmark.eviction_quality[String(cap)];
                        if (!row) return null;
                        const allWastes = STRATEGIES.map(
                          (s) => row[s]?.eviction_waste_pct ?? Infinity,
                        );
                        const bestWaste = Math.min(...allWastes);
                        const mlWaste =
                          row["ML (LightCache)"]?.eviction_waste_pct ?? 0;
                        const lruWaste = row["LRU"]?.eviction_waste_pct ?? 0;
                        const delta = (lruWaste - mlWaste).toFixed(1);
                        return (
                          <tr key={cap} className="border-t">
                            <td className="px-4 py-2 font-medium">{cap}</td>
                            {STRATEGIES.map((name) => {
                              const w = row[name]?.eviction_waste_pct ?? 0;
                              return (
                                <td key={name} className="px-4 py-2">
                                  <span
                                    className={
                                      w === bestWaste
                                        ? "text-green-600 font-bold"
                                        : ""
                                    }
                                  >
                                    {w}%
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-4 py-2">
                              <span
                                className={
                                  parseFloat(delta) > 0
                                    ? "text-green-600 font-medium"
                                    : "text-red-500"
                                }
                              >
                                {parseFloat(delta) >= 0 ? "+" : ""}
                                {delta}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
      {/* ML Control */}
      {activeTab === "ml-control" && (
        <div className="space-y-6">
          {/* Action message banner */}
          {mlActionMsg && (
            <div
              className={`px-4 py-3 rounded-lg text-sm font-medium ${
                mlActionMsg.type === "ok"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {mlActionMsg.type === "ok" ? "✓ " : "✗ "}
              {mlActionMsg.text}
            </div>
          )}

          {/* Auto-suggest banner when data threshold met but ML not active */}
          {mlReadiness?.ready &&
            !mlReadiness?.model_exists &&
            mlMode === "redis_only" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Enough data collected to train the model
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {mlReadiness.row_count?.toLocaleString()} rows captured —
                    click "Train model now" to proceed.
                  </p>
                </div>
                <button
                  onClick={handleTriggerRetrain}
                  disabled={retraining}
                  className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {retraining ? "Training..." : "Train model now"}
                </button>
              </div>
            )}

          {mlReadiness?.model_exists && mlMode === "redis_only" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Model is trained and ready — ML mode is off
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Last trained:{" "}
                  {mlReadiness.last_trained
                    ? new Date(mlReadiness.last_trained).toLocaleString()
                    : "unknown"}
                  . Activate ML mode to enable dynamic TTL predictions.
                </p>
              </div>
              <button
                onClick={() => handleModeToggle("ml_active")}
                className="ml-4 px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 whitespace-nowrap"
              >
                Activate ML mode
              </button>
            </div>
          )}

          {/* Mode toggle */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold">Caching mode</h2>
              <p className="text-xs text-gray-500 mt-1">
                Switch between plain Redis caching and ML-powered dynamic TTL
                predictions. Changes take effect immediately — no restart
                needed.
              </p>
            </div>
            <div className="p-4 flex gap-3">
              <button
                onClick={() => handleModeToggle("redis_only")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-left transition-all ${
                  mlMode === "redis_only"
                    ? "border-black bg-black text-white"
                    : "border-gray-200 hover:border-gray-400 text-gray-700"
                }`}
              >
                <div className="font-medium text-sm">Plain Redis</div>
                <div
                  className={`text-xs mt-0.5 ${mlMode === "redis_only" ? "text-gray-300" : "text-gray-500"}`}
                >
                  Fixed TTLs, no ML service calls. Use during initial
                  deployment.
                </div>
              </button>
              <button
                onClick={() => handleModeToggle("ml_active")}
                disabled={!mlReadiness?.model_exists}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  mlMode === "ml_active"
                    ? "border-black bg-black text-white"
                    : "border-gray-200 hover:border-gray-400 text-gray-700"
                }`}
              >
                <div className="font-medium text-sm flex items-center gap-2">
                  ML Active
                  {mlMode === "ml_active" && (
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                  )}
                </div>
                <div
                  className={`text-xs mt-0.5 ${mlMode === "ml_active" ? "text-gray-300" : "text-gray-500"}`}
                >
                  {mlReadiness?.model_exists
                    ? "Dynamic TTL + eviction scores from trained model."
                    : "Disabled — train a model first."}
                </div>
              </button>
            </div>
          </div>

          {/* Data readiness */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold">Training data readiness</h2>
              <p className="text-xs text-gray-500 mt-1">
                The model needs at least{" "}
                {mlReadiness?.min_rows?.toLocaleString() ?? "1,000"} rows of
                real cache events to train on.
              </p>
            </div>
            <div className="p-4 space-y-4">
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600">
                    {mlReadiness?.row_count?.toLocaleString() ?? 0} rows
                    captured
                  </span>
                  <span
                    className={`font-medium ${mlReadiness?.ready ? "text-green-600" : "text-gray-500"}`}
                  >
                    {mlReadiness?.ready
                      ? "✓ Ready to train"
                      : `${mlReadiness?.pct ?? 0}% of threshold`}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      mlReadiness?.ready ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{
                      width: `${Math.min(mlReadiness?.pct ?? 0, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span>
                    {mlReadiness?.min_rows?.toLocaleString() ?? "1,000"} min
                  </span>
                </div>
              </div>

              {/* Status chips */}
              <div className="flex gap-3 flex-wrap">
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    mlReadiness?.model_exists
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {mlReadiness?.model_exists
                    ? "✓ Model exists"
                    : "✗ No model yet"}
                </div>
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    mlReadiness?.ready
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {mlReadiness?.ready
                    ? "✓ Data threshold met"
                    : "Collecting data..."}
                </div>
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    mlMode === "ml_active"
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {mlMode === "ml_active" ? "● ML mode on" : "○ ML mode off"}
                </div>
              </div>

              {mlReadiness?.last_trained && (
                <p className="text-xs text-gray-500">
                  Last trained:{" "}
                  {new Date(mlReadiness.last_trained).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold">Actions</h2>
              <p className="text-xs text-gray-500 mt-1">
                All actions run on the server — no command line needed.
              </p>
            </div>
            <div className="p-4 space-y-3">
              {/* Simulate from real data */}
              <div className="flex items-start justify-between gap-4 py-3 border-b">
                <div>
                  <p className="text-sm font-medium">Simulate from real data</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    If real rows exist but are below threshold, generate
                    synthetic rows that mirror your actual users' route and
                    timing distribution. Safe to run — augments your real data,
                    doesn't replace it.
                  </p>
                </div>
                <button
                  onClick={handleSimulate}
                  disabled={
                    simulating ||
                    !mlReadiness ||
                    (mlReadiness.row_count ?? 0) < 10
                  }
                  className="shrink-0 px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {simulating ? "Simulating..." : "Simulate"}
                </button>
              </div>

              {/* Train now */}
              <div className="flex items-start justify-between gap-4 py-3 border-b">
                <div>
                  <p className="text-sm font-medium">Train model now</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Force an immediate training run using all available data.
                    The existing model stays active until training completes,
                    then hot-reloads with zero downtime. Takes 1–3 minutes.
                  </p>
                </div>
                <button
                  onClick={handleTriggerRetrain}
                  disabled={retraining || !mlReadiness?.ready}
                  className="shrink-0 px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {retraining ? "Training..." : "Train now"}
                </button>
              </div>

              {/* Reset training data */}
              <div className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-red-600">
                    Reset all training data
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Permanently deletes cache_events.jsonl, the trained model,
                    and retrain history. Use this to wipe locust-simulated data
                    before going live so the model retrains on real users only.
                    ML mode is automatically switched off.
                  </p>
                </div>
                <button
                  onClick={handleResetTrainingData}
                  className="shrink-0 px-4 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                >
                  Reset data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheDashboard;
