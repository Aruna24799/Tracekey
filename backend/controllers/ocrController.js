const { createWorker } = require("tesseract.js");
const analyzerService = require("../services/analyzerService");
const ErrorReport = require("../models/ErrorReport");

function parseStackTrace(text) {
  const lines = text.split("\n");
  const callSites = [];
  const stackRegex = /(?:at\s+)?([a-zA-Z0-9_$<>.\-\[\]\s]+)\s*\((.*?):(\d+):(\d+)\)/;
  const simpleRegex = /([a-zA-Z0-9_.-]+\.[a-z]{2,4}):(\d+):(\d+)/;

  lines.forEach(line => {
    const trimmed = line.trim();
    let match = trimmed.match(stackRegex);
    if (match) {
      callSites.push({
        method: match[1].trim(),
        file: match[2].trim(),
        line: parseInt(match[3]),
        column: parseInt(match[4]),
        raw: trimmed,
      });
    } else {
      match = trimmed.match(simpleRegex);
      if (match && !trimmed.startsWith("http")) {
        callSites.push({
          method: "anonymous",
          file: match[1].trim(),
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          raw: trimmed,
        });
      }
    }
  });

  return callSites;
}

// POST /api/ocr/extract
exports.analyzeFromImage = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file uploaded" });
  }

  let worker;
  try {
    worker = await createWorker("eng");
    const { data } = await worker.recognize(req.file.buffer);
    await worker.terminate();

    const extracted = (data.text || "").trim();
    const confidence = data.confidence || 0;

    if (!extracted || extracted.length < 5) {
      return res.status(422).json({
        message:
          "Could not extract readable text from the image. Please upload a clearer screenshot.",
      });
    }

    // Pipe through unified analysis pipeline (TraceKey Engine + AI enrichment)
    const result = await analyzerService(extracted, {
      userId: req.user.id,
      source: "ocr"
    });

    const structuredTrace = parseStackTrace(extracted);

    const report = await ErrorReport.create({
      userId: req.user.id,
      rawError: extracted,
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
      source: "ocr",
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
      extractedText: extracted,
      ocrConfidence: Math.round(confidence),
      structuredTrace,
      reportId: report._id,
      debugSteps: result.debugSteps || result.technicalBreakdown || [],
      ...result,
      analysis: {
        ...result,
        debugSteps: result.debugSteps || result.technicalBreakdown || [],
      },
    });
  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch (_) { }
    }
    next(err);
  }
};
