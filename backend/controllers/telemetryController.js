const telemetryService = require("../services/telemetryService");

// GET /api/telemetry - fetch recent events and aggregate telemetry data
exports.getTelemetry = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delegate fetching and aggregation to telemetryService
    const result = await telemetryService.getTelemetryStatsAndEvents(userId);

    res.json({
      success: true,
      count: result.events.length,
      totalEvents: result.events.length,
      stats: result.stats,
      trend: result.trend,
      events: result.events
    });
  } catch (error) {
    console.error("Telemetry Controller Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST /api/telemetry/event - Record events from the SDK
exports.recordTelemetry = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delegate batch event processing to telemetryService
    const savedReports = await telemetryService.recordTelemetryEvents(req.body, userId);

    res.status(201).json({
      success: true,
      count: savedReports.length,
      message: "Telemetry events recorded successfully"
    });
  } catch (error) {
    console.error("Telemetry event recording failed:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};