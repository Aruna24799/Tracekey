const mongoose = require("mongoose");
const os = require("os");
const telemetryService = require("../services/telemetryService");

// GET /api/health/stats - Fetch system health, database latency, and telemetry stability stats
exports.getHealthStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Collect OS & System Health metrics (Controller level telemetry env)
    const memoryUsage = process.memoryUsage();
    const memory = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };

    const system = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: Math.round(process.uptime()),
      freeMemory: Math.round(os.freemem() / 1024 / 1024),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024)
    };

    // 2. Database readiness check
    const dbState = mongoose.connection.readyState;
    let dbPing = -1;
    let dbStatus = "OFFLINE";

    if (dbState === 1) {
      dbStatus = "CONNECTED";
      const start = Date.now();
      try {
        await mongoose.connection.db.admin().ping();
        dbPing = Date.now() - start;
      } catch (err) {
        dbStatus = "DEGRADED";
        console.error("Database ping latency call failed:", err.message);
      }
    } else if (dbState === 2) {
      dbStatus = "CONNECTING";
    } else if (dbState === 3) {
      dbStatus = "DISCONNECTING";
    }

    // 3. Delegate business telemetry logic to service
    const stats = await telemetryService.getHealthStats(userId);

    res.json({
      success: true,
      health: {
        status: dbStatus === "CONNECTED" && stats.stabilityIndex > 50 ? "HEALTHY" : "RISK_DETECTED",
        db: {
          status: dbStatus,
          readyState: dbState,
          pingMs: dbPing
        },
        memory,
        system,
        telemetrySummary: {
          totalReports: stats.totalReports,
          criticalCount: stats.criticalCount,
          sources: stats.sources
        },
        authMetrics: stats.authMetrics,
        stabilityIndex: stats.stabilityIndex,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("🚨 [Health Monitoring Controller Exception]:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal health monitoring failure.",
      error: error.message
    });
  }
};
