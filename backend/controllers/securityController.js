const telemetryService = require("../services/telemetryService");
const ErrorReport = require("../models/ErrorReport");

// GET /api/security/score - Fetch computed security score and login metadata
exports.getSecurityScore = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delegate security calculation to telemetryService
    const stats = await telemetryService.getSecurityStats(userId);

    res.json({
      score: stats.score,
      securityScore: stats.score,
      status: stats.status,
      details: stats.details
    });
  } catch (error) {
    console.error("🚨 [Security Score Controller Exception]:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal security engine failure.",
      error: error.message
    });
  }
};

// GET /api/security/activity - Fetch log activity timeline and audit stats
exports.getActivityTimeline = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delegate security timeline & summary processing to telemetryService
    const stats = await telemetryService.getSecurityStats(userId);

    res.json({
      timeline: stats.timeline,
      summary: stats.summary
    });
  } catch (error) {
    console.error("🚨 [Security Activity Controller Exception]:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal security timeline failure.",
      error: error.message
    });
  }
};

// GET /api/security/findings - Fetch real security findings and vulnerabilities
exports.getSecurityFindings = async (req, res) => {
  try {
    const userId = req.user.id;

    // Retrieve verified security vulnerability reports for this user
    const findings = await ErrorReport.find({
      userId,
      $or: [
        { category: "SECURITY" },
        { "security.0": { $exists: true } },
        { securityImpact: { $not: { $size: 0 } } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(findings);
  } catch (error) {
    console.error("🚨 [Security Findings Controller Exception]:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal security findings query failure.",
      error: error.message
    });
  }
};