/**
 * Explain Service - Generates structured persona-based explanations
 * for Beginners, Developers, Security Analysts, and Ops (Operators).
 * Tailors descriptions dynamically based on the error category and content details.
 */
function explainService(category, errorText = "") {
  const normalizedError = errorText.toLowerCase();

  const personaLibrary = {
    NULL_ERROR: {
      beginner: {
        rootCause: "The computer tried to look at or use a piece of information that doesn't exist yet (it is 'null' or 'undefined'). Imagine opening an empty box thinking there is a toy inside.",
        fix: "Check if the item exists before opening it. In code, you can put a question mark '?' before accessing its details (optional chaining).",
        prevention: "Always make sure your data boxes are filled or check them first: `if (!item) { return; }`.",
        debugSteps: [
          "Find where the blank name or empty value is being printed.",
          "Check if your internet connection failed to load that data.",
          "Add a backup name like: `name || 'Guest User'`."
        ]
      },
      developer: {
        rootCause: "A property read dereference occurred on a null or undefined reference pointer.",
        fix: "Apply optional chaining (`data?.user?.profile`) or insert a guard statement: `if (!data) return;`.",
        prevention: "Enforce strict TypeScript types, runtime prop validation (Joi/Zod), or initialize state variables with empty mock objects.",
        debugSteps: [
          "Locate the failing line in the trace console.",
          "Place a console.log() or breakpoint immediately prior to inspect the state.",
          "Audit API payload contract shapes to ensure properties aren't renamed."
        ]
      },
      security: {
        rootCause: "Null pointers can be abused to trigger unexpected control flow escapes, leading to application crashes or denial of service (DoS).",
        fix: "Implement global error boundaries to catch crashes and prevent stack trace leaks to the client UI.",
        prevention: "Configure secure production builds that suppress verbose internal state details on crashes.",
        debugSteps: [
          "Verify that error stack traces are NOT visible to public users.",
          "Implement fail-safe fallbacks that return generic error pages instead of blank screens."
        ]
      },
      ops: {
        rootCause: "Unhandled dereferences cause Node.js event-loop interrupts. If uncaught, they will terminate the daemon processes.",
        fix: "Ensure Process Manager (PM2 / systemd) auto-restart policies are configured with crash loop protection.",
        prevention: "Set up container health checks (liveness probes) to restart stalled web nodes.",
        debugSteps: [
          "Check PM2 process restart counts (`pm2 list`).",
          "Analyze logs for repeated Uncaught Exceptions."
        ]
      }
    },
    NETWORK_ERROR: {
      beginner: {
        rootCause: "Your browser tried to talk to the server, but the message got lost, timed out, or was blocked.",
        fix: "Check your internet connection, refresh the webpage, or check if the backend server is turned off.",
        prevention: "Add a friendly loading spinner and a 'Try Again' button instead of freezing.",
        debugSteps: [
          "Verify your computer can open other websites.",
          "Make sure the backend server terminal is running.",
          "Double check if the server link is correct."
        ]
      },
      developer: {
        rootCause: "Fetch or XHR request failed. Common causes: CORS origin mismatch, network route offline, or missing server listener.",
        fix: "Wrap network requests in `try-catch` structures. Validate `response.ok` before attempting `.json()` parses.",
        prevention: "Implement connection retries with exponential backoffs, set reasonable timeouts (e.g. 5000ms), and utilize AbortController signals on component unmount.",
        debugSteps: [
          "Inspect DevTools -> Network tab for the exact HTTP status codes.",
          "Verify the request headers, particularly Origin, Access-Control-Allow-Origin, and Content-Type.",
          "Test the target server route directly via curl or REST client tools."
        ]
      },
      security: {
        rootCause: "Insecure network protocol usages or loose CORS policies expose data payloads to middleman snooping and origin hijacking.",
        fix: "Ensure all server origins strictly permit designated domains. Enforce HTTPS.",
        prevention: "Avoid wildcards (`*`) in Access-Control-Allow-Origin headers. Enforce HSTS.",
        debugSteps: [
          "Scan CORS configurations. Verify credentials support is turned off for wildcard origins.",
          "Ensure secure cookie attributes (Secure, HttpOnly, SameSite=Strict) are appended."
        ]
      },
      ops: {
        rootCause: "Excessive network timeouts pile up sockets in a TIME_WAIT state, depleting thread pools and degrading gateway performance.",
        fix: "Set proper load-balancer proxy timeouts. Verify firewall/security-groups permit port traffic.",
        prevention: "Configure circuit-breaker policies (e.g., using opossum) to fail fast when downstream APIs are offline.",
        debugSteps: [
          "Check socket connection limits (`netstat -an | grep ESTABLISHED | wc -l`).",
          "Inspect server proxy logs (Nginx/HAProxy) for 502/504 errors."
        ]
      }
    },
    AUTH_ERROR: {
      beginner: {
        rootCause: "The server does not know who you are, or your login key has expired.",
        fix: "Log out and log back in again to get a fresh security key.",
        prevention: "The app should automatically redirect you to the login page when your key expires.",
        debugSteps: [
          "Check if you are signed in.",
          "Clear your browser cookies and history for this site.",
          "Make sure your password was typed correctly."
        ]
      },
      developer: {
        rootCause: "The authorization JWT is missing, corrupted, or verified with a different secret signature than expected.",
        fix: "Check that the header sends `Authorization: Bearer <token>`. Ensure JWT_SECRET matches on server configurations.",
        prevention: "Implement a token refresh system. Handle 401 Unauthorized status globally in API interceptors to force re-authentication.",
        debugSteps: [
          "Decode the client-side token in jwt.io to verify the expiry time (`exp`).",
          "Ensure the client-side storage actually holds the token.",
          "Verify signature verification keys on the server."
        ]
      },
      security: {
        rootCause: "Loose session configurations allow session hijacking or token theft from browser local storage.",
        fix: "Transition sensitive token storages from localStorage to secure HTTP-only cookies.",
        prevention: "Implement automatic token rotation, session revocation hooks, and rate-limit authentication routes to prevent brute-forcing.",
        debugSteps: [
          "Inspect active login logs for login anomalies (e.g. unknown device logins).",
          "Ensure brute force attempts are blocked after 5 failures."
        ]
      },
      ops: {
        rootCause: "Authentication verifications hit DB sessions repeatedly, bottlenecking query rates during traffic spikes.",
        fix: "Implement a fast caching layer (Redis) to validate user session statuses instead of hitting MongoDB for every API request.",
        prevention: "Scale session store caches independently of core relational or document database clusters.",
        debugSteps: [
          "Monitor auth endpoint latency spikes.",
          "Verify DB connection limits during high log-in periods."
        ]
      }
    },
    SERVER_ERROR: {
      beginner: {
        rootCause: "The main server computer encountered a problem it did not know how to handle and had to stop.",
        fix: "Wait a minute and refresh. The server operators are likely getting notified to restart it.",
        prevention: "The system should have redundancy so that if one server breaks, another takes over automatically.",
        debugSteps: [
          "Check if other parts of the dashboard are loading.",
          "Check online outage statuses if using third-party APIs.",
          "Send a message to support with the error code."
        ]
      },
      developer: {
        rootCause: "Server-side exception. The backend Express route threw an unhandled error during transaction execution.",
        fix: "Wrap the route handler in try-catch and verify that errors are passed to the global error middleware: `next(error)`.",
        prevention: "Enforce strict schema validation before processing writes. Use robust static analysis tooling.",
        debugSteps: [
          "Inspect the server logs for the full stack trace dump.",
          "Test database connectivity and model query setups.",
          "Reproduce the API payload sequence locally with Mock data."
        ]
      },
      security: {
        rootCause: "Unhandled backend failures can leak stack traces containing file paths, environment properties, and database structures.",
        fix: "Disable verbose error stack trace exports in production modes. Render custom generic API errors.",
        prevention: "Set `NODE_ENV=production` to secure stack trace suppressions automatically.",
        debugSteps: [
          "Verify the API JSON response does not output key names, files, or SQL structure in production mode.",
          "Confirm error logs are encrypted and stored in secure directories."
        ]
      },
      ops: {
        rootCause: "Unhandled Node crashes kill target worker nodes, leading to gateway errors (502 Bad Gateway) and dropped active requests.",
        fix: "Configure a Node process manager like PM2 with cluster mode enabled to spawn workers across all CPU cores.",
        prevention: "Establish containerized service architectures (Docker/Kubernetes) with automatic replica deployments.",
        debugSteps: [
          "Inspect CPU and RAM trends on the server instance.",
          "Verify server swap space limits to prevent Out of Memory (OOM) killer events."
        ]
      }
    },
    ASYNC_ERROR: {
      beginner: {
        rootCause: "The program started a task that takes time but didn't wait for it to finish, causing future steps to get confused.",
        fix: "Tell the program to wait ('await') for the long task to complete before moving to the next line.",
        prevention: "Always bundle tasks that depend on each other together.",
        debugSteps: [
          "Look for tasks that download information and ensure they show a loading state.",
          "Ensure actions finish in the order they were clicked."
        ]
      },
      developer: {
        rootCause: "Unhandled Promise Rejections or async void timing mismatches. Code executed functions without awaiting promise resolution.",
        fix: "Use `async/await` syntax consistently. Wrap async blocks in `try-catch` or append `.catch(err => ...)` handlers.",
        prevention: "Configure linting rules (`no-floating-promises`) to block unawaited promises.",
        debugSteps: [
          "Check for unawaited async callbacks inside event handlers or hooks.",
          "Inspect Node unhandled rejection notifications in developer consoles."
        ]
      },
      security: {
        rootCause: "Swallowed promise rejections can mask silent authentications, authorization check bypasses, or logging faults.",
        fix: "Add global catch bindings for promise rejects to record all authentication flow errors.",
        prevention: "Enforce audit logs on authentication paths that fail-closed if any database query fails to resolve.",
        debugSteps: [
          "Inspect logs for unhandled rejection warnings during login attempts."
        ]
      },
      ops: {
        rootCause: "Swallowed promises lead to dangling network connections or node sockets that fail to clean up, causing memory leaks.",
        fix: "Set Node startup flags: `--unhandled-rejections=strict` to force process shutdown on unhandled errors.",
        prevention: "Monitor heap dump profiles over time to discover accumulation of unresolved Promise references.",
        debugSteps: [
          "Check server runtime heap memory size using standard node inspection protocols."
        ]
      }
    },
    REACT_ERROR: {
      beginner: {
        rootCause: "The user interface got stuck in a repetitive loop or failed to update its screen correctly.",
        fix: "Refresh the web page to reset the screen layouts. Developers should fix loop dependencies.",
        prevention: "Make sure actions only run when something actually changes, rather than firing continuously.",
        debugSteps: [
          "Check if the browser window starts lagging or consuming high power.",
          "Identify which button or click triggered the interface lock-up."
        ]
      },
      developer: {
        rootCause: "React hook lifecycle failure. Render loops occurred inside useEffect, or cleanup operations were omitted, causing stale closure states.",
        fix: "Provide exact dependency variables to hook arrays. Return cleanups (e.g. clearInterval, removeEventListener) from useEffect hooks.",
        prevention: "Enable React ESLint rules (`react-hooks/exhaustive-deps`) to enforce compile-time verification of dependency lists.",
        debugSteps: [
          "Verify the effect dependency arrays.",
          "Observe rendering cycles via React DevTools Profiler to catch loop triggers."
        ]
      },
      security: {
        rootCause: "Uncontrolled state updates or render loops can crash browser tabs, serving as client-side Denial of Service vectors.",
        fix: "Wrap React layout hierarchies in Error Boundaries to gracefully catch crashes without disrupting site navigation.",
        prevention: "Implement rate-limit throttling on interactive event handler functions.",
        debugSteps: [
          "Verify that component crashes render generic developer fallback displays."
        ]
      },
      ops: {
        rootCause: "Stale listeners, un-cleared intervals, and loose hook closures accumulate memory heap in long-running browser SPA sessions.",
        fix: "Monitor client-side memory usage. Ensure static assets are cached to minimize impact of frequent page reloads.",
        prevention: "Automate bundle size checking to keep application download payloads minimal.",
        debugSteps: [
          "Measure JavaScript heap size trends in client-side analytics logs."
        ]
      }
    },
    SECURITY_ERROR: {
      beginner: {
        rootCause: "A secret password, API key, or personal details were printed where they shouldn't be, creating a security leak.",
        fix: "Remove the secret password or API key from code immediately and generate a new key on the provider site.",
        prevention: "Use dedicated environment variables for key details and verify they are added to file exclusion lists (.gitignore).",
        debugSteps: [
          "Inspect console and telemetry outputs for API key substrings (like sk-, AIza, etc.).",
          "Identify the file holding the password and remove it from git history."
        ]
      },
      developer: {
        rootCause: "Hardcoded API keys, tokens, or credential strings leaked in plain text within client-accessible errors or git repositories.",
        fix: "Move credentials to a `.env` file. Access them dynamically through process env loaders (`process.env.API_KEY`). Rotate the exposed keys immediately.",
        prevention: "Install git hook check tools (e.g., git-secrets or gitleaks) to block commits containing key signatures.",
        debugSteps: [
          "Search files for strings containing exposed key prefixes.",
          "Audit the latest commits to ensure secrets were not pushed to origin servers."
        ]
      },
      security: {
        rootCause: "Exposing keys enables threat actors to hijack resource accounts, query user databases, or incur massive usage billings.",
        fix: "Revoke the exposed key immediately on developer platforms (Google Console, AWS, OpenAI). Clean git repository commit logs.",
        prevention: "Enforce least-privilege configurations on key accesses. Never commit key files to public repos.",
        debugSteps: [
          "Audit API key permissions. Set IP restrictions on Google Cloud / AWS API keys.",
          "Examine git commits using filter-branch or BFG repo-cleaner to wipe credentials."
        ]
      },
      ops: {
        rootCause: "API key abuse can exceed service budgets or prompt providers to suspend production servers.",
        fix: "Establish alerts for billing spikes and quota limits on cloud resource endpoints.",
        prevention: "Use dynamic configuration services (HashiCorp Vault, AWS Secrets Manager) to inject variables securely.",
        debugSteps: [
          "Check API gateway error codes for rate-limit/budget lock suspensions."
        ]
      }
    },
    UNKNOWN_ERROR: {
      beginner: {
        rootCause: "The platform encountered an unusual error it didn't recognize. Further investigation is required.",
        fix: "Reload the page. If the error continues, report it to the development team.",
        prevention: "Maintain error logging to catch and categorize new patterns as they arise.",
        debugSteps: [
          "Check browser consoles and logs for trace outputs.",
          "Check database and network connectivity states."
        ]
      },
      developer: {
        rootCause: "Unclassified code exception. The failure does not match regular taxonomy signatures.",
        fix: "Analyze stack details, evaluate inputs, and write a matching classification pattern in the registry.",
        prevention: "Implement detailed trace structures across custom modules to capture context.",
        debugSteps: [
          "Audit stack traces to find the throwing source file.",
          "Inject custom console checkpoints to isolate variables."
        ]
      },
      security: {
        rootCause: "Unclassified exceptions may stem from exploit attempts or novel attack vectors targeting APIs.",
        fix: "Monitor logs for repeated unknown errors originating from identical IP addresses or user agents.",
        prevention: "Implement request validation schemas to filter out unexpected client payloads.",
        debugSteps: [
          "Inspect payload strings that caused the classification failure."
        ]
      },
      ops: {
        rootCause: "Frequent unknown exceptions pollute runtime logs, masking critical system alerts.",
        fix: "Set up centralized error aggregators (e.g., Sentry) to group and track exceptions.",
        prevention: "Review log levels to prevent filling server disk spaces with trace files.",
        debugSteps: [
          "Check local server storage levels and clean old logs."
        ]
      }
    }
  };

  const selectedCategory = personaLibrary[category] ? category : "UNKNOWN_ERROR";
  return personaLibrary[selectedCategory];
}

module.exports = explainService;
