const LoginLog = require("../models/LoginLog");
const Session = require("../models/Session");
const ErrorReport = require("../models/ErrorReport");

exports.getSecurityScore = async (req, res) => {
  try {
    const userId = req.user.id;
    let score = 75; // Base score

    // Factors
    const logs = await LoginLog.find({ userId }).sort({ createdAt: -1 }).limit(5);
    
    // 1. Device consistency
    const fingerprints = logs.map(l => l.fingerprintHash).filter(Boolean);
    const uniqueFingerprints = new Set(fingerprints).size;
    if (uniqueFingerprints === 1 && fingerprints.length > 0) score += 15;
    else if (uniqueFingerprints > 2) score -= 10;

    // 2. Failed attempts in last 5
    const failedAttempts = logs.filter(l => l.loginStatus === "failed").length;
    score -= (failedAttempts * 10);

    // 3. Active session health
    const activeSessions = await Session.countDocuments({ userId, active: true });
    if (activeSessions === 1) score += 10;
    else if (activeSessions > 2) score -= 15;

    // Cap score 0-100
    score = Math.max(10, Math.min(100, score));

    res.json({ 
      score, 
      status: score > 85 ? "Excellent" : score > 70 ? "Good" : score > 50 ? "Fair" : "At Risk",
      details: {
        activeSessions,
        recentFailures: failedAttempts,
        knownDevices: uniqueFingerprints
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/security/activity — login trend + error report count (last 30 days)
exports.getActivityTimeline = async (req, res) => {
  try {
    const userId = req.user.id;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const logs = await LoginLog.find({ userId, createdAt: { $gte: since } })
      .sort({ createdAt: 1 })
      .select("loginStatus createdAt");

    // Aggregate by date
    const byDate = {};
    logs.forEach(log => {
      const day = log.createdAt.toISOString().split("T")[0];
      if (!byDate[day]) byDate[day] = { date: day, success: 0, failed: 0 };
      byDate[day][log.loginStatus]++;
    });

    const totalReports = await ErrorReport.countDocuments({ userId });
    const criticalReports = await ErrorReport.countDocuments({ userId, severity: "CRITICAL" });

    res.json({
      timeline: Object.values(byDate),
      summary: {
        totalLogins: logs.length,
        successLogins: logs.filter(l => l.loginStatus === "success").length,
        failedLogins: logs.filter(l => l.loginStatus === "failed").length,
        totalReports,
        criticalReports
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
