const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  getTelemetry,
  recordTelemetry
} = require("../controllers/telemetryController");

router.get("/", auth, getTelemetry);
router.get("/timeline", auth, getTelemetry);
router.post("/event", auth, recordTelemetry);
router.post("/", auth, recordTelemetry);

module.exports = router;