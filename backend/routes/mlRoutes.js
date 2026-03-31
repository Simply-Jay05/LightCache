//  ML Service proxy routes
//  Proxies requests from the frontend to the FastAPI ML service.
//  Keeps ML_SERVICE_URL internal to the backend — never exposed to browser.

const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");

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
// Asks ml-service to generate synthetic training rows modelled on real
// captured data, augmenting the JSONL until MIN_ROWS_TO_RETRAIN is met.
router.post("/simulate-from-real", protect, admin, async (req, res) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/admin/simulate-from-real`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
      signal: AbortSignal.timeout(60000), // simulation can take a moment
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
// Tells the retrain scheduler to run immediately (ignores time interval).
router.post("/trigger-retrain", protect, admin, async (req, res) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/admin/trigger-retrain`, {
      method: "POST",
      signal: AbortSignal.timeout(180000), // retraining takes up to 3 min
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

module.exports = router;
