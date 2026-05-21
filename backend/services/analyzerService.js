const fingerprintService = require("./fingerprintService");
const securityService = require("./securityService");
const explainService = require("./explainService");

async function analyzerService(rawError) {

  // Step 1: Normalize
  const normalized = rawError.toLowerCase().trim();

  // Step 2: Classify
  let category = "UNKNOWN_ERROR";
  if (normalized.includes("cannot read") || normalized.includes("undefined") || normalized.includes("null")) {
    category = "NULL_ERROR";
  } else if (normalized.includes("fetch") || normalized.includes("network") || normalized.includes("cors")) {
    category = "NETWORK_ERROR";
  } else if (normalized.includes("401") || normalized.includes("403") || normalized.includes("unauthorized")) {
    category = "AUTH_ERROR";
  } else if (normalized.includes("500") || normalized.includes("internal server")) {
    category = "SERVER_ERROR";
  }

  // Step 3: Parallel analysis (ONLY this layer runs parallel)
  const [securityResult, fingerprintResult] = await Promise.all([
    securityService(rawError),
    fingerprintService(rawError)
  ]);

  // Step 4: Explain
  const explanation = explainService(category);

  // Step 5: Severity
  const severity = securityResult.hasThreats ? "CRITICAL"
    : fingerprintResult.severity || "MEDIUM";

  return {
    category,
    fingerprint: fingerprintResult,
    security: securityResult,
    rootCause: explanation.rootCause,
    fix: explanation.fix,
    prevention: explanation.prevention,
    debugSteps: explanation.debugSteps,
    severity,
    analyzedAt: new Date().toISOString()
  };
}

module.exports = analyzerService;
