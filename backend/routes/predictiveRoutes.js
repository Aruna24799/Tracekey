// tracekey2/backend/routes/predictiveRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getAnalysis } = require("../controllers/predictiveController");

// Protected endpoint to retrieve deterministic runtime risk analytics
router.get("/analysis", authMiddleware, getAnalysis);

module.exports = router;
