function explainService(category) {
  const library = {
    NULL_ERROR: {
      rootCause: "Application attempted to access a property on an undefined or null object.",
      fix: "Add optional chaining (?.) before property access. Example: data?.user?.name",
      prevention: "Always validate API responses before accessing nested properties.",
      debugSteps: [
        "Open DevTools → Console tab",
        "Find the exact line throwing the error",
        "Add console.log() before the failing line to inspect the object",
        "Add null check: if (!data) return; before access"
      ]
    },
    NETWORK_ERROR: {
      rootCause: "Fetch request failed, timed out, or returned an unexpected response format.",
      fix: "Wrap fetch in try-catch and validate response.ok before parsing JSON.",
      prevention: "Implement retry logic with exponential backoff and timeout handling.",
      debugSteps: [
        "Open DevTools → Network tab",
        "Find the failed request and check status code",
        "Inspect request headers and response body",
        "Verify CORS headers are set on the server"
      ]
    },
    AUTH_ERROR: {
      rootCause: "Authentication token is missing, expired, or invalid.",
      fix: "Check token expiry before requests. Implement token refresh logic.",
      prevention: "Store tokens securely. Implement automatic refresh before expiry.",
      debugSteps: [
        "Check localStorage for token: localStorage.getItem('token')",
        "Decode token at jwt.io to check expiry",
        "Verify Authorization header is sent correctly",
        "Check server JWT_SECRET matches"
      ]
    },
    SERVER_ERROR: {
      rootCause: "Backend server encountered an unhandled exception or crashed.",
      fix: "Add global error handler in Express. Check server logs for stack trace.",
      prevention: "Implement proper try-catch in all async routes. Add error logging.",
      debugSteps: [
        "Check terminal/server logs for full stack trace",
        "Test the endpoint directly with Postman",
        "Add console.error() in the failing route",
        "Check database connection is active"
      ]
    }
  };

  return library[category] || {
    rootCause: "Error pattern not recognized. Manual inspection required.",
    fix: "Review the full stack trace and isolate the failing function.",
    prevention: "Add structured error logging throughout the application.",
    debugSteps: [
      "Paste full error into TraceKey for deeper analysis",
      "Check browser console and network tab",
      "Review recent code changes",
      "Add breakpoints around suspected code"
    ]
  };
}

module.exports = explainService;
