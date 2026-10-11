const analyzerService = require("../services/analyzerService");
const ErrorReport = require("../models/ErrorReport");
const explainService = require("../services/explainService");

exports.analyzeError = async (req, res) => {
  try {
    const { error, source = "manual" } = req.body;

    if (!error || !error.trim()) {
      return res.status(400).json({
        message: "Error text is required"
      });
    }

    const result = await analyzerService(error, {
      userId: req.user.id,
      source
    });

    const report = await ErrorReport.create({
      userId: req.user.id,
      rawError: error,
      title: result.errorTitle,
      errorTitle: result.errorTitle,
      category: result.category,
      fingerprint: result.fingerprint,
      security: result.securityImpact || [],
      rootCause: result.rootCause,
      fix: result.immediateFix,
      prevention: result.prevention,
      debugSteps: result.debugSteps || result.technicalBreakdown || [],
      severity: result.severity,
      source,
      // Rich AI analysis fields
      executiveSummary: result.executiveSummary,
      humanExplanation: result.humanExplanation,
      technicalExplanation: result.technicalExplanation,
      immediateFix: result.immediateFix,
      permanentFix: result.permanentFix,
      productionImpact: result.productionImpact,
      businessImpact: result.businessImpact,
      riskAssessment: result.riskAssessment,
      codeExamples: result.codeExamples,
      suggestedCode: result.suggestedCode,
      bestPractices: result.bestPractices || [],
      codeImprovementSuggestions: result.codeImprovementSuggestions,
      securityRecommendations: result.securityRecommendations,
      performanceRecommendations: result.performanceRecommendations,
      performanceImpact: result.performanceImpact,
      securityImpact: result.securityImpact || [],
      relatedTechnologies: result.relatedTechnologies || [],
      confidence: result.confidence,
      aiConfidence: result.aiConfidence,
      resolutionPriority: result.resolutionPriority,
      historicalFrequency: result.historicalFrequency,
      lastOccurrenceAt: result.lastOccurrenceAt,
      failureChain: result.failureChain || [],
      affectedFiles: result.affectedFiles || [],
      affectedModules: result.affectedModules || [],
      monitoringRecommendations: result.monitoringRecommendations || [],
      personas: result.personas,
      roleExplanations: result.roleExplanations,
      timeline: result.timeline,
      similarErrors: result.similarErrors,
      metadata: result.metadata
    });

    res.json({
      success: true,
      reportId: report._id,
      debugSteps: result.debugSteps || result.technicalBreakdown || [],
      ...result,
      analysis: {
        ...result,
        debugSteps: result.debugSteps || result.technicalBreakdown || [],
      }
    });
  } catch (error) {
    console.error("[Analysis Error]", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getReports = async (req, res) => {
  try {
    const reports = await ErrorReport.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);

    const enriched = reports.map(report => {
      const obj = report.toObject();
      if (!obj.personas) {
        obj.personas = explainService(obj.category || "UNKNOWN_ERROR", obj.rawError);
      }
      if (!obj.roleExplanations) {
        obj.roleExplanations = {
          beginner: obj.humanExplanation || obj.executiveSummary || "Analysis summary available.",
          junior: obj.rootCause || obj.technicalExplanation || "Check root cause details.",
          midLevel: obj.technicalExplanation || obj.fix || "Review technical diagnosis.",
          senior: obj.permanentFix || obj.prevention || "Apply permanent fix strategy.",
          techLead: `Severity: ${obj.severity || 'MEDIUM'}. Risk: ${obj.riskAssessment || 'Monitored'}. Prevention: ${obj.prevention || 'Enforce code standards.'}`,
        };
      }
      return obj;
    });

    res.json({
      success: true,
      count: enriched.length,
      reports: enriched
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};