const express = require("express");
const router = express.Router();
const { getSecurityScore, getActivityTimeline } = require("../controllers/securityController");
const auth = require("../middleware/authMiddleware");

router.get("/score", auth, getSecurityScore);
router.get("/activity", auth, getActivityTimeline);

module.exports = router;

