/**
 * huggingFaceService.js
 * Hugging Face Inference API integration for TraceKey.
 *
 * Models used (both free on HF Inference API):
 *   - facebook/bart-large-mnli   → zero-shot error classification
 *   - google/flan-t5-large       → instruction-tuned explanation / fix generation
 *
 * Gracefully falls back to null when:
 *   - HF_API_KEY is not set
 *   - HF service is rate-limited or unreachable
 */

const HF_API_BASE = "https://api-inference.huggingface.co/models";
// Module-level fallback — evaluated once at startup.
// Per-request keys are passed directly to hfCall() as the 4th argument.
const HF_API_KEY_DEFAULT = process.env.HF_API_KEY || "";

// Error categories that BART can classify against
const ERROR_LABELS = [
  "null reference error",
  "network connection error",
  "authentication authorization error",
  "server internal error",
  "async promise rejection",
  "react component rendering error",
  "database query error",
  "security vulnerability",
  "build compilation error",
  "memory performance error",
  "deployment configuration error",
  "dependency module error",
  "syntax parsing error",
  "unknown runtime error",
];

/**
 * Perform a raw HF Inference API call.
 * Returns parsed JSON or null on any failure.
 *
 * @param {string} model
 * @param {object} payload
 * @param {number} [timeoutMs=12000]
 * @param {string} [apiKey] - Optional per-request key; falls back to HF_API_KEY_DEFAULT.
 */
async function hfCall(model, payload, timeoutMs = 12000, apiKey = "") {
  // Resolve the key: prefer explicit per-request key, then env default.
  const keyToUse = (apiKey && !apiKey.startsWith("hf_REPLACE"))
    ? apiKey
    : (HF_API_KEY_DEFAULT && !HF_API_KEY_DEFAULT.startsWith("hf_REPLACE") ? HF_API_KEY_DEFAULT : "");

  if (!keyToUse) {
    return null; // not configured – skip silently
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${HF_API_BASE}/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${keyToUse}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[HF] Model ${model} returned ${res.status}: ${body.slice(0, 120)}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name !== "AbortError") {
      console.warn(`[HF] Call to ${model} failed: ${err.message}`);
    }
    return null;
  }
}

/**
 * Extract a single generated_text from an HF response array or object.
 */
function extractGeneratedText(result) {
  if (!result) return null;
  const text = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
  return text ? text.trim() : null;
}

/**
 * Zero-shot classify the raw error text against known error category labels.
 * Returns the top label and its score, or null on failure.
 *
 * @param {string} errorText
 * @returns {Promise<{label:string, score:number}|null>}
 */
async function classifyError(errorText) {
  const snippet = errorText.slice(0, 512); // BART input limit

  const result = await hfCall("facebook/bart-large-mnli", {
    inputs: snippet,
    parameters: {
      candidate_labels: ERROR_LABELS,
      multi_label: false,
    },
  });

  if (!result || !Array.isArray(result.labels)) return null;

  return {
    label: result.labels[0],
    score: Math.round(result.scores[0] * 100),
  };
}

/**
 * Generate a human-friendly explanation + immediate fix for the given error
 * using google/flan-t5-large (instruction-tuned, free tier).
 *
 * Returns an object with { summary, fix, prevention } or null on failure.
 *
 * @param {string} errorText
 * @param {string} category  - e.g. "NULL_ERROR"
 * @param {string} [apiKey]  - Optional per-request HF API key.
 */
async function generateExplanation(errorText, category, apiKey = "") {
  const snippet = errorText.slice(0, 400);

  // --- Summary ---
  const summaryResult = await hfCall("google/flan-t5-large", {
    inputs: `Summarize this developer error in one clear sentence for a non-technical user:\n\n${snippet}`,
    parameters: { max_new_tokens: 80, temperature: 0.3 },
  }, 12000, apiKey);

  const summary = extractGeneratedText(summaryResult);

  // --- Immediate fix ---
  const fixResult = await hfCall("google/flan-t5-large", {
    inputs: `What is the immediate code fix for this ${category} error? Give a concise technical answer with a code example if possible:\n\n${snippet}`,
    parameters: { max_new_tokens: 120, temperature: 0.2 },
  }, 12000, apiKey);

  const fix = extractGeneratedText(fixResult);

  // --- Prevention strategy ---
  const preventionResult = await hfCall("google/flan-t5-large", {
    inputs: `What is the best long-term prevention strategy to avoid this kind of ${category} error in production?\n\n${snippet}`,
    parameters: { max_new_tokens: 100, temperature: 0.2 },
  }, 12000, apiKey);

  const prevention = extractGeneratedText(preventionResult);

  if (!summary && !fix && !prevention) return null;

  return { summary, fix, prevention };
}

/**
 * Generate multi-role analysis sections using Flan-T5.
 * Returns { developer, qa, devops, security, manager } or null.
 *
 * @param {string} errorText
 * @param {string} category
 * @param {string} [apiKey] - Optional per-request HF API key.
 */
