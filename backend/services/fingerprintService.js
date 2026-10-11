const ASYNC_VOID = require("../fingerprints/ASYNC_VOID");
const NULL_CHAIN = require("../fingerprints/NULL_CHAIN");
const RACE_FETCH = require("../fingerprints/RACE_FETCH");
const STALE_CLOSURE = require("../fingerprints/STALE_CLOSURE");
const MISSING_GUARD = require("../fingerprints/MISSING_GUARD");
const CATCH_SWALLOW = require("../fingerprints/CATCH_SWALLOW");
const EFFECT_CLEANUP_MISS = require("../fingerprints/EFFECT_CLEANUP_MISS");
const RESPONSE_UNCHECKED = require("../fingerprints/RESPONSE_UNCHECKED");
const SECRET_HARDCODE = require("../fingerprints/SECRET_HARDCODE");
const INFINITE_EFFECT = require("../fingerprints/INFINITE_EFFECT");

const registry = [
  ASYNC_VOID,
  NULL_CHAIN,
  RACE_FETCH,
  STALE_CLOSURE,
  MISSING_GUARD,
  CATCH_SWALLOW,
  EFFECT_CLEANUP_MISS,
  RESPONSE_UNCHECKED,
  SECRET_HARDCODE,
  INFINITE_EFFECT,
];

async function fingerprintService(error) {
  if (!error) {
    return getUnclassifiedResult();
  }

  const matches = [];

  for (const finger of registry) {
    let matchCount = 0;

    for (const signature of finger.signatures || []) {
      try {
        if (signature.test(error)) {
          matchCount++;
        }
      } catch {}
    }

    if (matchCount > 0) {
      const matchRatio =
        matchCount /
        Math.max(
          finger.signatures.length,
          1
        );

      const confidence = Number(
        (
          finger.confidence *
          (0.8 + 0.2 * matchRatio)
        ).toFixed(2)
      );

      matches.push({
        code: finger.id,
        label: finger.label,

        category: finger.category,

        description:
          finger.description ||

          finger.label ||

          "Known error pattern detected.",

        severity: finger.severity,

        confidence,

        fixTemplate:
          finger.fixTemplate,

        prevention:
          finger.prevention,

        debugSteps:
          finger.debugSteps || [],
      });
    }
  }

  if (matches.length > 0) {
    matches.sort(
      (a, b) =>
        b.confidence -
        a.confidence
    );

    return matches[0];
  }

  return getUnclassifiedResult();
}

function getUnclassifiedResult() {
  return {
    code: "UNKNOWN_PATTERN",

    label:
      "Unclassified Error Pattern",

    category:
      "UNKNOWN_ERROR",

    description:
      "Unable to match the error against a known fingerprint.",

    severity: "LOW",

    confidence: 0,

    fixTemplate:
      "Inspect stack trace and runtime logs.",

    prevention:
      "Enable structured logging and runtime monitoring.",

    debugSteps: [
      "Review stack trace.",
      "Inspect logs.",
      "Check runtime telemetry.",
    ],
  };
}

module.exports =
  fingerprintService;