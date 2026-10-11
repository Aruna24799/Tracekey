/**
 * securityService.js
 *
 * TraceKey Security Intelligence Engine.
 * Centralized security scanner used by every analysis source:
 *   - Manual Error / Stack Trace / Console Logs
 *   - Screenshot OCR (via extracted text)
 *   - Folder / ZIP upload (via file content)
 *   - SDK Runtime Events / Telemetry
 *
 * All sources pass through the SAME pipeline.
 *
 * Detection capabilities:
 *   - API Keys (Google, AWS, Azure, OpenAI, GCP, etc.)
 *   - Secrets & Tokens (JWT, OAuth, Bearer)
 *   - Credentials (passwords, database URIs, SSH keys)
 *   - Dangerous patterns (XSS, SQLi, command injection, path traversal)
 *   - Weak configurations (insecure URLs, deserialization risks)
 *   - Private keys & certificates
 *
 * Returns { hasThreats, count, threats, securityScore, riskLevel,
 *           owaspCategories, cweMappings, roleReports, ... }
 *
 * When Hugging Face is available, it enriches findings with
 * AI-powered security analysis and recommendations.
 */

const huggingFaceService = require("./huggingFaceService");

// ============================================================
// THREAT SIGNATURE MAP — Hash-based lookup for O(1) matching
// Structure: { patternKey: { regex, type, message, owasp, cwe, cvss, category } }
// ============================================================
const THREAT_SIGNATURES = [
  // ─── API KEYS ───────────────────────────────────────────────
  {
    id: "GOOGLE_API_KEY",
    regex: /AIza[0-9A-Za-z\-_]{35}/,
    type: "CRITICAL",
    message: "Google API Key Exposed",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-798 (Use of Hard-coded Credentials)",
    cvss: 9.0,
    category: "API_KEY"
  },
  {
    id: "OPENAI_API_KEY",
    regex: /sk-[a-zA-Z0-9]{32,}/,
    type: "CRITICAL",
    message: "OpenAI API Key Exposed",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-798 (Use of Hard-coded Credentials)",
    cvss: 9.0,
    category: "API_KEY"
  },
  {
    id: "AWS_ACCESS_KEY",
    regex: /AKIA[0-9A-Z]{16}/,
    type: "CRITICAL",
    message: "AWS Access Key Exposed",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-798 (Use of Hard-coded Credentials)",
    cvss: 9.5,
    category: "API_KEY"
  },
  {
    id: "AZURE_KEY",
    regex: /(?:AccountKey|DefaultEndpointsProtocol|BlobEndpoint|QueueEndpoint|TableEndpoint|FileEndpoint)=/,
    type: "CRITICAL",
    message: "Azure Storage Account Credentials Exposed",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-798 (Use of Hard-coded Credentials)",
    cvss: 9.0,
    category: "API_KEY"
  },
  {
    id: "GCP_SERVICE_ACCOUNT",
    regex: /"type"\s*:\s*"service_account"/,
    type: "CRITICAL",
    message: "GCP Service Account Key Exposed",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-798 (Use of Hard-coded Credentials)",
    cvss: 9.5,
    category: "API_KEY"
  },

  // ─── DATABASE CREDENTIALS ──────────────────────────────────
  {
    id: "MONGO_URI_CREDS",
    regex: /mongodb(?:\+srv)?:\/\/[a-zA-Z0-9_.-]+:[^@]+@/,
    type: "CRITICAL",
    message: "MongoDB Connection String with Exposed Credentials",
    owasp: "OWASP-M2 (Insecure Data Storage)",
    cwe: "CWE-522 (Insufficiently Protected Credentials)",
    cvss: 9.0,
    category: "DATABASE"
  },
  {
    id: "SQL_CONNECTION_STRING",
    regex: /(?:Server|Data Source)\s*=\s*[^;]+;\s*(?:User|User ID|UID)\s*=\s*[^;]+;\s*Password\s*=/i,
    type: "CRITICAL",
    message: "SQL Database Connection String with Credentials Exposed",
    owasp: "OWASP-M2 (Insecure Data Storage)",
    cwe: "CWE-522 (Insufficiently Protected Credentials)",
    cvss: 8.5,
    category: "DATABASE"
  },

  // ─── PRIVATE KEYS & CERTIFICATES ───────────────────────────
  {
    id: "RSA_PRIVATE_KEY",
    regex: /-----BEGIN RSA PRIVATE KEY-----/,
    type: "CRITICAL",
    message: "RSA Private Key Material Leaked",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-312 (Cleartext Storage of Sensitive Information)",
    cvss: 10.0,
    category: "PRIVATE_KEY"
  },
  {
    id: "PRIVATE_KEY",
    regex: /-----BEGIN PRIVATE KEY-----/,
    type: "CRITICAL",
    message: "Private Key Material Leaked",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-312 (Cleartext Storage of Sensitive Information)",
    cvss: 10.0,
    category: "PRIVATE_KEY"
  },
  {
    id: "SSH_PRIVATE_KEY",
    regex: /-----BEGIN OPENSSH PRIVATE KEY-----|-----BEGIN SSH2 ENCRYPTED PRIVATE KEY-----/,
    type: "CRITICAL",
    message: "SSH Private Key Exposed",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-312 (Cleartext Storage of Sensitive Information)",
    cvss: 10.0,
    category: "PRIVATE_KEY"
  },
  {
    id: "PGP_PRIVATE_KEY",
    regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/,
    type: "CRITICAL",
    message: "PGP Private Key Exposed",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-312 (Cleartext Storage of Sensitive Information)",
    cvss: 9.5,
    category: "PRIVATE_KEY"
  },

  // ─── TOKENS & SESSION SECRETS ──────────────────────────────
  {
    id: "JWT_TOKEN",
    regex: /(?:(?:Bearer|bearer)\s+)?eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
    type: "HIGH",
    message: "JWT Token Exposed in Error/Log Output",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-532 (Insertion of Sensitive Info into Log File)",
    cvss: 7.5,
    category: "TOKEN"
  },
  {
    id: "OAUTH_TOKEN",
    regex: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}/,
    type: "HIGH",
    message: "GitHub OAuth Token Exposed",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-798 (Use of Hard-coded Credentials)",
    cvss: 8.5,
    category: "TOKEN"
  },
  {
    id: "OAUTH_REFRESH_TOKEN",
    regex: /1\/\/[a-zA-Z0-9_-]{40,}/,
    type: "CRITICAL",
    message: "OAuth Refresh Token Exposed",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-798 (Use of Hard-coded Credentials)",
    cvss: 9.0,
    category: "TOKEN"
  },
  {
    id: "SLACK_TOKEN",
    regex: /xox[baprs]-[a-zA-Z0-9]{10,}/,
    type: "HIGH",
    message: "Slack API Token Exposed",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-798 (Use of Hard-coded Credentials)",
    cvss: 8.0,
    category: "TOKEN"
  },

  // ─── HARDCODED CREDENTIALS ─────────────────────────────────
  {
    id: "HARDCODED_PASSWORD",
    regex: /password\s*[:=]\s*["']?[^"'\s]{4,}/i,
    type: "CRITICAL",
    message: "Hardcoded Password Detected in Code/Log Output",
    owasp: "OWASP-M5 (Insecure Cryptography - Credential Management)",
    cwe: "CWE-259 (Use of Hard-coded Password)",
    cvss: 8.5,
    category: "CREDENTIAL"
  },
  {
    id: "HARDCODED_SECRET",
    regex: /secret\s*[:=]\s*["']?[^"'\s]{8,}/i,
    type: "HIGH",
    message: "Hardcoded Secret Key in Error/Log Context",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-798 (Use of Hard-coded Credentials)",
    cvss: 7.5,
    category: "CREDENTIAL"
  },
  {
    id: "HARDCODED_API_KEY_VAR",
    regex: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][^"']{8,}["']/i,
    type: "HIGH",
    message: "Hardcoded API Key Assignment Detected",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-798 (Use of Hard-coded Credentials)",
    cvss: 8.0,
    category: "CREDENTIAL"
  },

  // ─── FINANCIAL DATA ────────────────────────────────────────
  {
    id: "CREDIT_CARD",
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/,
    type: "HIGH",
    message: "Potential Credit Card Number Exposed in Log Output",
    owasp: "OWASP-M3 (Sensitive Data Exposure)",
    cwe: "CWE-359 (Exposure of Private Information)",
    cvss: 8.0,
    category: "FINANCIAL"
  },

  // ─── INSECURE CONFIGURATION ────────────────────────────────
  {
    id: "HTTP_URL",
    regex: /http:\/\//,
    type: "MEDIUM",
    message: "Insecure HTTP URL Detected (HTTPS recommended)",
    owasp: "OWASP-M4 (Insecure Communication)",
    cwe: "CWE-319 (Cleartext Transmission of Sensitive Information)",
    cvss: 5.0,
    category: "CONFIGURATION"
  },
  {
    id: "ENV_FILE_EXPOSED",
    regex: /\.env[\s"']|\.env\.local[\s"']|\.env\.production[\s"']/i,
    type: "MEDIUM",
    message: "Environment Configuration File Reference Detected",
    owasp: "OWASP-M2 (Insecure Data Storage)",
    cwe: "CWE-200 (Exposure of Sensitive Information)",
    cvss: 5.5,
    category: "CONFIGURATION"
  },

  // ─── INJECTION ATTACKS ─────────────────────────────────────
  {
    id: "XSS_SCRIPT_TAG",
    regex: /<script\b[^>]*>([\s\S]*?)<\/script>/i,
    type: "HIGH",
    message: "Potential Cross-Site Scripting (XSS) Injection Detected",
    owasp: "OWASP-M7 (Client-Side Injection)",
    cwe: "CWE-79 (Cross-site Scripting)",
    cvss: 7.5,
    category: "INJECTION"
  },
  {
    id: "XSS_JAVASCRIPT",
    regex: /javascript:\s*(?:void\s*\(?\s*0\s*\)?|[\s\S]*?)/i,
    type: "HIGH",
    message: "Potential XSS via JavaScript URI Detected",
    owasp: "OWASP-M7 (Client-Side Injection)",
    cwe: "CWE-79 (Cross-site Scripting)",
    cvss: 7.5,
    category: "INJECTION"
  },
  {
    id: "SQL_INJECTION",
    regex: /\b(?:UNION\s+SELECT|SELECT\s+.*?\s+FROM|INSERT\s+INTO|DROP\s+TABLE|DELETE\s+FROM|ALTER\s+TABLE|CREATE\s+TABLE|TRUNCATE\s+TABLE|EXEC\s*\(|xp_cmdshell)\b/i,
    type: "HIGH",
    message: "Potential SQL Injection Pattern Detected",
    owasp: "OWASP-M1 (SQL Injection)",
    cwe: "CWE-89 (SQL Injection)",
    cvss: 9.0,
    category: "INJECTION"
  },
  {
    id: "COMMAND_INJECTION",
    regex: /(?:;\s*(?:rm|cat|curl|wget|bash|sh|powershell|cmd)\s|`[^`]+`|\$\([^)]+\))/i,
    type: "CRITICAL",
    message: "Potential Command Injection Detected",
    owasp: "OWASP-M1 (Command Injection)",
    cwe: "CWE-77 (Command Injection)",
    cvss: 9.5,
    category: "INJECTION"
  },
  {
    id: "PATH_TRAVERSAL",
    regex: /\.\.\/|\.\.\\|\.\.\%2f|\.\.\%5c/i,
    type: "MEDIUM",
    message: "Potential Path Traversal Attack Pattern Detected",
    owasp: "OWASP-M5 (Path Traversal)",
    cwe: "CWE-22 (Path Traversal)",
    cvss: 6.5,
    category: "INJECTION"
  },
  {
    id: "INSECURE_DESERIALIZATION",
    regex: /JSON\.parse\([^)]*\)|eval\([^)]+\)|new\s+Function\(|unserialize\(/i,
    type: "MEDIUM",
    message: "Potential Insecure Deserialization Pattern Detected",
    owasp: "OWASP-M8 (Insecure Deserialization)",
    cwe: "CWE-502 (Deserialization of Untrusted Data)",
    cvss: 6.0,
    category: "INJECTION"
  },
];

/**
 * Severity rank order for priority sorting.
 */
const SEVERITY_WEIGHTS = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

/**
 * Compute an aggregate security score from matched threats.
 * Higher score = more severe security posture.
 * Returns score from 0 (secure) to 100 (critical), risk level,
 * and CVSS-style max severity of all threats.
 */
function computeSecurityScore(threats) {
  if (!threats || threats.length === 0) {
    return {
      score: 100,
      riskLevel: "SECURE",
      maxCvss: 0,
      threatCount: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
    };
  }

  let score = 100;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let maxCvss = 0;

  threats.forEach(t => {
    const cvss = t.cvss || 0;
    if (cvss > maxCvss) maxCvss = cvss;

    const type = (t.type || "LOW").toUpperCase();
    if (type === "CRITICAL") criticalCount++;
    else if (type === "HIGH") highCount++;
    else if (type === "MEDIUM") mediumCount++;

    // Deduct based on CVSS severity
    if (cvss >= 9.0) score -= 20;
    else if (cvss >= 7.0) score -= 12;
    else if (cvss >= 5.0) score -= 6;
    else score -= 3;
  });

  score = Math.max(0, Math.min(100, score));

  let riskLevel = "SECURE";
  if (score < 30) riskLevel = "CRITICAL";
  else if (score < 50) riskLevel = "HIGH";
  else if (score < 75) riskLevel = "MEDIUM";
  else if (score < 90) riskLevel = "LOW";

  return {
    score,
    riskLevel,
    maxCvss,
    threatCount: threats.length,
    criticalCount,
    highCount,
    mediumCount,
  };
}

/**
 * Collect all unique OWASP categories and CWE mappings from a threat list.
 */
function collectOwaspCwe(threats) {
  const owaspCategories = [];
  const cweMappings = [];
  const seenOwasp = new Set();
  const seenCwe = new Set();

  threats.forEach(t => {
    if (t.owasp && !seenOwasp.has(t.owasp)) {
      seenOwasp.add(t.owasp);
      owaspCategories.push(t.owasp);
    }
    if (t.cwe && !seenCwe.has(t.cwe)) {
      seenCwe.add(t.cwe);
      cweMappings.push(t.cwe);
    }
  });

  return { owaspCategories, cweMappings };
}

/**
 * Generate role-based security reports from detected threats.
 */
function generateSecurityRoleReports(threats) {
  if (!threats || threats.length === 0) {
    return {
      developer: "No security threats detected in this analysis.",
      qa: "No security test cases required. No vulnerabilities found.",
      manager: "Security posture is clean. No risks identified.",
      devops: "Infrastructure security check passed. No configuration risks.",
      security: "Security audit complete. No findings to report."
    };
  }

  const crit = threats.filter(t => t.type === "CRITICAL");
  const high = threats.filter(t => t.type === "HIGH");
  const med = threats.filter(t => t.type === "MEDIUM");

  // Developer report
  const devLines = threats.map(t =>
    `- [${t.type}] ${t.message} (${t.cwe || "N/A"})`
  );
  const developer = `Security vulnerabilities detected in code/input:\n${devLines.join("\n")}\n\nFix priority: ${crit.length > 0 ? "CRITICAL — resolve immediately" : high.length > 0 ? "HIGH — resolve before deployment" : "MEDIUM — review at next opportunity"}`;

  // QA report
  const qa = crit.length > 0
    ? `CRITICAL security test cases required: ${crit.length} critical vulnerabilities must be verified. Review secure coding compliance immediately.`
    : `Security validation: ${threats.length} finding(s) to review. Verify fixes and regression test all affected endpoints.`;

  // Manager report
  const manager = `Security Risk Summary: ${crit.length} critical, ${high.length} high, ${med.length} medium threats. ${crit.length > 0 ? "Business impact: HIGH — immediate remediation required." : "Risk level: manageable with standard patch cycle."}`;

  // DevOps report
  const devops = crit.length > 0
    ? `Infrastructure security ALERT: ${crit.length} critical credential exposure(s) detected. Rotate keys immediately in secret manager. Verify deployment pipeline secrets are not logged.`
    : `Infrastructure security: ${threats.length} finding(s). Review configuration and environment variable handling.`;

  // Security report
  const secLines = threats.map(t =>
    `- ${t.message} (${t.type}) | OWASP: ${t.owasp || "N/A"} | CWE: ${t.cwe || "N/A"} | CVSS: ${t.cvss || "N/A"}`
  );
  const security = `Security Audit Report\n${"=".repeat(40)}\n${secLines.join("\n")}\n${"=".repeat(40)}\nTotal: ${threats.length} finding(s) across ${crit.length} critical, ${high.length} high, ${med.length} medium severity.\nCompliance: Review OWASP categories and CWE mappings above.`;

  return { developer, qa, manager, devops, security };
}

/**
 * Main security scanning pipeline.
 *
 * @param {string} input - Error text, file content, or log output
 * @returns {Promise<object>} Structured security analysis result
 */
async function securityService(input) {
  // Handle null/empty input
  if (!input || typeof input !== "string") {
    return {
      hasThreats: false,
      count: 0,
      threats: [],
      securityScore: 100,
      riskLevel: "SECURE",
      maxCvss: 0,
      threatCount: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      owaspCategories: [],
      cweMappings: [],
      roleReports: generateSecurityRoleReports([]),
    };
  }

  const text = input;
  const threats = [];
  const matchedIds = new Set(); // Deduplication set

  // ============================================================
  // STAGE 1: FAST PATTERN MATCHING via THREAT_SIGNATURES
  // Uses the THREAT_SIGNATURES array as a searchable registry.
  // Each entry has its own compiled regex for direct matching.
  // ============================================================
  for (const signature of THREAT_SIGNATURES) {
    if (signature.regex.test(text) && !matchedIds.has(signature.id)) {
      matchedIds.add(signature.id);
      threats.push({
        id: signature.id,
        type: signature.type,
        message: signature.message,
        owasp: signature.owasp,
        cwe: signature.cwe,
        cvss: signature.cvss,
        category: signature.category,
      });
    }
  }

  // ============================================================
  // STAGE 2: RISK SCORING & CLASSIFICATION
  // ============================================================
  const securityScoreResult = computeSecurityScore(threats);
  const { owaspCategories, cweMappings } = collectOwaspCwe(threats);
  const roleReports = generateSecurityRoleReports(threats);

  // Sort threats by severity (critical first)
  threats.sort((a, b) => (SEVERITY_WEIGHTS[b.type] || 0) - (SEVERITY_WEIGHTS[a.type] || 0));

  // ============================================================
  // STAGE 3: AI ENRICHMENT (optional — via huggingFaceService)
  // If Hugging Face is configured, enhance findings with
  // AI-powered security recommendations.
  // ============================================================
  let aiSecurityAnalysis = null;
  if (threats.length > 0) {
    try {
      const recResult = await huggingFaceService.generateRecommendations(input, "SECURITY").catch(() => null);
      if (recResult?.recommendations) {
        aiSecurityAnalysis = {
          aiRecommendations: recResult.recommendations,
          enriched: true,
        };
      }
    } catch (_) {
      // AI enrichment is optional — silently continue
    }
  }

  // ============================================================
  // STAGE 4: BUILD AND RETURN STRUCTURED RESPONSE
  // Preserves backward-compatible fields: hasThreats, count, threats
  // Adds new enriched fields for role-based reporting and scoring
  // ============================================================
  return {
    // Backward-compatible fields (preserved for analyzerService, analysisController, etc.)
    hasThreats: threats.length > 0,
    count: threats.length,
    threats,

    // New enriched security intelligence fields
    securityScore: securityScoreResult.score,
    riskLevel: securityScoreResult.riskLevel,
    maxCvss: securityScoreResult.maxCvss,
    threatCount: securityScoreResult.threatCount,
    criticalCount: securityScoreResult.criticalCount,
    highCount: securityScoreResult.highCount,
    mediumCount: securityScoreResult.mediumCount,

    // OWASP & CWE taxonomies
    owaspCategories,
    cweMappings,

    // Role-based reports
    roleReports,

    // AI enrichment (optional)
    aiSecurityAnalysis,
  };
}

module.exports = securityService;