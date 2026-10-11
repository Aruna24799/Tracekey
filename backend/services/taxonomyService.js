const categories = {
  NULL_ERROR: {
    name: "Null/Undefined Dereference",
    description: "Application attempted to read properties or access variables of a null or undefined object.",
    defaultSeverity: "HIGH",
    prevention: "Validate inputs, utilize optional chaining (?.) and implement initialization guard clauses.",
    fix: "Add optional chaining: obj?.prop or guard: if(!obj) return;",
    debugSteps: [
      "Check the exact line of failure in the stack trace.",
      "Print the parent object to inspect its runtime shape.",
      "Verify backend response API formats."
    ],
    signatures: [/cannot read properties of/i, /null/i, /undefined/i, /is not a function/i, /is not an object/i]
  },
  NETWORK_ERROR: {
    name: "Network & HTTP Failure",
    description: "Failures relating to HTTP requests, CORS, network offline, or timeout.",
    defaultSeverity: "MEDIUM",
    prevention: "Always implement request timeout boundaries, try-catch wrappers, and request abort mechanisms on component unmount.",
    fix: "Implement try-catch, verify CORS headers on server, and check network status.",
    debugSteps: [
      "Open browser DevTools -> Network tab.",
      "Check server CORS configurations.",
      "Inspect backend service availability and connectivity."
    ],
    signatures: [/fetch/i, /network/i, /cors/i, /timeout/i, /failed to fetch/i, /http/i, /request/i]
  },
  AUTH_ERROR: {
    name: "Authentication & Authorization fault",
    description: "Problems validating identity tokens, credentials, or session clearances.",
    defaultSeverity: "HIGH",
    prevention: "Ensure JWT tokens are stored securely, validated on every request, and handled with automatic session refreshers.",
    fix: "Verify Authorization header and token lifespan. Implement redirect to login on 401/403.",
    debugSteps: [
      "Check token storage and cookie/localStorage flags.",
      "Decode token payload at jwt.io to check exp field.",
      "Validate server matching secret key keys."
    ],
    signatures: [/unauthorized/i, /forbidden/i, /token/i, /auth/i, /jwt/i, /401/i, /403/i]
  },
  SERVER_ERROR: {
    name: "Internal Server Fault",
    description: "Server-side exceptions, database crashes, or 500 server responses.",
    defaultSeverity: "HIGH",
    prevention: "Wrap database queries and route controllers in try-catch blocks and log backend exceptions systematically.",
    fix: "Review backend logs, test backend endpoints directly, and verify database connectivity.",
    debugSteps: [
      "Read backend console logs and stack traces.",
      "Verify database cluster state.",
      "Use direct API testing tools (curl, postman) to isolate routes."
    ],
    signatures: [/500/i, /internal server/i, /db/i, /mongo/i, /server fault/i, /crash/i]
  },
  ASYNC_ERROR: {
    name: "Async Control Flow Error",
    description: "Issues with promises, unhandled rejections, or missing await declarations.",
    defaultSeverity: "HIGH",
    prevention: "Ensure all Promise declarations are returned with catch handlers or executed inside async functions utilizing try-catch.",
    fix: "Await the async functions, wrap in try-catch block, or append .catch() handler.",
    debugSteps: [
      "Identify unawaited async function calls in control flow.",
      "Trace the lifecycle of the Promise object.",
      "Insert log checkpoints to verify function completion sequence."
    ],
    signatures: [/async/i, /await/i, /promise/i, /unhandledrejection/i, /then/i]
  },
  REACT_ERROR: {
    name: "React Lifecycle Hook Failure",
    description: "Issues related to component rendering, hooks usage, cleanup omissions, or state updates.",
    defaultSeverity: "MEDIUM",
    prevention: "Avoid side effects in components that do not clear sub-actions. Maintain accurate hook dependency lists.",
    fix: "Provide hook dependencies, clean up subscriptions inside useEffect, and avoid state loops.",
    debugSteps: [
      "Observe rendering frequency in React DevTools.",
      "Inspect useEffect dependency matrices.",
      "Audit lifecycle cleanup hooks."
    ],
    signatures: [/useeffect/i, /render/i, /hook/i, /component/i, /re-render/i, /state/i, /mount/i]
  },
  SECURITY_ERROR: {
    name: "Critical Security Threat",
    description: "Credential leakage, protocol downgrade, or critical threat exposures.",
    defaultSeverity: "CRITICAL",
    prevention: "Use environment variables strictly, rotate credentials immediately on exposure, and secure data in transport.",
    fix: "Regenerate exposed keys immediately. Relocate secrets to environment configs.",
    debugSteps: [
      "Identify the exact location of credential leakage.",
      "Replace string literals with reference bindings.",
      "Configure .env files and add to .gitignore."
    ],
    signatures: [/api key/i, /exposed/i, /sk-/, /aiza/i, /akia/i, /password/i, /secret/i]
  },
  UNKNOWN_ERROR: {
    name: "Unclassified Error Condition",
    description: "An unclassified application error occurred.",
    defaultSeverity: "MEDIUM",
    prevention: "Apply detailed trace logging across standard functions.",
    fix: "Verify logs manually and isolate source lines.",
    debugSteps: [
      "Check browser console stack traces.",
      "Step-through code execution using debugger breakpoints.",
      "Search standard developer references."
    ],
    signatures: []
  }
};

/**
 * Classify a raw error string based on signature weight
 * @param {string} error
 */
function classify(error) {
  if (!error) return { category: "UNKNOWN_ERROR", ...categories.UNKNOWN_ERROR };

  const text = error.toLowerCase();
  let bestCategory = "UNKNOWN_ERROR";
  let maxWeight = 0;

  for (const [key, category] of Object.entries(categories)) {
    if (key === "UNKNOWN_ERROR") continue;
    let matchCount = 0;
    category.signatures.forEach(sig => {
      if (sig.test(text)) {
        matchCount++;
      }
    });

    if (matchCount > maxWeight) {
      maxWeight = matchCount;
      bestCategory = key;
    }
  }

  return {
    category: bestCategory,
    ...categories[bestCategory]
  };
}

module.exports = {
  categories,
  classify
};
