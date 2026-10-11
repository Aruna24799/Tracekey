const mongoose = require("mongoose");

const errorReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  rawError: {
    type: String,
    required: true
  },
  title: String,
  errorTitle: String,
  category: String,
  fingerprint: mongoose.Schema.Types.Mixed,
  security: [String],
  rootCause: String,
  fix: String,
  prevention: String,
  debugSteps: [String],
  severity: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL", "ERROR"],
    default: "MEDIUM"
  },
  source: {
    type: String,
    enum: ["manual", "ocr", "sdk", "file", "project", "telemetry"],
    default: "manual"
  },
  // Rich AI analysis fields
  executiveSummary: String,
  humanExplanation: String,
  technicalExplanation: String,
  immediateFix: String,
  permanentFix: String,
  productionImpact: String,
  businessImpact: String,
  riskAssessment: String,
  codeExamples: String,
  suggestedCode: String,
  bestPractices: [String],
  codeImprovementSuggestions: String,
  securityRecommendations: String,
  performanceRecommendations: String,
  performanceImpact: String,
  securityImpact: [String],
  relatedTechnologies: [String],
  confidence: Number,
  aiConfidence: Number,
  resolutionPriority: String,
  historicalFrequency: Number,
  lastOccurrenceAt: Date,
  failureChain: [String],
  affectedFiles: [String],
  affectedModules: [String],
  monitoringRecommendations: [String],
  personas: mongoose.Schema.Types.Mixed,
  roleExplanations: mongoose.Schema.Types.Mixed,
  timeline: mongoose.Schema.Types.Mixed,
  similarErrors: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ErrorReport", errorReportSchema);