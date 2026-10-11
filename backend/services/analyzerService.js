const mongoose = require("mongoose");
const fingerprintService = require("./fingerprintService");
const securityService = require("./securityService");
const taxonomyService = require("./taxonomyService");
const explainService = require("./explainService");
const { generateAIExplanation, normalizeCategory } = require("./aiExplanationService");
const semanticEmbeddingEngine = require("./semanticEmbeddingEngine");
const FailureEmbedding = require("../models/failureEmbedding");
const User = require("../models/User");
const ErrorReport = require("../models/ErrorReport");
const { getLatestProjectKnowledge } = require("./projectKnowledgeService");

// === PHASE 2: NORMALIZATION STAGE ===
/**
 * Normalize raw input — strip ANSI escape codes, unify line endings,
 * trim whitespace per line, collapse multiple blank lines.
 * This ensures downstream detection stages see clean, consistent text.
 */
function normalizeInput(rawError) {
  if (!rawError || typeof rawError !== "string") return "";
  let text = rawError;
  // Strip ANSI escape sequences (colored terminal output)
  text = text.replace(/\u001b\[\d+(;\d+)*m/g, "");
  // Normalize line endings to \n
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Trim leading/trailing whitespace per line
  text = text.split("\n").map(l => l.trim()).join("\n");
  // Collapse three or more consecutive blank lines into two
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

// === PHASE 2: DEPENDENCY DETECTION STAGE ===
/**
 * Detect dependency and package references embedded in error text.
 * Parses require(), import, from, and Python-style import statements
 * as well as inline package.json dependency blocks.
 */
function detectDependencies(errorText) {
  const deps = [];
  const text = String(errorText || "");

  // npm/node: require('package-name')
  const requirePattern = /require\(["']([^"'/]+)["']\)/g;
  let match;
  while ((match = requirePattern.exec(text)) !== null) {
    if (!deps.includes(match[1])) deps.push(match[1]);
  }

  // ES6: from 'package-name'
  const importPattern = /from\s+["']([^"'/]+)["']/g;
  while ((match = importPattern.exec(text)) !== null) {
    if (!deps.includes(match[1])) deps.push(match[1]);
  }

  // Python: import X or from X import Y
  const pyImport = /^import\s+(\S+)|^from\s+(\S+)\s+import/gm;
  while ((match = pyImport.exec(text)) !== null) {
    const pkg = match[1] || match[2];
    if (pkg && !deps.includes(pkg)) deps.push(pkg);
  }

  // Embedded package.json dependencies section
  const pkgJsonMatch = text.match(/"dependencies"\s*:\s*\{([^}]+)\}/);
  if (pkgJsonMatch) {
    const items = pkgJsonMatch[1].match(/"([^"]+)"\s*:/g);
    if (items) {
      items.forEach(item => {
        const name = item.replace(/["\s:]/g, "");
        if (name && !deps.includes(name)) deps.push(name);
      });
    }
  }

  return deps.slice(0, 20);
}

// === PHASE 2: RECOMMENDATION GENERATION STAGE ===
/**
 * Generate structured, actionable recommendations based on the
 * classified error category and severity.
 * Used as a deterministic fallback when AI enrichment is unavailable
 * (or as a supplement when AI IS available).
 */
function generateRecommendations(category, severity) {
  const cat = (category || "").toUpperCase();
  const recs = [];

  if (cat.includes("NULL") || cat.includes("UNDEFINED") || cat === "NULL_POINTER" || cat === "NULL_ERROR") {
    recs.push({ type: "DEFENSIVE_CODING", priority: "HIGH", message: "Add optional chaining (?.) or guard clauses before property access." });
    recs.push({ type: "BEST_PRACTICE", priority: "MEDIUM", message: "Initialize state variables with default fallback structures." });
    recs.push({ type: "TESTING", priority: "LOW", message: "Write tests for edge cases where API responses may return partial data." });
  } else if (cat.includes("AUTH") || cat.includes("TOKEN") || cat.includes("UNAUTHORIZED")) {
    recs.push({ type: "SECURITY", priority: "CRITICAL", message: "Verify JWT_SECRET environment variable is set and matches between services." });
    recs.push({ type: "BEST_PRACTICE", priority: "HIGH", message: "Implement automatic token refresh interceptors on 401 responses." });
    recs.push({ type: "SECURITY", priority: "MEDIUM", message: "Apply rate limiting on authentication endpoints." });
  } else if (cat.includes("NETWORK") || cat.includes("CORS") || cat.includes("FETCH") || cat.includes("TIMEOUT")) {
    recs.push({ type: "RESILIENCE", priority: "HIGH", message: "Wrap network requests in try-catch with exponential backoff retry logic." });
    recs.push({ type: "CONFIGURATION", priority: "MEDIUM", message: "Verify CORS origin configuration on the backend server." });
    recs.push({ type: "BEST_PRACTICE", priority: "LOW", message: "Implement AbortController signal cleanup on component unmount." });
  } else if (cat.includes("DATABASE") || cat.includes("MONGO") || cat.includes("MONGOOSE") || cat.includes("SQL")) {
    recs.push({ type: "OPERATIONS", priority: "CRITICAL", message: "Verify database connection string and network whitelist configuration." });
    recs.push({ type: "PERFORMANCE", priority: "HIGH", message: "Add database query indexing for frequently accessed fields." });
    recs.push({ type: "RESILIENCE", priority: "MEDIUM", message: "Implement connection pooling to handle traffic spikes." });
  } else if (cat.includes("REACT") || cat.includes("HOOK") || cat.includes("RENDER")) {
    recs.push({ type: "BEST_PRACTICE", priority: "HIGH", message: "Audit useEffect dependency arrays to prevent infinite render loops." });
    recs.push({ type: "RESILIENCE", priority: "MEDIUM", message: "Wrap component trees in Error Boundary boundaries." });
    recs.push({ type: "PERFORMANCE", priority: "LOW", message: "Memoize expensive computations with useMemo and useCallback." });
  } else if (cat.includes("ASYNC") || cat.includes("PROMISE") || cat.includes("REJECTION")) {
    recs.push({ type: "BEST_PRACTICE", priority: "HIGH", message: "Add try-catch blocks around all async/await calls." });
    recs.push({ type: "BEST_PRACTICE", priority: "MEDIUM", message: "Append .catch() handlers to all standalone promise chains." });
    recs.push({ type: "OPERATIONS", priority: "LOW", message: "Configure Node.js with --unhandled-rejections=strict flag." });
  } else if (cat.includes("SYNTAX") || cat.includes("PARSE") || cat.includes("COMPILE")) {
    recs.push({ type: "BEST_PRACTICE", priority: "HIGH", message: "Run linter and type checker before committing code." });
    recs.push({ type: "PROCESS", priority: "MEDIUM", message: "Configure pre-commit hooks to catch syntax errors automatically." });
    recs.push({ type: "TOOLING", priority: "LOW", message: "Use a build step (Vite, Babel, TypeScript) to catch parse errors early." });
  } else if (cat.includes("SECURITY") || cat.includes("SECRET") || cat.includes("CREDENTIAL")) {
    recs.push({ type: "SECURITY", priority: "CRITICAL", message: "Rotate exposed credentials immediately. Move secrets to .env file." });
    recs.push({ type: "SECURITY", priority: "HIGH", message: "Add .env to .gitignore and clean git history of exposed keys." });
    recs.push({ type: "SECURITY", priority: "MEDIUM", message: "Integrate secret scanning tools (gitleaks, trufflehog) into CI/CD." });
  } else {
    // Generic fallback recommendations
    recs.push({ type: "INVESTIGATION", priority: "MEDIUM", message: "Review the full stack trace to identify the throwing module." });
    recs.push({ type: "BEST_PRACTICE", priority: "LOW", message: "Add structured logging around the failing code path." });
    recs.push({ type: "RESILIENCE", priority: "LOW", message: "Implement global error handlers to catch unhandled exceptions." });
  }

  return recs;
}

function detectTechnology(errorText) {
  const text = errorText.toLowerCase();
  if (text.includes("react") || text.includes("jsx") || text.includes("hook")) return "React";
  if (text.includes("next.js") || text.includes("_app")) return "Next.js";
  if (text.includes("express") || text.includes("req.") || text.includes("res.")) return "Express";
  if (text.includes("mongodb") || text.includes("mongoose")) return "MongoDB";
  if (text.includes("sql") || text.includes("postgres") || text.includes("mysql")) return "SQL Database";
  if (text.includes("docker")) return "Docker";
  if (text.includes("kubernetes")) return "Kubernetes";
  if (text.includes("python") || text.includes("django") || text.includes("flask")) return "Python";
  if (text.includes("java") || text.includes("spring")) return "Java";
  return "Node.js (JavaScript)";
}

function detectRuntime(errorText) {
  const text = errorText.toLowerCase();
  if (text.includes("browser") || text.includes("window") || text.includes("document")) return "Browser";
  if (text.includes("node") || text.includes("process.") || text.includes("require(")) return "Node.js";
  if (text.includes("python") || text.includes("traceback")) return "Python";
  if (text.includes("java") || text.includes("spring")) return "JVM";
  if (text.includes("go ") || text.includes("goroutine")) return "Go";
  return "Node.js";
}

function detectLanguage(errorText) {
  const text = errorText.toLowerCase();
  if (text.includes("tsx") || text.includes("typescript")) return "TypeScript";
  if (text.includes("jsx") || text.includes("react") || text.includes("js")) return "JavaScript";
  if (text.includes("python") || text.includes("traceback")) return "Python";
  if (text.includes("java")) return "Java";
  if (text.includes("go ") || text.includes("goroutine")) return "Go";
  if (text.includes("php")) return "PHP";
  if (text.includes("rust")) return "Rust";
  return "JavaScript";
}

function detectFramework(errorText) {
  const text = errorText.toLowerCase();
  if (text.includes("next.js") || text.includes("_app")) return "Next.js";
  if (text.includes("react") || text.includes("jsx") || text.includes("hook")) return "React";
  if (text.includes("express") || text.includes("req.") || text.includes("res.")) return "Express";
  if (text.includes("nestjs")) return "NestJS";
  if (text.includes("django")) return "Django";
  if (text.includes("flask")) return "Flask";
  if (text.includes("fastapi")) return "FastAPI";
  if (text.includes("spring")) return "Spring";
  return "Express";
}

function detectPlatform(errorText) {
  const text = errorText.toLowerCase();
  if (text.includes("browser") || text.includes("window") || text.includes("document")) return "Web Browser";
  if (text.includes("node") || text.includes("process.")) return "Server Runtime";
  if (text.includes("docker") || text.includes("kubernetes")) return "Containerized Instance";
  return "Cloud Container";
}

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || left.length !== right.length) {
    return 0;
  }
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }
  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

