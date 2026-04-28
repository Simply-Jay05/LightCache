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
  const [modelMetrics, setModelMetrics] = useState(null);

  // ML control state
  const [mlMode, setMlMode] = useState("redis_only");
  const [mlReadiness, setMlReadiness] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [mlActionMsg, setMlActionMsg] = useState(null);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkMsg, setBenchmarkMsg] = useState(null);

  const [evaluation, setEvaluation] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [deletingIndex, setDeletingIndex] = useState(null);

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

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const BASE = import.meta.env.VITE_BACKEND_URL;

      const [statsRes, retrainRes, benchmarkRes, modeRes, metricsRes] =
        await Promise.all([
          authGet(`${BASE}/api/cache/stats`),
          authGet(`${BASE}/api/ml/retrain-history`).catch(() => ({
            data: { history: [] },
          })),
          authGet(`${BASE}/api/cache/benchmark`).catch(() => ({ data: null })),
          authGet(`${BASE}/api/cache/mode`).catch(() => ({
            data: { mode: "redis_only", readiness: null },
          })),
          authGet(`${BASE}/api/ml/model-metrics`).catch(() => ({ data: null })),
        ]);

      setStats(statsRes.data);
      setRetrainHistory(retrainRes.data);
      setBenchmark(benchmarkRes?.data || null);
      setMlMode(modeRes.data.mode || "redis_only");
      setMlReadiness(modeRes.data.readiness || null);
      setModelMetrics(metricsRes?.data || null);

      authGet(`${BASE}/api/cache/snapshots`)
        .then((r) => setSnapshots(r.data?.snapshots || []))
        .catch(() => {});

      authGet(`${BASE}/api/cache/chapter4-export`)
        .then((r) => setExportData(r.data))
        .catch(() => {});
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

  const handleSaveSnapshot = async () => {
    if (!snapshotLabel.trim()) {
      setSnapshotMsg({
        type: "err",
        text: "Enter a label (e.g. 'Session 1 Fixed TTL')",
      });
      return;
    }
    setSavingSnapshot(true);
    setSnapshotMsg(null);
    try {
      const BASE = import.meta.env.VITE_BACKEND_URL;
      const res = await axios.post(
        `${BASE}/api/cache/snapshot`,
        { label: snapshotLabel.trim(), mode: mlMode },
        authHeaders(),
      );
      setSnapshotMsg({
        type: "ok",
        text: `Snapshot saved: ${res.data.snapshot?.hit_rate_pct}% hit rate, ${res.data.snapshot?.avg_rt_ms}ms RT`,
      });
      setSnapshotLabel("");
      fetchData();
    } catch (err) {
      if (err.response?.status === 401) return handleUnauthorized();
      setSnapshotMsg({
        type: "err",
        text: err.response?.data?.message || "Snapshot failed.",
      });
    } finally {
      setSavingSnapshot(false);
      setTimeout(() => setSnapshotMsg(null), 8000);
    }
  };

  const handleClearSnapshots = async () => {
    if (
      !window.confirm("Clear all evaluation snapshots? This cannot be undone.")
    )
      return;
    try {
      const BASE = import.meta.env.VITE_BACKEND_URL;
      await axios.delete(`${BASE}/api/cache/snapshots`, authHeaders());
      setSnapshots([]);
      setExportData(null);
      fetchData();
    } catch (err) {
      if (err.response?.status === 401) return handleUnauthorized();
    }
  };

  // Deletes a single snapshot by its index in the list.
  // Uses DELETE /api/cache/snapshots/:index — the backend resolves
  // the index to the exact Redis sorted-set member and removes it.
  const handleDeleteSnapshot = async (index) => {
    if (!window.confirm("Delete this snapshot? This cannot be undone.")) return;
    setDeletingIndex(index);
    try {
      const BASE = import.meta.env.VITE_BACKEND_URL;
      await axios.delete(`${BASE}/api/cache/snapshots/${index}`, authHeaders());
      // Optimistically remove from local state, then re-fetch to sync
      setSnapshots((prev) => prev.filter((_, i) => i !== index));
      fetchData();
    } catch (err) {
      if (err.response?.status === 401) return handleUnauthorized();
      alert(err.response?.data?.message || "Failed to delete snapshot.");
    } finally {
      setDeletingIndex(null);
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
          ? "ML mode activated"
          : "Switched to plain Redis",
      );
    } catch (err) {
      if (err.response?.status === 401) return handleUnauthorized();
      showMlMsg("err", "Failed to switch mode.");
    }
  };

  const handleSimulate = async () => {
    if (!window.confirm("Generate synthetic training rows?")) return;
    setSimulating(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/ml/simulate-from-real`,
        {},
        authHeaders(),
      );
      showMlMsg("ok", `Done. Total: ${res.data.total}`);
      fetchData();
    } catch {
      showMlMsg("err", "Simulation failed.");
    } finally {
      setSimulating(false);
    }
  };

  const handleTriggerRetrain = async () => {
    if (!window.confirm("Train the ML model now?")) return;
    setRetraining(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/ml/trigger-retrain`,
        {},
        authHeaders(),
      );
      showMlMsg("ok", "Model trained successfully.");
      fetchData();
    } catch {
      showMlMsg("err", "Training failed.");
    } finally {
      setRetraining(false);
    }
  };

  const handleResetTrainingData = async () => {
    if (!window.confirm("RESET ALL TRAINING DATA?")) return;
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/cache/reset-training-data`,
        {},
        authHeaders(),
      );
      setMlMode("redis_only");
      showMlMsg("ok", "Reset complete.");
      fetchData();
    } catch {
      showMlMsg("err", "Reset failed.");
    }
  };

  const formatDate = (val) => {
    if (!val) return "—";
    const d = new Date(val);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString();
  };

  const formatAccuracy = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return "—";
    return num > 1 ? `${num.toFixed(1)}%` : `${(num * 100).toFixed(1)}%`;
  };

  const formatMae = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return "—";
    return `${num.toFixed(2)}s`;
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  const { summary, by_route, by_hour, cached_keys, top_keys, recent_logs } =
    stats;

  const safeLogs = Array.isArray(recent_logs) ? recent_logs : [];
  const maxHour = by_hour?.length ? Math.max(...by_hour) : 0;

  const CAPACITIES = benchmark?.capacity_results
    ? Object.keys(benchmark.capacity_results)
        .map(Number)
        .sort((a, b) => a - b)
    : [];
  const STRATEGIES = benchmark?.capacity_results?.[CAPACITIES[0]]
    ? Object.keys(benchmark.capacity_results[String(CAPACITIES[0])])
    : [];
  const SUMMARY_CAP = CAPACITIES.length
    ? String(Math.max(...CAPACITIES))
    : "20";
  const summaryData = benchmark?.capacity_results?.[SUMMARY_CAP];

  const strategyStyle = (name) => {
    if (name === "LFU")
      return { border: "border-blue-400", badge: "bg-blue-100 text-blue-800" };
    if (name === "LRU")
      return { border: "border-gray-300", badge: "bg-gray-100 text-gray-700" };
    return { border: "border-black", badge: "bg-black text-white" };
  };

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "benchmark", label: "Benchmark" },
    { id: "evaluation", label: "Evaluation" },
    { id: "keys", label: "Keys" },
    { id: "logs", label: "Logs" },
    { id: "retraining", label: "Retraining" },
    { id: "model-metrics", label: "Model Metrics" },
    { id: "ml-control", label: "ML Control" },
  ];

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
            className="px-4 py-2 border rounded text-sm"
          >
            Refresh
          </button>
          <button
            onClick={handleFlush}
            disabled={flushing}
            className="px-4 py-2 bg-yellow-500 text-white rounded text-sm"
          >
            {flushing ? "Flushing…" : "Flush Cache"}
          </button>
          <button
            onClick={handleFlushLogs}
            className="px-4 py-2 bg-red-500 text-white rounded text-sm"
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
          {
            label: "Hit Rate",
            value: summary.hit_rate,
            color: "text-green-600",
          },
          { label: "ML Usage Rate", value: summary.ml_usage_rate },
          { label: "Cached Keys", value: summary.cached_keys },
        ].map((c) => (
          <div key={c.label} className="p-4 border rounded-lg">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color || ""}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Hits", value: summary.hits?.toLocaleString() },
          { label: "Misses", value: summary.misses?.toLocaleString() },
          { label: "Avg Hit Latency", value: summary.avg_hit_latency },
          { label: "Avg Miss Latency", value: summary.avg_miss_latency },
        ].map((c) => (
          <div key={c.label} className="p-4 border rounded-lg">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* ML Mode Banner */}
      <div
        className={`mb-4 px-4 py-2 rounded text-sm font-medium flex items-center gap-2 ${mlMode === "ml_active" ? "bg-green-50 border border-green-200 text-green-800" : "bg-gray-50 border text-gray-600"}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${mlMode === "ml_active" ? "bg-green-500" : "bg-gray-400"}`}
        />
        {mlMode === "ml_active"
          ? "LightCache ML Mode Active — dynamic TTLs in use"
          : "Fixed TTL Mode (Redis Only)"}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
              activeTab === tab.id
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.id === "ml-control" && mlMode === "ml_active" && (
              <span className="ml-1 w-2 h-2 inline-block bg-green-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold">Performance by Route</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
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
                {(by_route || []).map((r) => (
                  <tr key={r.route} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{r.route}</td>
                    <td className="px-4 py-2 text-green-600 font-medium">
                      {r.hits}
                    </td>
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
            <h2 className="font-semibold mb-3">Requests by Hour</h2>
            <div className="flex items-end gap-1 h-24">
              {(by_hour || []).map((count, hour) => (
                <div
                  key={hour}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-black rounded-t"
                    style={{
                      height:
                        maxHour > 0 ? `${(count / maxHour) * 80}px` : "2px",
                    }}
                    title={`Hour ${hour}: ${count} requests`}
                  />
                  {hour % 6 === 0 && (
                    <span className="text-xs text-gray-400">{hour}h</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── BENCHMARK ── */}
      {activeTab === "benchmark" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-lg">Strategy Comparison</h2>
              {benchmark?.generated_at && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Last run: {new Date(benchmark.generated_at).toLocaleString()}{" "}
                  · {benchmark.total_records?.toLocaleString()} records ·{" "}
                  {benchmark.using_real_model
                    ? "Real ML model"
                    : "Heuristic fallback"}
                </p>
              )}
            </div>
            <button
              onClick={handleRunBenchmark}
              disabled={benchmarkRunning}
              className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {benchmarkRunning ? "Running…" : "Re-run Benchmark"}
            </button>
          </div>
          {benchmarkMsg && (
            <p
              className={`text-sm ${benchmarkMsg.type === "ok" ? "text-green-600" : "text-red-500"}`}
            >
              {benchmarkMsg.text}
            </p>
          )}

          {!benchmark ? (
            <div className="border rounded-lg p-8 text-center text-gray-400">
              <p>No benchmark data yet.</p>
              <p className="text-sm mt-1">
                Click "Re-run Benchmark" or run <code>python benchmark.py</code>{" "}
                in the ml-service.
              </p>
            </div>
          ) : (
            <>
              {summaryData && (
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(summaryData).map(([name, data]) => {
                    const s = strategyStyle(name);
                    return (
                      <div
                        key={name}
                        className={`border-2 ${s.border} rounded-lg p-4`}
                      >
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}
                        >
                          {name}
                        </span>
                        <p className="text-3xl font-bold mt-2">
                          {data.hit_rate}%
                        </p>
                        <p className="text-xs text-gray-500">hit rate</p>
                        <p className="text-sm mt-1">
                          {data.avg_latency_ms}ms avg latency
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <h3 className="font-semibold text-sm">
                    Hit Rate by Cache Capacity
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Capacity</th>
                      {STRATEGIES.map((s) => (
                        <th key={s} className="px-4 py-2 text-left">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CAPACITIES.map((cap) => {
                      const row = benchmark.capacity_results[String(cap)];
                      const mbLabel =
                        benchmark.capacity_mb_labels?.[cap] || `${cap} keys`;
                      return (
                        <tr key={cap} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{mbLabel}</td>
                          {STRATEGIES.map((s) => (
                            <td
                              key={s}
                              className={`px-4 py-2 ${s === "ML (LightCache)" ? "font-bold text-green-700" : ""}`}
                            >
                              {row?.[s]?.hit_rate ?? "—"}%
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {benchmark.chapter4_table_c && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    vs Base Paper (IRCache, Pramudia et al. 2025)
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {[
                      {
                        label: "LightCache avg",
                        value: `${benchmark.chapter4_table_c.averages?.LightCache?.toFixed(2)}%`,
                        bold: true,
                      },
                      {
                        label: "vs RR ceiling (62.06%)",
                        value: `${benchmark.chapter4_table_c.lightcache_vs_base_paper_rr > 0 ? "+" : ""}${benchmark.chapter4_table_c.lightcache_vs_base_paper_rr?.toFixed(2)}%`,
                      },
                      {
                        label: "vs LRU base paper",
                        value: `${benchmark.chapter4_table_c.lightcache_vs_lru > 0 ? "+" : ""}${benchmark.chapter4_table_c.lightcache_vs_lru?.toFixed(2)}%`,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="bg-white border border-blue-100 rounded p-3"
                      >
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p
                          className={`text-xl font-bold ${item.bold ? "text-blue-700" : ""}`}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── EVALUATION ── */}
      {activeTab === "evaluation" && (
        <div className="space-y-6">
          <div className="border rounded-lg p-5 bg-gray-50">
            <h2 className="font-semibold text-lg">Chapter 4 Evaluation</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl">
              Collects Response Time, Throughput, and Hit Ratio data for thesis
              Chapter 4. Mirrors the evaluation methodology of the base paper
              (Pramudia et al., 2025 — IRCache). Run the store in each mode,
              then save a snapshot after each session.
            </p>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold">Save Evaluation Snapshot</h2>
              <p className="text-xs text-gray-500 mt-1">
                Current mode:{" "}
                <span
                  className={`font-semibold ${mlMode === "ml_active" ? "text-green-700" : "text-gray-700"}`}
                >
                  {mlMode === "ml_active" ? "LightCache ML" : "Fixed TTL Redis"}
                </span>
                . Browse the store, then click Save to record RT, Throughput,
                and Hit Rate for this session.
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={snapshotLabel}
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                  placeholder='e.g. "Session 1" or "Session 2"'
                  className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                />
                <button
                  onClick={handleSaveSnapshot}
                  disabled={savingSnapshot}
                  className="px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
                >
                  {savingSnapshot ? "Saving…" : "Save Snapshot"}
                </button>
                {snapshots.length > 0 && (
                  <button
                    onClick={handleClearSnapshots}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {snapshotMsg && (
                <p
                  className={`text-xs font-medium ${snapshotMsg.type === "ok" ? "text-green-700" : "text-red-600"}`}
                >
                  {snapshotMsg.type === "ok" ? "✓ " : "✗ "}
                  {snapshotMsg.text}
                </p>
              )}
            </div>
          </div>

          {snapshots.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h2 className="font-semibold">
                  Saved Snapshots ({snapshots.length})
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Each row is one evaluation session. Builds Table A and Table
                  B. Use the Delete button to remove a single bad session
                  without clearing all snapshots.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      {[
                        "Label",
                        "Mode",
                        "Requests",
                        "Hit Rate",
                        "Avg RT (ms)",
                        "Throughput (KB/s)",
                        "Captured",
                        "", // delete column — no header text
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="px-4 py-2 text-left whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map((s, i) => (
                      <tr
                        key={i}
                        className={`border-t ${deletingIndex === i ? "opacity-40" : ""}`}
                      >
                        <td className="px-4 py-2 font-medium">{s.label}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              s.mode === "ml_active"
                                ? "bg-black text-white"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {s.mode === "ml_active"
                              ? "LightCache ML"
                              : "Fixed TTL"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {s.total_requests?.toLocaleString() ?? "—"}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`font-bold ${s.hit_rate_pct >= 50 ? "text-green-600" : "text-yellow-600"}`}
                          >
                            {s.hit_rate_pct ?? "—"}%
                          </span>
                        </td>
                        <td className="px-4 py-2">{s.avg_rt_ms ?? "—"}</td>
                        <td className="px-4 py-2">{s.throughput_kbs ?? "—"}</td>
                        <td className="px-4 py-2 text-xs text-gray-400">
                          {formatDate(s.captured_at)}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleDeleteSnapshot(i)}
                            disabled={deletingIndex !== null}
                            className="text-xs text-red-400 hover:text-red-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {deletingIndex === i ? "Deleting…" : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {exportData && (
            <>
              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                  <h2 className="font-semibold text-blue-900">
                    Table A — Average Response Time (ms)
                  </h2>
                  <p className="text-xs text-blue-600 mt-1">
                    Mirrors IRCache Table 3. Base paper avg RT reduction:{" "}
                    <strong>63.78%</strong> (cache vs no-cache).
                  </p>
                </div>
                {exportData.table_a?.rows?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="px-4 py-2 text-left">Session</th>
                          <th className="px-4 py-2 text-left">
                            Fixed TTL Redis (ms)
                          </th>
                          <th className="px-4 py-2 text-left">
                            LightCache ML (ms)
                          </th>
                          <th className="px-4 py-2 text-left">
                            RT Reduction (%)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {exportData.table_a.rows.map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-4 py-2 font-medium">
                              {row.label}
                            </td>
                            <td className="px-4 py-2">
                              {row.fixed_ttl_rt_ms ?? "—"}
                            </td>
                            <td className="px-4 py-2">
                              {row.lightcache_rt_ms ?? "—"}
                            </td>
                            <td className="px-4 py-2">
                              {row.rt_reduction_pct !== null &&
                              row.rt_reduction_pct !== undefined ? (
                                <span
                                  className={`font-bold ${row.rt_reduction_pct > 0 ? "text-green-600" : "text-red-500"}`}
                                >
                                  {row.rt_reduction_pct > 0 ? "+" : ""}
                                  {row.rt_reduction_pct}%
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                        {exportData.table_a.avg_rt_reduction_pct !==
                          undefined && (
                          <tr className="border-t bg-gray-50 font-semibold">
                            <td className="px-4 py-2">Average</td>
                            <td className="px-4 py-2">—</td>
                            <td className="px-4 py-2">—</td>
                            <td className="px-4 py-2 text-green-700">
                              +{exportData.table_a.avg_rt_reduction_pct}%
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-gray-400 text-sm">
                    No snapshots yet. Save sessions in both Fixed TTL and
                    LightCache ML modes.
                  </div>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
                  <h2 className="font-semibold text-purple-900">
                    Table B — Average Throughput (KB/s)
                  </h2>
                  <p className="text-xs text-purple-600 mt-1">
                    Mirrors IRCache Table 4. Base paper avg throughput increase:{" "}
                    <strong>32.84%</strong> (cache vs no-cache).
                  </p>
                </div>
                {exportData.table_b?.rows?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="px-4 py-2 text-left">Session</th>
                          <th className="px-4 py-2 text-left">
                            Fixed TTL Redis (KB/s)
                          </th>
                          <th className="px-4 py-2 text-left">
                            LightCache ML (KB/s)
                          </th>
                          <th className="px-4 py-2 text-left">
                            TH Increase (%)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {exportData.table_b.rows.map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-4 py-2 font-medium">
                              {row.label}
                            </td>
                            <td className="px-4 py-2">
                              {row.fixed_ttl_th_kbs ?? "—"}
                            </td>
                            <td className="px-4 py-2">
                              {row.lightcache_th_kbs ?? "—"}
                            </td>
                            <td className="px-4 py-2">
                              {row.th_increase_pct !== null &&
                              row.th_increase_pct !== undefined ? (
                                <span
                                  className={`font-bold ${row.th_increase_pct > 0 ? "text-green-600" : "text-red-500"}`}
                                >
                                  {row.th_increase_pct > 0 ? "+" : ""}
                                  {row.th_increase_pct}%
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                        {exportData.table_b.avg_th_increase_pct !==
                          undefined && (
                          <tr className="border-t bg-gray-50 font-semibold">
                            <td className="px-4 py-2">Average</td>
                            <td className="px-4 py-2">—</td>
                            <td className="px-4 py-2">—</td>
                            <td className="px-4 py-2 text-green-700">
                              +{exportData.table_b.avg_th_increase_pct}%
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-gray-400 text-sm">
                    No snapshots yet. Save sessions in both Fixed TTL and
                    LightCache ML modes.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/*  Keys  */}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              {
                label: "Last Trained",
                value: retrainHistory?.latest?.retrained_at
                  ? new Date(
                      retrainHistory.latest.retrained_at,
                    ).toLocaleDateString()
                  : "—",
                sub: retrainHistory?.latest?.retrained_at
                  ? new Date(
                      retrainHistory.latest.retrained_at,
                    ).toLocaleTimeString()
                  : "Initial model",
              },
              {
                label: "Total Retrains",
                value: retrainHistory?.total_retrains ?? 0,
                sub: "runs",
              },
              {
                label: "TTL MAE",
                value:
                  retrainHistory?.latest?.ttl_mae != null
                    ? `${retrainHistory.latest.ttl_mae}s`
                    : "—",
                sub: "lower is better",
              },
              {
                label: "TTL R²",
                value: retrainHistory?.latest?.ttl_r2 ?? "—",
                sub: "target 0.3 – 0.6",
                color:
                  retrainHistory?.latest?.ttl_r2 != null
                    ? parseFloat(retrainHistory.latest.ttl_r2) >= 0.3
                      ? "text-green-600"
                      : "text-yellow-600"
                    : "",
              },
              {
                label: "Eviction MAE",
                value: retrainHistory?.latest?.evict_mae ?? "—",
                sub: "score units",
              },
              {
                label: "Prefetch F1",
                value: retrainHistory?.latest?.prefetch_f1 ?? "—",
                sub: "macro, target 0.5+",
                color:
                  retrainHistory?.latest?.prefetch_f1 != null
                    ? parseFloat(retrainHistory.latest.prefetch_f1) >= 0.5
                      ? "text-green-600"
                      : "text-yellow-600"
                    : "",
              },
            ].map((card) => (
              <div key={card.label} className="p-4 border rounded-lg">
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className={`text-lg font-bold mt-1 ${card.color || ""}`}>
                  {card.value}
                </p>
                {card.sub && (
                  <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                )}
              </div>
            ))}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold">Retraining History</h2>
              <p className="text-xs text-gray-500 mt-1">
                Retrains every <span className="font-medium">3 days</span> on a{" "}
                <span className="font-medium">30-day rolling window</span>. All
                models evaluated on a 20% held-out test split.
              </p>
            </div>
            {!retrainHistory || retrainHistory.history.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                No retraining history yet. First retrain runs automatically
                after 3 days or 1,000+ rows are collected. Use "Train now" in ML
                Control to trigger manually.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                      {[
                        "Date",
                        "Rows",
                        "Window",
                        "TTL MAE ↓",
                        "TTL R² ↑",
                        "Evict MAE ↓",
                        "Evict R² ↑",
                        "Prefetch F1 ↑",
                        "Duration",
                        "Hot Reload",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-left whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...retrainHistory.history].reverse().map((entry, i) => {
                      const ttlR2 = parseFloat(entry.ttl_r2);
                      const evictR2 = parseFloat(entry.evict_r2);
                      const prefF1 = parseFloat(entry.prefetch_f1);
                      return (
                        <tr key={i} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2 text-xs whitespace-nowrap">
                            {new Date(entry.retrained_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-2">
                            {entry.training_rows?.toLocaleString() ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-gray-500">
                            {entry.window_days ?? "—"}d
                          </td>
                          <td className="px-4 py-2 font-medium">
                            {entry.ttl_mae != null ? `${entry.ttl_mae}s` : "—"}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={
                                !isNaN(ttlR2)
                                  ? ttlR2 >= 0.3
                                    ? "text-green-600 font-medium"
                                    : "text-yellow-600"
                                  : ""
                              }
                            >
                              {entry.ttl_r2 ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-medium">
                            {entry.evict_mae ?? "—"}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={
                                !isNaN(evictR2)
                                  ? evictR2 >= 0.4
                                    ? "text-green-600 font-medium"
                                    : "text-yellow-600"
                                  : ""
                              }
                            >
                              {entry.evict_r2 ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={
                                !isNaN(prefF1)
                                  ? prefF1 >= 0.5
                                    ? "text-green-600 font-medium"
                                    : "text-yellow-600"
                                  : ""
                              }
                            >
                              {entry.prefetch_f1 ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-500">
                            {entry.elapsed_seconds != null
                              ? `${entry.elapsed_seconds}s`
                              : "—"}
                          </td>
                          <td className="px-4 py-2">
                            {entry.hot_reloaded ? (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                ✓ Live
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                — No
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold text-sm">
                Metric Interpretation Guide
              </h2>
            </div>
            <div className="divide-y text-sm">
              {[
                {
                  metric: "TTL MAE",
                  range:
                    "Average error in TTL prediction (seconds). Lower is better.",
                  good: "< 60s",
                  ok: "60–120s",
                  bad: "> 120s",
                },
                {
                  metric: "TTL R²",
                  range:
                    "Explained variance of TTL predictions. ≥ 0.3 indicates genuine signal.",
                  good: "≥ 0.4",
                  ok: "0.3–0.39",
                  bad: "< 0.3",
                },
                {
                  metric: "Eviction R²",
                  range:
                    "Accuracy of future-demand score. Higher = smarter eviction decisions.",
                  good: "≥ 0.5",
                  ok: "0.4–0.49",
                  bad: "< 0.4",
                },
                {
                  metric: "Prefetch F1",
                  range:
                    "Macro-averaged F1 across route types for prefetch prediction quality.",
                  good: "≥ 0.6",
                  ok: "0.5–0.59",
                  bad: "< 0.5",
                },
              ].map(({ metric, range, good, ok, bad }) => (
                <div
                  key={metric}
                  className="px-4 py-3 grid grid-cols-1 md:grid-cols-4 gap-2 items-start"
                >
                  <div className="font-medium text-gray-800">{metric}</div>
                  <div className="md:col-span-2 text-gray-500 text-xs leading-relaxed">
                    {range}
                  </div>
                  <div className="flex gap-1 flex-wrap text-xs">
                    <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded">
                      Good: {good}
                    </span>
                    <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded">
                      OK: {ok}
                    </span>
                    <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded">
                      Weak: {bad}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODEL METRICS ── */}
      {activeTab === "model-metrics" && (
        <div className="space-y-6">
          {!modelMetrics ? (
            <div className="border rounded-lg p-8 text-center text-gray-400">
              No model trained yet. Go to the Retraining tab to train the model.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg">LightCache Models</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {modelMetrics.trained_at
                      ? `Trained ${new Date(modelMetrics.trained_at).toLocaleString()} · ${modelMetrics.training_rows?.toLocaleString()} rows`
                      : "3 models working together for dynamic TTL, eviction, and prefetch decisions"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border-2 border-blue-200 rounded-xl p-5 bg-blue-50/40">
                  <div className="mb-4">
                    <h3 className="font-bold text-blue-900">
                      Model 1 — TTL Regressor
                    </h3>
                    <p className="text-xs text-blue-600 mt-0.5">
                      LGBMRegressor · predicts optimal cache TTL (seconds)
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          MAE (test set)
                        </p>
                        <p className="text-xs text-gray-400">
                          Mean absolute error in TTL prediction
                        </p>
                      </div>
                      <span
                        className={`text-xl font-bold ${modelMetrics.metrics?.ttl_mae < 120 ? "text-green-600" : modelMetrics.metrics?.ttl_mae < 200 ? "text-yellow-600" : "text-orange-500"}`}
                      >
                        {modelMetrics.metrics?.ttl_mae != null
                          ? `${modelMetrics.metrics.ttl_mae}s`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          R² Score
                        </p>
                        <p className="text-xs text-gray-400">
                          Explained variance — 1.0 is perfect
                        </p>
                      </div>
                      <span
                        className={`text-xl font-bold ${modelMetrics.metrics?.ttl_r2 > 0.7 ? "text-green-600" : modelMetrics.metrics?.ttl_r2 > 0.45 ? "text-yellow-600" : "text-red-500"}`}
                      >
                        {modelMetrics.metrics?.ttl_r2 ?? "—"}
                      </span>
                    </div>
                    {modelMetrics.train_rows != null && (
                      <div className="pt-2 border-t border-blue-100 grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>
                          <p className="font-medium text-gray-600">
                            Train rows
                          </p>
                          <p className="text-sm font-bold text-gray-700">
                            {modelMetrics.train_rows?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Test rows</p>
                          <p className="text-sm font-bold text-gray-700">
                            {modelMetrics.test_rows?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-2 border-purple-200 rounded-xl p-5 bg-purple-50/40">
                  <div className="mb-4">
                    <h3 className="font-bold text-purple-900">
                      Model 2 — Eviction Score Regressor
                    </h3>
                    <p className="text-xs text-purple-600 mt-0.5">
                      LGBMRegressor · predicts future demand score (0–200)
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          MAE (test set)
                        </p>
                        <p className="text-xs text-gray-400">
                          Mean absolute error in eviction score
                        </p>
                      </div>
                      <span
                        className={`text-xl font-bold ${modelMetrics.metrics?.evict_mae < 8 ? "text-green-600" : "text-yellow-600"}`}
                      >
                        {modelMetrics.metrics?.evict_mae ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          R² Score
                        </p>
                        <p className="text-xs text-gray-400">
                          Explained variance of demand scores
                        </p>
                      </div>
                      <span
                        className={`text-xl font-bold ${modelMetrics.metrics?.evict_r2 > 0.85 ? "text-green-600" : modelMetrics.metrics?.evict_r2 > 0.6 ? "text-yellow-600" : "text-red-500"}`}
                      >
                        {modelMetrics.metrics?.evict_r2 ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-green-200 rounded-xl p-5 bg-green-50/40">
                  <div className="mb-4">
                    <h3 className="font-bold text-green-900">
                      Model 3 — Prefetch Classifier
                    </h3>
                    <p className="text-xs text-green-600 mt-0.5">
                      Multi-output LGBMClassifier · predicts next route types
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          F1 Score (macro)
                        </p>
                        <p className="text-xs text-gray-400">
                          Averaged F1 across all route labels
                        </p>
                      </div>
                      <span
                        className={`text-xl font-bold ${modelMetrics.metrics?.reuse_f1 > 0.8 ? "text-green-600" : modelMetrics.metrics?.reuse_f1 > 0.75 ? "text-yellow-600" : "text-red-500"}`}
                      >
                        {modelMetrics.metrics?.reuse_f1 ?? "—"}
                      </span>
                    </div>
                    {modelMetrics.metrics?.reuse_auc != null && (
                      <div className="flex justify-between items-baseline">
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            AUC-ROC
                          </p>
                          <p className="text-xs text-gray-400">
                            Area under ROC curve
                          </p>
                        </div>
                        <span
                          className={`text-xl font-bold ${modelMetrics.metrics.reuse_auc > 0.88 ? "text-green-600" : "text-yellow-600"}`}
                        >
                          {modelMetrics.metrics.reuse_auc}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {modelMetrics.feature_importances?.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b">
                    <h2 className="font-semibold">
                      Feature Importances — TTL Model
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Top features driving TTL prediction, by split gain
                    </p>
                  </div>
                  <div className="p-4 space-y-2">
                    {modelMetrics.feature_importances.slice(0, 12).map((f) => (
                      <div key={f.feature} className="flex items-center gap-3">
                        <span className="text-xs font-mono w-52 text-right text-gray-500 shrink-0">
                          {f.feature}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-black h-2 rounded-full transition-all"
                            style={{ width: `${f.importance_pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right shrink-0">
                          {f.importance_pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ML CONTROL ── */}
      {activeTab === "ml-control" && (
        <div className="space-y-6 max-w-2xl">
          <div className="border rounded-lg p-5">
            <h2 className="font-semibold text-lg">Operational Mode</h2>
            <p className="text-sm text-gray-500 mt-1">
              Switch between standard fixed TTL and LightCache's dynamic ML
              predictions.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => handleModeToggle("redis_only")}
                className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${mlMode === "redis_only" ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"}`}
              >
                <div className="text-left">
                  <p className="font-bold">Fixed TTL (Redis Only)</p>
                  <p className="text-xs text-gray-500">
                    Standard caching. Every key gets 3600s TTL.
                  </p>
                </div>
                {mlMode === "redis_only" && (
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </button>
              <button
                onClick={() => handleModeToggle("ml_active")}
                className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${mlMode === "ml_active" ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
              >
                <div className="text-left">
                  <p className="font-bold">LightCache ML Active</p>
                  <p className="text-xs text-gray-500">
                    Dynamic TTLs based on predicted re-access patterns.
                  </p>
                </div>
                {mlMode === "ml_active" && (
                  <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </button>
            </div>
            {mlActionMsg && (
              <p
                className={`mt-4 text-sm font-medium ${mlActionMsg.type === "ok" ? "text-green-600" : "text-red-500"}`}
              >
                {mlActionMsg.text}
              </p>
            )}
          </div>

          <div className="border rounded-lg p-5">
            <h2 className="font-semibold">Model Training</h2>
            <p className="text-sm text-gray-500 mt-1">
              Update the model using historical access logs.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleTriggerRetrain}
                disabled={retraining}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm disabled:opacity-50"
              >
                {retraining ? "Training…" : "Train Model Now"}
              </button>
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {simulating ? "Simulating…" : "Generate Synthetic Data"}
              </button>
            </div>
          </div>

          {mlReadiness && (
            <div className="border rounded-lg p-5">
              <h2 className="font-semibold">Model Status</h2>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {[
                  {
                    label: "Model exists",
                    value: mlReadiness.model_exists ? "Yes" : "No",
                    ok: mlReadiness.model_exists,
                  },
                  {
                    label: "Training rows",
                    value: mlReadiness.total_rows?.toLocaleString(),
                    ok: mlReadiness.total_rows > 100,
                  },
                  {
                    label: "Log coverage",
                    value: mlReadiness.log_coverage,
                    ok: true,
                  },
                  {
                    label: "Last trained",
                    value: mlReadiness.last_trained
                      ? new Date(mlReadiness.last_trained).toLocaleDateString()
                      : "Never",
                    ok: !!mlReadiness.last_trained,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between border rounded p-2"
                  >
                    <span className="text-gray-500">{item.label}</span>
                    <span
                      className={`font-medium ${item.ok ? "text-green-600" : "text-gray-400"}`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-2 border-red-200 rounded-lg p-5 bg-red-50">
            <h2 className="font-semibold text-red-800">Danger Zone</h2>
            <p className="text-sm text-red-600 mt-1">
              Wipes all training data and model artefacts. Cannot be undone.
            </p>
            <button
              onClick={handleResetTrainingData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Reset All Training Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheDashboard;
