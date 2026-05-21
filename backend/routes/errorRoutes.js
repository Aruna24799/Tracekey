const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { analyzeError, getReports } = require("../controllers/errorController");

router.post("/analyze", authMiddleware, analyzeError);
router.get("/reports", authMiddleware, getReports);

module.exports = router;