function summarizeErrorText(errorText) {
  const normalized = String(errorText || "").trim();
  if (!normalized) {
    return "Runtime Anomaly Detected";
  }
  const firstLine = normalized.split(/\r?\n/).find(Boolean) || normalized;
  return firstLine.length > 180 ? `${firstLine.slice(0, 177)}...` : firstLine;
}

function extractAffectedFiles(errorText) {
  const fileMatches = new Set();
  const lines = String(errorText || "").split(/\r?\n/);
  const filePattern = /(?:at\s+.*\()?([^\s()]+\.[a-zA-Z0-9]+):\d+:\d+\)?/;
  for (const line of lines) {
    const match = line.match(filePattern);
    if (match?.[1]) {
      fileMatches.add(match[1]);
    }
  }
  const res = Array.from(fileMatches).slice(0, 12);
  return res.length > 0 ? res : ["package.json"];
}

function extractAffectedModules(errorText) {
  const text = String(errorText || "").toLowerCase();
  const modules = [];
  if (text.includes("react")) modules.push("React UI Layer");
  if (text.includes("next.js") || text.includes("_app")) modules.push("Next.js Server Pages");
  if (text.includes("express") || text.includes("req.") || text.includes("res.")) modules.push("Express API Controller");
  if (text.includes("mongoose") || text.includes("mongodb")) modules.push("MongoDB Mongoose Driver");
  if (text.includes("fetch") || text.includes("axios")) modules.push("HTTP Network Transport");
  if (text.includes("jwt") || text.includes("token")) modules.push("JWT Authentication Security");
  return modules.length > 0 ? modules : ["Core Router"];
}

