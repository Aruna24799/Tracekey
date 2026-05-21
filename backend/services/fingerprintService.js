async function fingerprintService(error) {
  const text = error.toLowerCase();

  if (text.includes("cannot read") || text.includes("undefined") || text.includes("null")) {
    return { code: "NULL_CHAIN", label: "Null Property Access", severity: "HIGH" };
  }
  if (text.includes("async") || text.includes("await") || text.includes("promise")) {
    return { code: "ASYNC_VOID", label: "Unhandled Async Operation", severity: "HIGH" };
  }
  if (text.includes("fetch") || text.includes("network") || text.includes("cors")) {
    return { code: "RACE_FETCH", label: "Fetch Race Condition", severity: "MEDIUM" };
  }
  if (text.includes("timeout") || text.includes("settimeout") || text.includes("interval")) {
    return { code: "STALE_CLOSURE", label: "Stale Closure in Timer", severity: "MEDIUM" };
  }
  if (text.includes("401") || text.includes("403") || text.includes("unauthorized")) {
    return { code: "AUTH_LEAK", label: "Authentication Failure", severity: "CRITICAL" };
  }
  if (text.includes("500") || text.includes("server error")) {
    return { code: "SERVER_FAULT", label: "Internal Server Error", severity: "HIGH" };
  }

  return { code: "UNKNOWN_PATTERN", label: "Unclassified Error", severity: "LOW" };
}

module.exports = fingerprintService;
