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

  // Evaluation state
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState(null);
  const [exportData, setExportData] = useState(null);

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

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  const { summary, by_route, by_hour, cached_keys, top_keys, recent_logs } =
    stats;
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
                {by_route.map((r) => (
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
              {by_hour.map((count, hour) => (
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
              {/* Summary cards at max capacity */}
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

              {/* Hit rate by capacity table */}
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

              {/* Base paper comparison */}
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
            <p className="text-sm text-gray-500 mt-1">
              Captures Response Time, Throughput, and Hit Ratio data for thesis
              Chapter 4 tables. Run in Fixed TTL mode first, save a snapshot,
              then switch to ML mode and save another.
            </p>
          </div>

          {/* Save Snapshot */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Save Evaluation Snapshot</h3>
            <p className="text-xs text-gray-500">
              Current mode:{" "}
              <span
                className={`font-semibold ${mlMode === "ml_active" ? "text-green-600" : "text-gray-700"}`}
              >
                {mlMode === "ml_active" ? "LightCache ML" : "Fixed TTL (Redis)"}
              </span>
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveSnapshot()}
                placeholder="e.g. Session 1 — Fixed TTL"
                className="flex-1 px-3 py-2 border rounded text-sm"
              />
              <button
                onClick={handleSaveSnapshot}
                disabled={savingSnapshot}
                className="px-4 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
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

          {/* Snapshots Table */}
          {snapshots.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold text-sm">
                  Saved Snapshots ({snapshots.length})
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    {[
                      "Label",
                      "Mode",
                      "Requests",
                      "Hit Rate",
                      "Avg RT (ms)",
                      "Throughput (KB/s)",
                      "ML Coverage",
                    ].map((h) => (
                      <th key={h} className="px-4 py-2 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{s.label}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${s.mode === "ml_active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}
                        >
                          {s.mode === "ml_active" ? "ML Active" : "Fixed TTL"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {s.total_requests?.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 font-bold text-green-700">
                        {s.hit_rate_pct}%
                      </td>
                      <td className="px-4 py-2">{s.avg_rt_ms}</td>
                      <td className="px-4 py-2">{s.throughput_kbs}</td>
                      <td className="px-4 py-2">{s.ml_coverage_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table A — Response Time */}
          {exportData?.table_a?.rows?.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                <div>
                  <h2 className="font-semibold text-blue-900">
                    Table A — Average Response Time (ms)
                  </h2>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Fixed TTL Redis vs LightCache ML · mirrors base paper Table
                    3
                  </p>
                </div>
                {exportData.table_a.avg_rt_reduction_pct != null && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Avg RT Reduction</p>
                    <p className="text-xl font-bold text-blue-700">
                      {exportData.table_a.avg_rt_reduction_pct}%
                    </p>
                    <p className="text-xs text-gray-400">
                      Base paper:{" "}
                      {exportData.table_a.base_paper_rt_reduction_pct}%
                    </p>
                  </div>
                )}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    {[
                      "Session",
                      "Fixed TTL (ms)",
                      "LightCache (ms)",
                      "RT Reduction",
                    ].map((h) => (
                      <th key={h} className="px-4 py-2 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exportData.table_a.rows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">{row.label}</td>
                      <td className="px-4 py-2">
                        {row.fixed_ttl_rt_ms ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        {row.lightcache_rt_ms ?? "—"}
                      </td>
                      <td className="px-4 py-2 font-bold text-green-600">
                        {row.rt_reduction_pct != null
                          ? `+${row.rt_reduction_pct}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table B — Throughput */}
          {exportData?.table_b?.rows?.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                <div>
                  <h2 className="font-semibold text-purple-900">
                    Table B — Throughput (KB/s)
                  </h2>
                  <p className="text-xs text-purple-600 mt-0.5">
                    Fixed TTL Redis vs LightCache ML · mirrors base paper Table
                    4
                  </p>
                </div>
                {exportData.table_b.avg_th_increase_pct != null && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Avg TH Increase</p>
                    <p className="text-xl font-bold text-purple-700">
                      {exportData.table_b.avg_th_increase_pct}%
                    </p>
                    <p className="text-xs text-gray-400">
                      Base paper:{" "}
                      {exportData.table_b.base_paper_th_increase_pct}%
                    </p>
                  </div>
                )}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    {[
                      "Session",
                      "Fixed TTL (KB/s)",
                      "LightCache (KB/s)",
                      "TH Increase",
                    ].map((h) => (
                      <th key={h} className="px-4 py-2 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exportData.table_b.rows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">{row.label}</td>
                      <td className="px-4 py-2">
                        {row.fixed_ttl_th_kbs ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        {row.lightcache_th_kbs ?? "—"}
                      </td>
                      <td className="px-4 py-2 font-bold text-green-600">
                        {row.th_increase_pct != null
                          ? `+${row.th_increase_pct}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table C — Hit Ratio from benchmark */}
          {exportData?.table_c?.rows?.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex justify-between items-center">
                <div>
                  <h2 className="font-semibold text-green-900">
                    Table C — Hit Ratio Comparison (%)
                  </h2>
                  <p className="text-xs text-green-600 mt-0.5">
                    LRU vs LFU vs LightCache · mirrors base paper Table 6
                  </p>
                </div>
                {exportData.table_c.averages && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">LightCache avg</p>
                    <p className="text-xl font-bold text-green-700">
                      {exportData.table_c.averages.LightCache?.toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-400">
                      Base paper RR: {exportData.table_c.base_paper?.RR}%
                    </p>
                  </div>
                )}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    {[
                      "Cache Size",
                      "LRU (%)",
                      "LFU (%)",
                      "LightCache (%)",
                      "Best",
                    ].map((h) => (
                      <th key={h} className="px-4 py-2 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exportData.table_c.rows.map((row, i) => {
                    const best = Math.max(row.LRU, row.LFU, row.LightCache);
                    return (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2 font-medium">
                          {row.memory_label}
                        </td>
                        <td className="px-4 py-2">{row.LRU}%</td>
                        <td className="px-4 py-2">{row.LFU}%</td>
                        <td
                          className={`px-4 py-2 font-bold ${row.LightCache === best ? "text-green-600" : "text-gray-700"}`}
                        >
                          {row.LightCache}%
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {row.LightCache === best ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                              LightCache ◄
                            </span>
                          ) : row.LRU === best ? (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                              LRU
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                              LFU
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {exportData.table_c.averages && (
                    <tr className="border-t bg-gray-50 font-semibold">
                      <td className="px-4 py-2">Average</td>
                      <td className="px-4 py-2">
                        {exportData.table_c.averages.LRU?.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2">
                        {exportData.table_c.averages.LFU?.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2 text-green-700">
                        {exportData.table_c.averages.LightCache?.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2" />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Chapter 5 Discussion Sentences */}
          {exportData?.discussion && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h2 className="font-semibold">
                  Chapter 5 — Auto-generated Discussion
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Copy these directly into your thesis write-up
                </p>
              </div>
              <div className="p-4 space-y-3">
                {[
                  exportData.discussion.table_a,
                  exportData.discussion.table_b,
                  exportData.discussion.table_c,
                ]
                  .filter(Boolean)
                  .map((sentence, i) => (
                    <div key={i} className="relative group">
                      <p className="text-sm bg-gray-50 border rounded p-3 pr-16 italic leading-relaxed">
                        "{sentence}"
                      </p>
                      <button
                        onClick={() => navigator.clipboard.writeText(sentence)}
                        className="absolute right-2 top-2 text-xs px-2 py-1 border rounded opacity-0 group-hover:opacity-100 transition-opacity bg-white"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Evaluation Protocol */}
          <div className="border rounded-lg p-5">
            <h3 className="font-semibold mb-4">Evaluation Protocol</h3>
            <ol className="space-y-3 text-sm">
              {[
                "Run benchmark in the Benchmark tab — this populates Table C automatically.",
                "Ensure you are in Fixed TTL mode (ML Control tab). Browse the store for 5–10 minutes to generate traffic.",
                "Return here, label the snapshot (e.g. 'Session 1 — Fixed TTL') and click Save Snapshot.",
                "Switch to LightCache ML mode (ML Control tab). Browse the store for another 5–10 minutes.",
                "Return here, label the snapshot (e.g. 'Session 1 — ML Active') and click Save Snapshot.",
                "Tables A, B and the Chapter 5 discussion sentences will populate automatically.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* ── KEYS ── */}
      {activeTab === "keys" && (
        <div className="space-y-6">
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold">
                Cached Product Keys ({cached_keys?.length ?? 0})
              </h2>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {(cached_keys || []).map((k) => (
                <div
                  key={k.key}
                  className="px-3 py-1.5 bg-gray-100 rounded text-xs font-mono flex items-center gap-2"
                >
                  <span>{k.key}</span>
                  <span className="text-gray-400">{k.ttl}s</span>
                </div>
              ))}
            </div>
          </div>

          {top_keys?.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h2 className="font-semibold">Top Keys by Access Count</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    {["Key", "Total", "Hits", "Hit Rate"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {top_keys.map((k) => (
                    <tr key={k.key} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs max-w-xs truncate">
                        {k.key}
                      </td>
                      <td className="px-4 py-2">{k.total}</td>
                      <td className="px-4 py-2 text-green-600">{k.hits}</td>
                      <td className="px-4 py-2">{k.hit_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── LOGS ── */}
      {activeTab === "logs" && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-semibold">Recent Cache Events (last 30)</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {["Event", "Key", "Route", "Latency", "TTL", "ML"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recent_logs || []).map((log, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${log.event_type === "HIT" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {log.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs max-w-xs truncate">
                    {log.cache_key}
                  </td>
                  <td className="px-4 py-2 text-xs">{log.route_type}</td>
                  <td className="px-4 py-2">{log.latency_ms}ms</td>
                  <td className="px-4 py-2">{log.ttl_used}s</td>
                  <td className="px-4 py-2">
                    {log.ml_used ? (
                      <span className="text-xs text-green-600 font-medium">
                        ML
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── RETRAINING ── */}
      {activeTab === "retraining" && (
        <div className="space-y-6">
          {mlActionMsg && (
            <div
              className={`p-3 rounded text-sm ${mlActionMsg.type === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
            >
              {mlActionMsg.text}
            </div>
          )}
          <div className="border rounded-lg p-5">
            <h2 className="font-semibold text-lg mb-1">Training Data</h2>
            {mlReadiness && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {mlReadiness.row_count?.toLocaleString()} /{" "}
                    {mlReadiness.min_rows?.toLocaleString()} rows
                  </span>
                  <span
                    className={
                      mlReadiness.ready
                        ? "text-green-600 font-medium"
                        : "text-gray-500"
                    }
                  >
                    {mlReadiness.ready
                      ? "Ready to train"
                      : `${mlReadiness.pct}% collected`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${mlReadiness.ready ? "bg-green-500" : "bg-blue-500"}`}
                    style={{ width: `${Math.min(mlReadiness.pct, 100)}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="px-4 py-2 border rounded text-sm disabled:opacity-50"
              >
                {simulating ? "Simulating…" : "Simulate from Real Data"}
              </button>
              <button
                onClick={handleTriggerRetrain}
                disabled={retraining || !mlReadiness?.ready}
                className="px-4 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
              >
                {retraining ? "Training…" : "Train Model Now"}
              </button>
            </div>
          </div>

          {retrainHistory?.history?.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h2 className="font-semibold">
                  Retrain History ({retrainHistory.total_retrains})
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    {["When", "Rows", "TTL MAE", "TTL R²"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...retrainHistory.history]
                    .reverse()
                    .slice(0, 10)
                    .map((h, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2 text-xs">
                          {new Date(h.retrained_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          {h.training_rows?.toLocaleString()}
                        </td>
                        <td className="px-4 py-2">{h.ttl_mae}s</td>
                        <td className="px-4 py-2">{h.ttl_r2}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODEL METRICS ── */}
      {activeTab === "model-metrics" && (
        <div className="space-y-6">
          {!modelMetrics ? (
            <div className="border rounded-lg p-8 text-center text-gray-400">
              No model trained yet.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "TTL MAE",
                    value: `${modelMetrics.metrics?.ttl_mae}s`,
                  },
                  { label: "TTL R²", value: modelMetrics.metrics?.ttl_r2 },
                  { label: "Evict R²", value: modelMetrics.metrics?.evict_r2 },
                  { label: "Reuse F1", value: modelMetrics.metrics?.reuse_f1 },
                ].map((m) => (
                  <div key={m.label} className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500">{m.label}</p>
                    <p className="text-2xl font-bold">{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="border rounded-lg p-4">
                  <p className="text-gray-500 text-xs">Trained at</p>
                  <p className="font-medium">
                    {new Date(modelMetrics.trained_at).toLocaleString()}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-gray-500 text-xs">Training rows</p>
                  <p className="font-medium">
                    {modelMetrics.training_rows?.toLocaleString()}
                  </p>
                </div>
              </div>

              {modelMetrics.feature_importances?.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b">
                    <h2 className="font-semibold">
                      Feature Importances (TTL model)
                    </h2>
                  </div>
                  <div className="p-4 space-y-2">
                    {modelMetrics.feature_importances.slice(0, 10).map((f) => (
                      <div key={f.feature} className="flex items-center gap-3">
                        <span className="text-xs font-mono w-48 text-right text-gray-600">
                          {f.feature}
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-black h-2 rounded-full"
                            style={{ width: `${f.importance_pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10">
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
        <div className="space-y-6">
          {mlActionMsg && (
            <div
              className={`p-3 rounded text-sm ${mlActionMsg.type === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
            >
              {mlActionMsg.text}
            </div>
          )}

          <div className="border rounded-lg p-5">
            <h2 className="font-semibold text-lg">System Mode</h2>
            <p className="text-sm text-gray-500 mt-1">
              Controls whether the ML service is consulted for TTL decisions.
            </p>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => handleModeToggle("redis_only")}
                className={`px-6 py-3 border-2 rounded-lg text-sm font-medium transition-colors ${mlMode === "redis_only" ? "bg-black text-white border-black" : "border-gray-300 hover:border-gray-400"}`}
              >
                Fixed TTL (Redis Only)
              </button>
              <button
                onClick={() => handleModeToggle("ml_active")}
                className={`px-6 py-3 border-2 rounded-lg text-sm font-medium transition-colors ${mlMode === "ml_active" ? "bg-green-600 text-white border-green-600" : "border-gray-300 hover:border-green-300"}`}
              >
                LightCache ML Active
              </button>
            </div>
          </div>

          {mlReadiness && (
            <div className="border rounded-lg p-5">
              <h2 className="font-semibold">Model Status</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                {[
                  {
                    label: "Model exists",
                    value: mlReadiness.model_exists ? "Yes ✓" : "No",
                    ok: mlReadiness.model_exists,
                  },
                  {
                    label: "Model loaded",
                    value: mlReadiness.model_ready ? "Yes ✓" : "No",
                    ok: mlReadiness.model_ready,
                  },
                  {
                    label: "Data rows",
                    value: `${mlReadiness.row_count?.toLocaleString()} / ${mlReadiness.min_rows?.toLocaleString()}`,
                    ok: mlReadiness.ready,
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