async function generateMultiRoleAnalysis(errorText, category, apiKey = "") {
  const snippet = errorText.slice(0, 300);

  const roles = [
    {
      key: "developer",
      prompt: `As a senior developer, what is the technical root cause of this ${category} error and how should it be fixed?\n\n${snippet}`,
    },
    {
      key: "qa",
      prompt: `As a QA engineer, what regression tests should be written to catch this ${category} error?\n\n${snippet}`,
    },
    {
      key: "devops",
      prompt: `As a DevOps engineer, what infrastructure or deployment risks does this ${category} error introduce?\n\n${snippet}`,
    },
    {
      key: "security",
      prompt: `As a security engineer, what security vulnerabilities or risks does this ${category} error expose?\n\n${snippet}`,
    },
    {
      key: "manager",
      prompt: `As an engineering manager, summarize the business impact and estimated effort to fix this ${category} error.\n\n${snippet}`,
    },
  ];

  const results = {};
  for (const role of roles) {
    const r = await hfCall("google/flan-t5-large", {
      inputs: role.prompt,
      parameters: { max_new_tokens: 100, temperature: 0.3 },
    }, 12000, apiKey);
    results[role.key] = extractGeneratedText(r);
  }

  const hasAny = Object.values(results).some(Boolean);
  return hasAny ? results : null;
}

/**
 * Interpret a stack trace using Hugging Face.
 * Extracts the likely source file, function, and line context.
 *
 * @param {string} errorText - full error with stack trace
 * @param {string} category
 * @param {string} [apiKey] - Optional per-request HF API key.
 * @returns {Promise<{summary:string|null}|null>}
 */
async function interpretStackTrace(errorText, category, apiKey = "") {
  const snippet = errorText.slice(0, 400);
  const result = await hfCall("google/flan-t5-large", {
    inputs: `Analyze this ${category} stack trace. Which source function and file most likely caused the failure?\n\n${snippet}`,
    parameters: { max_new_tokens: 100, temperature: 0.2 },
  }, 12000, apiKey);
  const summary = extractGeneratedText(result);
  return summary ? { summary } : null;
}

/**
 * Analyze a code snippet for errors and suggest fixes.
 *
 * @param {string} codeSnippet
 * @param {string} [apiKey] - Optional per-request HF API key.
 * @returns {Promise<{explanation:string|null, fixSuggestion:string|null}|null>}
 */
async function analyzeCodeSnippet(codeSnippet, apiKey = "") {
  const snippet = codeSnippet.slice(0, 500);
  const [explanationResult, fixResult] = await Promise.all([
    hfCall("google/flan-t5-large", {
      inputs: `Explain the bug in this code:\n\n${snippet}`,
      parameters: { max_new_tokens: 120, temperature: 0.2 },
    }, 12000, apiKey),
    hfCall("google/flan-t5-large", {
      inputs: `Write the corrected version of this code:\n\n${snippet}`,
      parameters: { max_new_tokens: 150, temperature: 0.2 },
    }, 12000, apiKey),
  ]);
  const explanation = extractGeneratedText(explanationResult);
  const fixSuggestion = extractGeneratedText(fixResult);
  return (explanation || fixSuggestion) ? { explanation, fixSuggestion } : null;
}

/**
 * Generate framework-aware analysis of an error.
 *
 * @param {string} errorText
 * @param {string} framework - "React", "Node.js", "Next.js", etc.
 * @param {string} [apiKey] - Optional per-request HF API key.
 * @returns {Promise<{frameworkContext:string|null}|null>}
 */
async function generateFrameworkAnalysis(errorText, framework, apiKey = "") {
  const snippet = errorText.slice(0, 300);
  const result = await hfCall("google/flan-t5-large", {
    inputs: `How does this ${framework} error relate to ${framework}-specific patterns, APIs, or lifecycle methods?\n\n${snippet}`,
    parameters: { max_new_tokens: 100, temperature: 0.2 },
  }, 12000, apiKey);
  const frameworkContext = extractGeneratedText(result);
  return frameworkContext ? { frameworkContext } : null;
}

/**
 * Generate structured recommendations using Hugging Face.
 *
 * @param {string} errorText
 * @param {string} category
 * @param {string} [apiKey] - Optional per-request HF API key.
 * @returns {Promise<{recommendations:string|null}|null>}
 */
async function generateRecommendations(errorText, category, apiKey = "") {
  const snippet = errorText.slice(0, 300);
  const result = await hfCall("google/flan-t5-large", {
    inputs: `What are the top 3 actionable recommendations to fix and prevent this ${category} error?\n\n${snippet}`,
    parameters: { max_new_tokens: 120, temperature: 0.2 },
  }, 12000, apiKey);
  const recommendations = extractGeneratedText(result);
  return recommendations ? { recommendations } : null;
}

module.exports = {
  hfCall,
  classifyError,
  generateExplanation,
  generateMultiRoleAnalysis,
  interpretStackTrace,
  analyzeCodeSnippet,
  generateFrameworkAnalysis,
  generateRecommendations,
};