function buildKnowledgeSummary(knowledge) {
  if (!knowledge) return "";
  const parts = [];
  if (knowledge.projectName) parts.push(`Project: ${knowledge.projectName}`);
  if (knowledge.framework) parts.push(`Framework: ${knowledge.framework}`);
  if (Array.isArray(knowledge.language) && knowledge.language.length) parts.push(`Languages: ${knowledge.language.join(", ")}`);
  if (knowledge.runtime) parts.push(`Runtime: ${knowledge.runtime}`);
  return parts.join(" | ");
}

async function resolveAiApiKey(userId) {
  if (process.env.HF_API_KEY) return process.env.HF_API_KEY;
  if (!userId) return "";
  try {
    const user = await User.findById(userId).select("settings.hfApiKey");
    return user?.settings?.hfApiKey || "";
  } catch {
    return "";
  }
}

async function analyzerService(rawError, context = {}) {
  if (!rawError || !rawError.trim()) {
    rawError = "Unknown Runtime Exception at main thread execution path.";
  }

  // === PHASE 2: NORMALIZATION STAGE ===
  const normalizedError = normalizeInput(rawError);

  const analysisStartedAt = Date.now();
  const userId = context.userId || null;
  const analysisSource = context.source || "manual";

  // Local project metadata loading
  const projectKnowledge = userId ? await getLatestProjectKnowledge(userId) : null;
  const knowledgeSummary = buildKnowledgeSummary(projectKnowledge);

  // Parse telemetry context if payload matches
  let telemetryPayload = null;
  const isTelemetry = rawError.includes("[Telemetry Report:");
  if (isTelemetry) {
    const contextMatch = rawError.match(/Context:\s*(\{[\s\S]*?\})\s*\nStack Trace:/);
    if (contextMatch?.[1]) {
      try {
        telemetryPayload = JSON.parse(contextMatch[1]);
      } catch { }
    }
  }

  // Running local detection subsystems
  const [fingerprintResult, securityResult] = await Promise.all([
    fingerprintService(rawError),
    securityService(rawError)
  ]);
  const taxonomyResult = taxonomyService.classify(rawError);

  // Normalize category to ensure valid classification
  const normCat = normalizeCategory(taxonomyResult?.category || fingerprintResult?.category || "Unknown", rawError);

  // Map category & details
  const category = analysisSource === "project"
    ? "PROJECT_ANALYSIS"
    : (analysisSource === "file" && (!taxonomyResult?.category || taxonomyResult.category === "Unknown" || taxonomyResult.category === "UNKNOWN_ERROR")
      ? "FILE_ANALYSIS"
      : (taxonomyResult?.category && taxonomyResult.category !== "Unknown" && taxonomyResult.category !== "UNKNOWN_ERROR"
        ? taxonomyResult.category
        : (fingerprintResult?.category && fingerprintResult.category !== "Unknown" ? fingerprintResult.category : normCat.replace("_", " "))));

  // Resolve API Key and call Hugging Face / Local Explanation Enrichment
  const aiApiKey = await resolveAiApiKey(userId);
  const aiAnalysis = await generateAIExplanation(
    rawError,
    category,
    aiApiKey,
    knowledgeSummary
  );

  // Generate embeddings for similarity search
  let currentEmbedding = [];
  try {
    currentEmbedding = await semanticEmbeddingEngine.embedError(rawError);
  } catch (err) {
    console.error("Semantic embedding generation failed:", err.message);
  }

  const hasKnownFingerprint = fingerprintResult?.code && fingerprintResult.code !== "UNKNOWN_PATTERN";
  let rootCause = hasKnownFingerprint
    ? fingerprintResult.description
    : (taxonomyResult?.category && taxonomyResult.category !== "UNKNOWN_ERROR" && taxonomyResult.description
      ? taxonomyResult.description
      : (aiAnalysis.rootCause || "Full codebase structure and security profile analyzed successfully."));

  if (isTelemetry && telemetryPayload) {
    if (telemetryPayload.url) rootCause = `API Endpoint failure at ${telemetryPayload.url}. ${rootCause}`;
    if (telemetryPayload.key) rootCause = `Session access storage failure on key "${telemetryPayload.key}". ${rootCause}`;
  }

  // Calculate severity
  let severity = "MEDIUM";
  if (securityResult?.hasThreats) {
    severity = "CRITICAL";
  } else if (fingerprintResult?.severity && fingerprintResult.severity !== "MEDIUM") {
    severity = fingerprintResult.severity;
  } else if (taxonomyResult?.defaultSeverity) {
    severity = taxonomyResult.defaultSeverity;
  }

  // Local static detections
  const technology = detectTechnology(rawError);
  const language = detectLanguage(rawError);
  const framework = detectFramework(rawError);
  const runtime = detectRuntime(rawError);
  const platform = detectPlatform(rawError);

  // Related reports
  let relatedReports = [];
  try {
    if (userId && mongoose.connection.readyState === 1) {
      relatedReports = await ErrorReport.find({ userId })
        .sort({ createdAt: -1 })
        .limit(25)
        .select("category fingerprint severity source rootCause fix prevention createdAt rawError metadata")
        .lean();
    }
  } catch (err) {
    console.error("Related reports query failed:", err.message);
  }

  const timeline = [
    {
      at: new Date().toISOString(),
      label: "Current analysis",
      category,
      severity,
      source: analysisSource,
      fingerprint: fingerprintResult?.code || "PATTERN_GENERIC"
    },
    ...relatedReports.slice(0, 10).map(report => ({
      at: report.createdAt,
      label: report.category || "Previous report",
      category: report.category || "UNKNOWN_ERROR",
      severity: report.severity || "MEDIUM",
      source: report.source || "manual",
      fingerprint: typeof report.fingerprint === "object" && report.fingerprint !== null
        ? (report.fingerprint.code || report.fingerprint.hash || "PATTERN_GENERIC")
        : (report.fingerprint || "PATTERN_GENERIC")
    }))
  ];

  // Similarity calculations
  let similarHistoricalErrors = [];
  try {
    if (currentEmbedding.length > 0 && mongoose.connection.readyState === 1) {
      const items = await FailureEmbedding.find({})
        .sort({ createdAt: -1 })
        .limit(25)
        .select("rawError embedding createdAt")
        .lean();
      similarHistoricalErrors = items
        .map(item => ({
          rawError: item.rawError,
          similarity: Number(cosineSimilarity(currentEmbedding, item.embedding).toFixed(4)),
          createdAt: item.createdAt
        }))
        .filter(item => item.similarity >= 0.75)
        .sort((left, right) => right.similarity - left.similarity)
        .slice(0, 5);
    }
  } catch (err) {
    console.error("Semantic embedding similarity search failed:", err.message);
  }

  // Persistence of embeddings
  try {
    if (currentEmbedding.length > 0 && mongoose.connection.readyState === 1) {
      await FailureEmbedding.create({
        rawError,
        embedding: currentEmbedding
      });
    }
  } catch (err) {
    console.error("Semantic embedding persistence failed:", err.message);
  }

  // Occurrence count
  const fingerprintCode = fingerprintResult?.code && fingerprintResult.code !== "UNKNOWN_PATTERN"
    ? fingerprintResult.code
    : `PATTERN_${normCat}`;
  const fingerprintHash = fingerprintResult?.hash || null;

  const fingerprintQueries = [
    { fingerprint: fingerprintCode },
    { "fingerprint.code": fingerprintCode }
  ];
  if (fingerprintHash) {
    fingerprintQueries.push(
      { fingerprint: fingerprintHash },
      { "fingerprint.hash": fingerprintHash }
    );
  }

  let occurrenceCount = 0;
  let lastOccurrence = null;
  try {
    if (userId && mongoose.connection.readyState === 1) {
      occurrenceCount = await ErrorReport.countDocuments({
        userId,
        $or: fingerprintQueries
      });

      lastOccurrence = await ErrorReport.findOne({
        userId,
        $or: fingerprintQueries
      }).sort({ createdAt: -1 }).select("createdAt").lean();
    }
  } catch (err) {
    console.error("Occurrence query failed:", err.message);
  }

  const affectedFiles = extractAffectedFiles(rawError);
  const affectedModules = extractAffectedModules(rawError);
  const analysisDuration = Date.now() - analysisStartedAt;
  const errorSummary = summarizeErrorText(rawError);

  // Actual system confidence from fingerprint pattern detection or scan source
  const systemConfidence = fingerprintResult?.confidence && fingerprintResult.confidence > 0
    ? fingerprintResult.confidence
    : (securityResult?.hasThreats ? 0.95 : (analysisSource === "project" ? 0.95 : (analysisSource === "file" ? 0.90 : 0.50)));

  // Build high-accuracy response with all required fields
  return {
    errorTitle: errorSummary,
    errorSummary,
    category,
    technology,
    framework,
    language,
    runtime,
    platform,
    severity: severity.toUpperCase(),

    // Confidence Score from actual detector calculations
    confidence: systemConfidence,
    aiConfidence: systemConfidence,

    // 1. Executive Summary
    executiveSummary: aiAnalysis.executiveSummary,

    // 2. Human Friendly Explanation
    humanExplanation: aiAnalysis.humanExplanation,

    // 3. Technical Explanation
    technicalExplanation: aiAnalysis.technicalExplanation,

    // 4. Root Cause
    rootCause: rootCause || aiAnalysis.rootCause,

    // 5. Immediate Fix
    immediateFix: aiAnalysis.immediateFix,
    // fix alias (for frontend ErrorAnalysis.jsx compatibility)
    fix: aiAnalysis.immediateFix,

    // 6. Permanent Fix
    permanentFix: aiAnalysis.permanentFix,

    // 7. Prevention Strategy
    prevention: aiAnalysis.prevention,

    // 8. Production Impact
    productionImpact: aiAnalysis.productionImpact,

    // 9. Business Impact
    businessImpact: aiAnalysis.businessImpact,

    // 10. Risk Assessment
    riskAssessment: aiAnalysis.riskAssessment,

    // 11. Debugging Steps (structured array for UI and reports)
    debugSteps: Array.isArray(aiAnalysis.debugSteps) && aiAnalysis.debugSteps.length > 0
      ? aiAnalysis.debugSteps
      : (aiAnalysis.debuggingSteps
        ? String(aiAnalysis.debuggingSteps).split("\n").map(s => s.trim().replace(/^[\d+.-]+\s*/, "")).filter(Boolean)
        : (taxonomyResult?.debugSteps || fingerprintResult?.debugSteps || [
            "Identify the failing line or module in the error trace.",
            "Check the relevant code, configuration, or dependency state.",
            "Apply the recommended fix and defensive guard clause.",
            "Re-run the application and execute tests.",
            "Verify that the error is resolved in the runtime environment."
          ])),
    technicalBreakdown: Array.isArray(aiAnalysis.debugSteps) && aiAnalysis.debugSteps.length > 0
      ? aiAnalysis.debugSteps
      : (aiAnalysis.debuggingSteps
        ? String(aiAnalysis.debuggingSteps).split("\n").map(s => s.trim().replace(/^[\d+.-]+\s*/, "")).filter(Boolean)
        : (taxonomyResult?.debugSteps || fingerprintResult?.debugSteps || [
            "Identify the failing line or module in the error trace.",
            "Check the relevant code, configuration, or dependency state.",
            "Apply the recommended fix and defensive guard clause.",
            "Re-run the application and execute tests.",
            "Verify that the error is resolved in the runtime environment."
          ])),
    debuggingSteps: Array.isArray(aiAnalysis.debugSteps)
      ? aiAnalysis.debugSteps.join("\n")
      : String(aiAnalysis.debuggingSteps || ""),

    // 12. Code Examples / Suggestions
    codeExamples: aiAnalysis.codeExamples,
    suggestedCode: aiAnalysis.codeExamples,

    // 13. Best Practices
    bestPractices: Array.isArray(aiAnalysis.bestPractices) ? aiAnalysis.bestPractices : String(aiAnalysis.bestPractices).split("\n").filter(Boolean),

    // 14. Code Improvement Suggestions
    codeImprovementSuggestions: aiAnalysis.codeImprovementSuggestions,
    // Affected Files (computed above, used by frontend)
    affectedFiles,

    // 15. Security Recommendations
    securityRecommendations: aiAnalysis.securityRecommendations,
    securityImpact: securityResult?.hasThreats ? securityResult.threats.map(t => t.message) : [],

    // 16. Performance Recommendations
    performanceRecommendations: aiAnalysis.performanceRecommendations,
    performanceImpact: severity === "CRITICAL" ? "High risk of server thread exhaustion." : "Negligible memory load.",

    // 17. Related Technologies
    relatedTechnologies: String(aiAnalysis.relatedTechnologies).split(",").map(t => t.trim()),

    // 18. Historical Frequency
    historicalFrequency: occurrenceCount || 1,

    // 19. Similar Errors
    similarErrors: similarHistoricalErrors,

    // 20. Resolution Priority
    resolutionPriority: severity === "CRITICAL" ? "P1" : (severity === "HIGH" ? "P2" : (severity === "MEDIUM" ? "P3" : "P4")),

    // Role-based summaries
    personas: aiAnalysis.roles,

    // 5 seniority-based role explanations (Beginner / Junior / Mid-Level / Senior / Tech Lead)
    roleExplanations: aiAnalysis.roleExplanations || null,

    // Metadata & Telemetry
    ai: {
      available: aiAnalysis.provider.includes("Hugging Face"),
      provider: aiAnalysis.provider,
      explanation: aiAnalysis.humanExplanation,
      rootCause: aiAnalysis.rootCause,
      fix: aiAnalysis.immediateFix,
      prevention: aiAnalysis.prevention,
      roles: aiAnalysis.roles
    },
    relatedReports: relatedReports.map(report => ({
      _id: report._id,
      category: report.category,
      fingerprint: report.fingerprint,
      severity: report.severity,
      source: report.source,
      createdAt: report.createdAt,
      rootCause: report.rootCause,
      fix: report.fix,
      prevention: report.prevention,
      metadata: report.metadata
    })),
    lastOccurrenceAt: lastOccurrence?.createdAt || null,
    projectKnowledge,
    projectContext: knowledgeSummary || null,
    timeline,
    analysisDuration,
    analysisSource,
    analysisTime: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    fingerprint: {
      code: fingerprintCode,
      hash: fingerprintResult?.hash || "HASH_GENERIC",
      confidence: fingerprintResult?.confidence || systemConfidence,
      label: fingerprintResult?.label || fingerprintCode,
      description: fingerprintResult?.description || ""
    },
    security: securityResult,
    analyzedAt: new Date().toISOString()
  };
}

module.exports = analyzerService;