//  ML Service proxy routes
//  Proxies requests from the frontend to the FastAPI ML service.
//  Keeps ML_SERVICE_URL internal to the backend — never exposed to browser.

const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const { smartEvict } = require("../middleware/cacheMiddleware");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// GET /api/ml/retrain-history
router.get("/retrain-history", protect, admin, async (req, res) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/admin/retrain-history`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(503).json({ history: [], message: "ML service unavailable" });
  }
});

// GET /api/ml/model-metrics
router.get("/model-metrics", protect, admin, async (req, res) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/admin/model-metrics`);
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ message: text });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(503).json({ message: "ML service unavailable" });
  }
});

// GET /api/ml/health
router.get("/health", protect, admin, async (req, res) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(503).json({ status: "unavailable" });
  }
});

// POST /api/ml/simulate-from-real
router.post("/simulate-from-real", protect, admin, async (req, res) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/admin/simulate-from-real`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ message: `ML service error: ${text}` });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(503).json({ message: `ML service unavailable: ${err.message}` });
  }
});

// POST /api/ml/trigger-retrain
router.post("/trigger-retrain", protect, admin, async (req, res) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/admin/trigger-retrain`, {
      method: "POST",
      signal: AbortSignal.timeout(180000),
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ message: `ML service error: ${text}` });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(503).json({ message: `ML service unavailable: ${err.message}` });
  }
});

// POST /api/ml/smart-evict
// Triggers an immediate ML-driven eviction pass.
// Useful when you want to trim the cache proactively (e.g. low-memory alert).
// Body: { targetCount: number } — evict until this many keys remain tracked.
router.post("/smart-evict", protect, admin, async (req, res) => {
  try {
    const targetCount = parseInt(req.body?.targetCount ?? 0, 10);
    await smartEvict(targetCount);
    res.json({
      status: "ok",
      message: `Smart eviction complete (target: ${targetCount} keys)`,
    });
  } catch (err) {
    res.status(500).json({ message: `Eviction failed: ${err.message}` });
  }
});

module.exports = router;
