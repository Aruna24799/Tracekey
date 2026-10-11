/**
 * telemetryService.js
 *
 * Core backend service for TraceKey Telemetry.
 * Responsible for:
 *   - Processing and recording SDK events (single or batch)
 *   - Aggregating metrics for Dashboard updates
 *   - Calculating dynamic Health scores
 *   - Aggregating Security scores and findings
 *   - Generating Insights based on error trends
 *   - Resolving telemetry events list, stats, and time series trends
 */

const mongoose = require("mongoose");
const ErrorReport = require("../models/ErrorReport");
const LoginLog = require("../models/LoginLog");
const Session = require("../models/Session");
const analyzerService = require("./analyzerService");
const {
  upsertProjectKnowledge
} = require("./projectKnowledgeService");

/**
 * Process a single SDK telemetry event.
 * Runs AnalyzerService if the event is an error.
 *
 * @param {object} event
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function processEvent(event, userId) {
  const rawError = event.stack || event.message || event.error || "Console / SDK Telemetry Log";
  const source = event.source || "sdk";

  let category = event.category || "TELEMETRY_METRIC";
  let severity = event.severity || "LOW";
  let rootCause = event.message || "Telemetry event recorded";
  let fix = "";
  let prevention = "";
  let debugSteps = [];
  let fingerprint = "TELEMETRY";
  let security = [];

  // Parse if it's an error type
  const isError = event.type === "error" || event.type === "exception" || event.type === "rejection" ||
    event.type === "api_failure" || event.type === "db_failure" || event.stack;

  if (isError) {
    try {
      const result = await analyzerService(rawError, {
        userId,
        source
      });
      category = result.category || category;
      severity = result.severity || severity;
      rootCause = result.rootCause || rootCause;
      fix = result.fix || fix;
      prevention = result.prevention || prevention;
      debugSteps = result.debugSteps || debugSteps;
      fingerprint = result.fingerprint?.code || "SDK_ERROR";
      security = result.security?.threats?.map(t => t.message || t) || [];
    } catch (err) {
      console.error("[Telemetry Service] Error analysis failed:", err.message);
      category = "SDK_ERROR";
    }
  }

  // Build metadata fields
  const meta = {
    filename: event.metadata?.filename || "",
    projectName: event.metadata?.projectName || "SDK Client",
    technology: event.metadata?.technology || "",
    riskScore: event.type === "security" ? 80 : (severity === "CRITICAL" ? 100 : (severity === "HIGH" ? 75 : (severity === "MEDIUM" ? 50 : 25))),
    healthScore: event.type === "performance" ? (event.metadata?.healthScore || 90) : 100,
    ...event.metadata
  };

  const report = await ErrorReport.create({
    userId,
    rawError,
    category,
    fingerprint,
    security,
    rootCause,
    fix,
    prevention,
    debugSteps,
    severity,
    source,
    metadata: meta,
    createdAt: event.createdAt ? new Date(event.createdAt) : new Date()
  });

  const telemetryProjectName = event.metadata?.projectName || event.projectName || "";
  if (telemetryProjectName) {
    await upsertProjectKnowledge(userId, {
      projectName: telemetryProjectName,
      repository: event.metadata?.repository || "",
      framework: event.metadata?.framework || event.metadata?.technology || "Unknown",
      language: event.metadata?.language ? [event.metadata.language] : event.metadata?.languages,
      runtime: event.metadata?.runtime || "Unknown",
      packageManager: event.metadata?.packageManager || "Unknown",
      dependencies: event.metadata?.dependencies || [],
      routes: event.metadata?.routes || [],
      controllers: event.metadata?.controllers || [],
      services: event.metadata?.services || [],
      models: event.metadata?.models || [],
      components: event.metadata?.components || [],
      configuration: event.metadata?.configuration || [],
      environment: event.metadata?.environment || [],
      database: event.metadata?.database || [],
      authentication: event.metadata?.authentication || [],
      docker: Boolean(event.metadata?.docker),
      cicd: event.metadata?.cicd || [],
      cloudProvider: event.metadata?.cloudProvider || "Unknown",
      apiEndpoints: event.metadata?.apiEndpoints || [],
      folderStructure: event.metadata?.folderStructure || [],
      summary: event.message || event.rootCause || "Telemetry snapshot updated",
      source: "sdk",
      lastAnalysisReportId: report._id
    });
  }

  return report;
}

/**
 * Process a batch array of SDK telemetry events.
 *
 * @param {Array|object} body
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function recordTelemetryEvents(body, userId) {
  const events = Array.isArray(body) ? body : [body];
  const savedReports = [];

  for (const event of events) {
    if (!event) continue;
    const report = await processEvent(event, userId);
    savedReports.push(report);
  }

  return savedReports;
}

/**
 * Fetch list of recent telemetry events and aggregate stats and trends.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getTelemetryStatsAndEvents(userId) {
  // Fetch last 100 SDK/telemetry events
  const events = await ErrorReport.find({
    userId,
    source: {
      $in: ["sdk", "telemetry"]
    }
  })
    .sort({ createdAt: -1 })
    .limit(100);

  // Calculate aggregations
  const stats = {
    total: events.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    categories: {},
    sources: {}
  };

  events.forEach(event => {
    // Aggregate by severity
    const sev = (event.severity || "MEDIUM").toUpperCase();
    if (sev === "CRITICAL") stats.critical++;
    else if (sev === "HIGH") stats.high++;
    else if (sev === "MEDIUM") stats.medium++;
    else if (sev === "LOW") stats.low++;

    // Aggregate by category
    const cat = event.category || "UNKNOWN_ERROR";
    stats.categories[cat] = (stats.categories[cat] || 0) + 1;

    // Aggregate by source
    const src = event.source || "sdk";
    stats.sources[src] = (stats.sources[src] || 0) + 1;
  });

  // Generate simple time series trend (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const trendDb = await ErrorReport.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        source: { $in: ["sdk", "telemetry"] },
        createdAt: { $gte: sevenDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        count: { $sum: 1 },
        critical: {
          $sum: {
            $cond: [{ $eq: ["$severity", "CRITICAL"] }, 1, 0]
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]).catch(() => []);

  // Ensure we have fallback trend data if aggregation returned empty
  const trend = trendDb.length ? trendDb : Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const match = events.filter(e => e.createdAt && e.createdAt.toISOString().startsWith(dateStr));
    return {
      _id: dateStr,
      count: match.length,
      critical: match.filter(e => e.severity === "CRITICAL").length
    };
  }).reverse();

  return {
    events,
    stats,
    trend
  };
}

/**
 * Fetch and aggregate dashboard summary stats (live data).
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getDashboardStats(userId) {
  const [recentErrors, totalCount, criticalCount, sdkCount, ocrCount, activeSessions] = await Promise.all([
    ErrorReport.find({ userId })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    ErrorReport.countDocuments({ userId }),
    ErrorReport.countDocuments({ userId, severity: "CRITICAL" }),
    ErrorReport.countDocuments({ userId, source: "sdk" }),
    ErrorReport.countDocuments({ userId, source: "ocr" }),
    Session.countDocuments({ userId, active: true })
  ]);

  // Calculate generic security/health indexes
  let healthScore = 100;
  if (totalCount > 0) healthScore -= Math.min(40, totalCount * 2);
  if (criticalCount > 0) healthScore -= Math.min(30, criticalCount * 12);
  healthScore = Math.max(10, Math.min(100, healthScore));

  const securityScore = Math.max(15, Math.min(100, 100 - (criticalCount * 15) - (activeSessions > 2 ? 15 : 0)));

  return {
    healthScore,
    securityScore,
    activeSessions,
    totalErrors: totalCount,
    criticalErrors: criticalCount,
    telemetryEvents: sdkCount,
    ocrAnalyzed: ocrCount,
    recentErrors
  };
}

/**
 * Fetch health stats and calculate stability metrics.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getHealthStats(userId) {
  const [totalReports, criticalCount, manualCount, ocrCount, sdkCount, loginSuccess, loginFailed] = await Promise.all([
    ErrorReport.countDocuments({ userId }),
    ErrorReport.countDocuments({ userId, severity: "CRITICAL" }),
    ErrorReport.countDocuments({ userId, source: "manual" }),
    ErrorReport.countDocuments({ userId, source: "ocr" }),
    ErrorReport.countDocuments({ userId, source: "sdk" }),
    LoginLog.countDocuments({ userId, loginStatus: "success" }),
    LoginLog.countDocuments({ userId, loginStatus: "failed" })
  ]);

  let stabilityIndex = 100;
  if (totalReports > 0) stabilityIndex -= Math.min(40, totalReports * 2.5);
  if (criticalCount > 0) stabilityIndex -= Math.min(30, criticalCount * 10);
  if (loginFailed > 0) stabilityIndex -= Math.min(20, loginFailed * 4);
  stabilityIndex = Math.max(10, Math.min(100, Math.round(stabilityIndex)));

  return {
    stabilityIndex,
    totalReports,
    criticalCount,
    sources: {
      manual: manualCount,
      ocr: ocrCount,
      sdk: sdkCount
    },
    authMetrics: {
      successCount: loginSuccess,
      failedCount: loginFailed,
      failureRate: loginSuccess + loginFailed > 0
        ? Math.round((loginFailed / (loginSuccess + loginFailed)) * 100)
        : 0
    }
  };
}

/**
 * Fetch and calculate security scores, timeline, and findings.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getSecurityStats(userId) {
  const logs = await LoginLog.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const fingerprints = logs.map(l => l.fingerprintHash).filter(Boolean);
  const uniqueFingerprints = new Set(fingerprints).size;

  let score = 75;
  if (uniqueFingerprints === 1 && fingerprints.length > 0) {
    score += 15;
  } else if (uniqueFingerprints > 2) {
    score -= 10;
  }

  const failedAttempts = logs.filter(l => l.loginStatus === "failed").length;
  score -= failedAttempts * 10;

  const activeSessions = await Session.countDocuments({ userId, active: true });
  if (activeSessions === 1) {
    score += 10;
  } else if (activeSessions > 2) {
    score -= 15;
  }
  score = Math.max(10, Math.min(100, score));

  // Build daily timeline from the logs
  const byDate = {};
  logs.forEach(log => {
    if (!log.createdAt) return;
    const day = log.createdAt.toISOString().split("T")[0];
    if (!byDate[day]) {
      byDate[day] = { date: day, success: 0, failed: 0 };
    }
    byDate[day][log.loginStatus]++;
  });

  const [totalReports, criticalReports] = await Promise.all([
    ErrorReport.countDocuments({ userId }),
    ErrorReport.countDocuments({ userId, severity: "CRITICAL" })
  ]);

  return {
    score,
    status: score > 85 ? "Excellent" : score > 70 ? "Good" : score > 50 ? "Fair" : "At Risk",
    details: {
      activeSessions,
      recentFailures: failedAttempts,
      knownDevices: uniqueFingerprints
    },
    timeline: Object.values(byDate),
    summary: {
      totalLogins: logs.length,
      successLogins: logs.filter(l => l.loginStatus === "success").length,
      failedLogins: failedAttempts,
      totalReports,
      criticalReports
    }
  };
}

module.exports = {
  processEvent,
  recordTelemetryEvents,
  getTelemetryStatsAndEvents,
  getDashboardStats,
  getHealthStats,
  getSecurityStats
};
