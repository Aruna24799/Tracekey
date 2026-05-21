const analyzerService = require("../services/analyzerService");
const ErrorReport = require("../models/ErrorReport");

exports.analyzeError = async (req, res) => {
  try {
    const { error, source = "manual" } = req.body;

    if (!error || error.trim() === "") {
      return res.status(400).json({ message: "Error text is required" });
    }

    // Run analysis
    const result = await analyzerService(error);

    // Save to database
    const report = await ErrorReport.create({
      userId: req.user.id,
      rawError: error,
      category: result.category,
      fingerprint: result.fingerprint.code,
      security: result.security.threats.map(t => t.message),
      rootCause: result.rootCause,
      fix: result.fix,
      prevention: result.prevention,
      debugSteps: result.debugSteps,
      severity: result.severity,
      source
    });

    res.json({
      ...result,
      reportId: report._id
    });

  } catch (error) {
    console.error("Analysis error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// GET all reports for current user
exports.getReports = async (req, res) => {
  try {
    const reports = await ErrorReport.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
