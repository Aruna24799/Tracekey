const express = require("express");
const router = express.Router();
const { getRecentLogs } = require("../controllers/logController");
const auth = require("../middleware/authMiddleware");

router.get("/recent", auth, getRecentLogs);

module.exports = router;
