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

  // Evaluation state (from Change 1)
  const [evaluation, setEvaluation] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState(null);
  const [exportData, setExportData] = useState(null);

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

  // Data fetching (updated in Change 2)
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

      // Fetch evaluation snapshots for Chapter 4 tables
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

  // Evaluation Snapshot Handlers (Change 3)
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

  // ... (ML toggle and retraining handlers remain the same)
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
    } catch (err) {
      showMlMsg("err", "Simulation failed.");
    } finally {
      setSimulating(false);
    }
  };

  const handleTriggerRetrain = async () => {
    if (!window.confirm("Train the ML model now?")) return;
    setRetraining(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/ml/trigger-retrain`,
        {},
        authHeaders(),
      );
      showMlMsg("ok", "Model trained successfully.");
      fetchData();
    } catch (err) {
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
    } catch (err) {
      showMlMsg("err", "Reset failed.");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  const { summary, by_route, by_hour } = stats;
  const maxHour = Math.max(...by_hour);
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header and Summary Cards ... */}
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
            className="px-4 py-2 bg-yellow-500 text-white rounded text-sm"
          >
            Flush Cache
          </button>
          <button
            onClick={handleFlushLogs}
            className="px-4 py-2 bg-red-500 text-white rounded text-sm"
          >
            Clear Logs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-500">Hit Rate</p>
          <p className="text-2xl font-bold text-green-600">
            {summary.hit_rate}
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-500">Total Requests</p>
          <p className="text-2xl font-bold">
            {summary.total_requests.toLocaleString()}
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-500">ML Usage</p>
          <p className="text-2xl font-bold">{summary.ml_usage_rate}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-500">Cached Keys</p>
          <p className="text-2xl font-bold">{summary.cached_keys}</p>
        </div>
      </div>

      {/* Tabs (Updated with "evaluation") */}
      <div className="flex gap-1 mb-6 border-b">
        {[
          "overview",
          "benchmark",
          "evaluation",
          "keys",
          "logs",
          "retraining",
          "model-metrics",
          "ml-control",
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize relative ${activeTab === tab ? "border-b-2 border-black text-black" : "text-gray-500"}`}
          >
            {tab === "evaluation"
              ? "Evaluation"
              : tab === "ml-control"
                ? "ML Control"
                : tab === "model-metrics"
                  ? "Model Metrics"
                  : tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Route</th>
                  <th className="px-4 py-2 text-left">Hit Rate</th>
                  <th className="px-4 py-2 text-left">Latency</th>
                </tr>
              </thead>
              <tbody>
                {by_route.map((r) => (
                  <tr key={r.route} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{r.route}</td>
                    <td className="px-4 py-2">{r.hit_rate}%</td>
                    <td className="px-4 py-2">{r.avg_latency}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Benchmark Panel ... */}
      {activeTab === "benchmark" && (
        <div className="space-y-6">
          {/* (Render Benchmark Content Similar to Original File) */}
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Strategy Comparison</h2>
            <button
              onClick={handleRunBenchmark}
              disabled={benchmarkRunning}
              className="text-sm px-3 py-1.5 border rounded"
            >
              {benchmarkRunning ? "Running..." : "Re-run Benchmark"}
            </button>
          </div>
          {/* ... Table and strategy results ... */}
        </div>
      )}

      {/* Evaluation Panel (The major missing piece) */}
      {activeTab === "evaluation" && (
        <div className="space-y-6">
          <div className="border rounded-lg p-5 bg-gray-50">
            <h2 className="font-semibold text-lg">Chapter 4 Evaluation</h2>
            <p className="text-xs text-gray-500 mt-1">
              Collects Response Time, Throughput, and Hit Ratio data for thesis
              Chapter 4.
            </p>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Save Evaluation Snapshot</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="e.g. Session 1 — Fixed TTL"
                className="flex-1 px-3 py-2 border rounded text-sm"
              />
              <button
                onClick={handleSaveSnapshot}
                disabled={savingSnapshot}
                className="px-4 py-2 bg-black text-white rounded text-sm"
              >
                {savingSnapshot ? "Saving…" : "Save Snapshot"}
              </button>
              {snapshots.length > 0 && (
                <button
                  onClick={handleClearSnapshots}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded text-sm"
                >
                  Clear All
                </button>
              )}
            </div>
            {snapshotMsg && (
              <p
                className={`text-xs ${snapshotMsg.type === "ok" ? "text-green-600" : "text-red-500"}`}
              >
                {snapshotMsg.text}
              </p>
            )}
          </div>

          {snapshots.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase">
                  <tr>
                    {[
                      "Label",
                      "Mode",
                      "Hit Rate",
                      "Avg RT (ms)",
                      "Throughput",
                    ].map((h) => (
                      <th key={h} className="px-4 py-2 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2 font-medium">{s.label}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                          {s.mode}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-bold">{s.hit_rate_pct}%</td>
                      <td className="px-4 py-2">{s.avg_rt_ms}</td>
                      <td className="px-4 py-2">{s.throughput_kbs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {exportData && (
            <>
              {/* Table A */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                  <h2 className="font-semibold text-blue-900">
                    Table A — Average Response Time (ms)
                  </h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Session</th>
                      <th className="px-4 py-2 text-left">Fixed TTL (ms)</th>
                      <th className="px-4 py-2 text-left">LightCache (ms)</th>
                      <th className="px-4 py-2 text-left">Reduction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportData.table_a?.rows.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">{row.label}</td>
                        <td className="px-4 py-2">{row.fixed_ttl_rt_ms}</td>
                        <td className="px-4 py-2">{row.lightcache_rt_ms}</td>
                        <td className="px-4 py-2 text-green-600 font-bold">
                          +{row.rt_reduction_pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table C */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                  <h2 className="font-semibold text-green-900">
                    Table C — Hit Ratio Comparison (%)
                  </h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Capacity</th>
                      <th className="px-4 py-2 text-left">LRU</th>
                      <th className="px-4 py-2 text-left">LFU</th>
                      <th className="px-4 py-2 text-left">LightCache</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportData.table_c?.rows.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">{row.memory_label}</td>
                        <td className="px-4 py-2">{row.LRU}%</td>
                        <td className="px-4 py-2">{row.LFU}%</td>
                        <td className="px-4 py-2 font-bold text-green-600">
                          {row.LightCache}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Discussion Sentences */}
              {exportData.discussion && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b">
                    <h2 className="font-semibold">
                      Chapter 5 — Discussion Sentences
                    </h2>
                  </div>
                  <div className="p-4 space-y-4">
                    <p className="text-sm bg-gray-50 border rounded p-3 italic">
                      "{exportData.discussion.table_a}"
                    </p>
                    <p className="text-sm bg-gray-50 border rounded p-3 italic">
                      "{exportData.discussion.table_c}"
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Evaluation Protocol */}
          <div className="border rounded-lg p-5">
            <h3 className="font-semibold mb-4">Evaluation Protocol</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-xs">
                  1
                </span>
                <span>Run benchmark in Benchmark tab for Table C.</span>
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-xs">
                  2
                </span>
                <span>
                  Switch to Plain Redis, browse for 10m, and save a snapshot.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-xs">
                  3
                </span>
                <span>
                  Switch to LightCache ML, browse for 10m, and save a second
                  snapshot.
                </span>
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Keys, Logs, Retraining, etc. Panels ... */}
      {activeTab === "keys" && (
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Cached Product Keys</h2>
          <div className="flex flex-wrap gap-2">
            {stats.cached_keys.map((k) => (
              <span
                key={k}
                className="px-2 py-1 bg-gray-100 rounded text-xs font-mono"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {activeTab === "ml-control" && (
        <div className="space-y-6">
          <div className="border rounded-lg p-5">
            <h2 className="font-semibold text-lg">System Mode</h2>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => handleModeToggle("redis_only")}
                className={`px-4 py-2 border rounded ${mlMode === "redis_only" ? "bg-black text-white" : ""}`}
              >
                Fixed TTL (Redis)
              </button>
              <button
                onClick={() => handleModeToggle("ml_active")}
                className={`px-4 py-2 border rounded ${mlMode === "ml_active" ? "bg-black text-white" : ""}`}
              >
                LightCache ML
              </button>
            </div>
          </div>
          <div className="border rounded-lg p-5 bg-red-50">
            <h2 className="font-semibold text-red-800">Danger Zone</h2>
            <button
              onClick={handleResetTrainingData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded text-sm"
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
