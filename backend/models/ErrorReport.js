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
  category: String,
  fingerprint: String,
  security: [String],
  rootCause: String,
  fix: String,
  prevention: String,
  debugSteps: [String],
  severity: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    default: "MEDIUM"
  },
  source: {
    type: String,
    enum: ["manual", "ocr", "sdk"],
    default: "manual"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ErrorReport", errorReportSchema);
