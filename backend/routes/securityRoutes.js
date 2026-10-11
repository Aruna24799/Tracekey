const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  getSecurityScore,
  getActivityTimeline,
  getSecurityFindings
} = require("../controllers/securityController");

router.get(
  "/score",
  auth,
  getSecurityScore
);

router.get(
  "/activity",
  auth,
  getActivityTimeline
);

router.get(
  "/findings",
  auth,
  getSecurityFindings
);

module.exports = router;