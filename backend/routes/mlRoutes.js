/**
 * ML Service proxy routes
 * Proxies requests from the frontend to the FastAPI ML service.
 * Keeps ML_SERVICE_URL internal to the backend — never exposed to browser.
 */

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

module.exports = router;
