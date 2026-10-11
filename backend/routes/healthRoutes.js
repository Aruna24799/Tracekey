const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getHealthStats } = require("../controllers/healthController");

// GET /api/health/stats - protected database and process performance stats
router.get("/stats", authMiddleware, getHealthStats);

module.exports = router;
