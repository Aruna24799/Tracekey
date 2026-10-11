/**
 * aiExplanationService.js
 *
 * TraceKey AI Explanation Engine using Hugging Face Inference API.
 * Performs deep semantic enrichment of error analysis results.
 *
 * Local TraceKey Engine handles: parsing, fingerprinting, classification.
 * This service takes the structured result and returns:
 *   - 18 comprehensive diagnostic sections
 *   - 5 distinct role-based summaries (Developer, Tester, DevOps, Security, Product Manager)
 *   - Stack trace interpretation
 *   - Code snippet analysis
 *   - Framework-aware context
 *   - Structured recommendations
 *
 * If Hugging Face is unavailable, rate-limited, or no API key is provided,
 * it gracefully falls back to the high-accuracy local explanation dictionary.
 */

const explainService = require("./explainService");
const huggingFaceService = require("./huggingFaceService");

const HF_MODEL = "google/flan-t5-large";

/** Normalizes raw error and category into standard system categories */
function normalizeCategory(catStr, errorText = "") {
  const text = `${String(catStr || "")} ${String(errorText || "")}`.toLowerCase();

  if (text.includes("project") || text.includes("analyzed project") || catStr === "PROJECT_ANALYSIS") {
    return "PROJECT_ANALYSIS";
  }
  if (text.includes("null") || text.includes("undefined") || text.includes("read properties") || text.includes("not a function")) {
    return "NULL_POINTER";
  }
  if (text.includes("jwt") || text.includes("token") || text.includes("auth") || text.includes("unauthorized") || text.includes("login") || text.includes("session")) {
    return "AUTH";
  }
  if (text.includes("cors") || text.includes("fetch") || text.includes("network") || text.includes("timeout") || text.includes("dns") || text.includes("connect") || text.includes("econnrefused")) {
    return "NETWORK";
  }
  if (text.includes("mongo") || text.includes("mongoose") || text.includes("sql") || text.includes("postgres") || text.includes("query") || text.includes("database") || text.includes("connection pool")) {
    return "DATABASE";
  }
  if (text.includes("security") || text.includes("secret") || text.includes("credential") || text.includes("vulnerability") || text.includes("leak") || text.includes("eval") || text.includes("xss") || text.includes("injection")) {
    return "SECURITY";
  }
  if (text.includes("react") || text.includes("hook") || text.includes("render") || text.includes("component") || text.includes("state") || text.includes("lifecycle")) {
    return "REACT";
  }
  if (text.includes("async") || text.includes("promise") || text.includes("reject") || text.includes("await")) {
    return "ASYNC";
  }
  if (text.includes("syntax") || text.includes("parse") || text.includes("compile") || text.includes("unexpected token")) {
    return "SYNTAX";
  }
  if (text.includes("server") || text.includes("500") || text.includes("internal") || text.includes("crash") || text.includes("unhandledrejection")) {
    return "SERVER";
  }
  return "GENERIC";
}

/** Local Explanation Dictionary representing high-accuracy templates for all sections and roles */
const LOCAL_TEMPLATES = {
  PROJECT_ANALYSIS: {
    executiveSummary: "Comprehensive project intelligence scan completed. Codebase structure, runtime dependencies, framework architecture, and security posture analyzed.",
    humanExplanation: "TraceKey scanned your project repository files to map out its framework, dependencies, architectural layers, environment setup, and security health.",
    technicalExplanation: "Static project scan extracted package dependencies, routing endpoints, controllers, services, models, database adapters, and environment configuration profiles.",
    rootCause: "Full codebase structure and security profile analyzed successfully.",
    immediateFix: "Review detected security findings and ensure environment variables (.env) and SDK integrations are configured.",
    permanentFix: "Maintain automated dependency auditing, enforce pre-commit linting rules, and initialize TraceKey SDK across primary entry points.",
    prevention: "Configure continuous integration security scanners, maintain strict dependency lockfiles, and keep runtime packages updated.",
    productionImpact: "Project architecture analyzed cleanly. Review security recommendations to prevent runtime vulnerabilities in production.",
    businessImpact: "Enhanced codebase visibility, reduced technical debt, and accelerated defect resolution workflows across engineering teams.",
    riskAssessment: "Low risk. Analysis provides operational intelligence and highlights preventive code quality actions.",
    debuggingSteps: "1. Inspect detected dependencies and version constraints.\n2. Verify environment variable declarations (.env).\n3. Audit route handlers and controller implementations.",
    codeExamples: "// Recommended TraceKey SDK Initialization:\nimport { initTraceKey } from '@tracekey/sdk';\n\ninitTraceKey({\n  apiKey: process.env.TRACEKEY_API_KEY,\n  project: 'your-project'\n});",
    bestPractices: "Maintain modular separation of concerns across controllers, services, and models. Guard all environment variables and avoid committing secret keys.",
    codeImprovementSuggestions: "Ensure error boundary wrappers are present around primary route components and async route handlers contain try-catch blocks.",
    securityRecommendations: "Rotate exposed API keys immediately, add .env to .gitignore, and restrict CORS origin headers to verified domains.",
    performanceRecommendations: "Leverage asynchronous file I/O operations, memoize expensive calculations, and implement database connection pooling.",
    relatedTechnologies: "Node.js, Express, React, MongoDB, TraceKey SDK",
    roles: {
      developer: "Project scan complete. Review controller, service, and model mappings. Ensure all async route handlers catch errors cleanly.",
      qa: "Verify route endpoints respond correctly under load and test edge cases for empty database or API payloads.",
      manager: "Project health score calculated. Engineering team can prioritize security fixes and dependency updates based on findings.",
      devops: "Verify build tools, package manager lockfiles, container configs, and CI/CD workflow files are present in the root directory.",
      security: "Audit detected credentials and environment files. Ensure no hardcoded secret keys are present in repository source files."
    }
  },
  NULL_POINTER: {
    executiveSummary: "An unhandled null or undefined pointer reference exception occurred in the application execution flow.",
    humanExplanation: "The application tried to use a piece of information that does not exist or has not been loaded yet. It's like trying to read a page in a book that was left blank.",
    technicalExplanation: "A runtime TypeError was thrown due to property access on a null or undefined reference. This typically happens when accessing fields on objects returned asynchronously before they are populated, or missing guard clauses in render/data paths.",
    rootCause: "The variables or object references were dereferenced prior to verification of their initialized state. Upstream API services may have returned partial payloads, or local state was cleared unexpectedly.",
    immediateFix: "Insert optional chaining operator (?.) to access variables safely, or add a guard condition: if (!data) return null;",
    permanentFix: "Enforce strict TypeScript typings, implement API schema validation (e.g. Zod or Joi) at boundaries, and provide complete initial state structures.",
    prevention: "Adopt defensive programming standards. Ensure all optional object properties are guarded, and enforce eslint rules against floating null checks.",
    productionImpact: "UI crash (blank screen) for client-side applications, or process exit/request drops for backend Node.js services.",
    businessImpact: "Disrupted client workflows, inability to load critical data panels, and potential loss of user conversions due to UI blocking.",
    riskAssessment: "Medium operational risk. Extremely common, easily resolvable, but high impact on application usability.",
    debuggingSteps: "1. Locate the failing line in source maps.\n2. Log the container object variables right before property read.\n3. Verify database records or API payloads are populated.",
    codeExamples: "// Immediate Fix:\nconst name = user?.profile?.name || 'Guest';\n\n// Guard Clause:\nif (!user || !user.profile) {\n  return <div>Loading profile...</div>;\n}",
    bestPractices: "Never trust external API payloads implicitly. Initialize React state hooks with default fallback structures rather than null or undefined.",
    codeImprovementSuggestions: "Refactor legacy property accesses to use object destructuring with default fallbacks: const { profile = {} } = user || {};",
    securityRecommendations: "Use global React Error Boundaries to catch uncaught component errors, preventing complete UI crashes and suppressing verbose system stack traces to end-users.",
    performanceRecommendations: "Optional chaining has negligible performance impact. Avoid repetitive nested try-catch blocks in high-frequency rendering loops; delegate to boundary handlers.",
    relatedTechnologies: "JavaScript, TypeScript, React, Node.js, Express",
    roles: {
      developer: "A TypeError occurred on property read because the target object is undefined. Apply optional chaining (?.) or guard clauses (if (!obj) return) to solve the issue. Locate the exact line in source maps and trace state mutations.",
      qa: "To reproduce, clear the component state, mock an empty response from the database or API, and navigate to the page. Verify the page remains interactive (e.g. showing a loading spinner or empty state) rather than crashing.",
      manager: "This is a medium-risk UI/Server crash. Release impact is minimal if caught early. Estimated developer resolution effort is less than 1 hour. No security vulnerability.",
      devops: "Unhandled exceptions in Node.js can crash the server process if not caught by middleware. Ensure the daemon process manager (e.g. PM2 or Docker restart policy) restarts the container automatically.",
      security: "While not directly exploitable for code execution, unhandled exceptions can lead to client-side Denial of Service (DoS) and verbose stack leaks. Ensure debug logs are disabled in production."
    }
  },
  AUTH: {
    executiveSummary: "Authentication or authorization validation failed during secure resource request.",
    humanExplanation: "The system could not verify who you are, or your login key has expired. Please try signing out and logging back in.",
    technicalExplanation: "API route request was rejected because the JSON Web Token (JWT) is missing, expired, malformed, or has an invalid cryptographic signature.",
    rootCause: "The client application failed to attach the Authorization header, the user session token reached its time-to-live (TTL) limit, or the secret verification keys do not match between authentication servers.",
    immediateFix: "Verify the JWT token is sent as 'Authorization: Bearer <token>' in API request headers, and verify secret keys in your backend env configuration.",
    permanentFix: "Implement a secure refresh token rotation strategy, configure automated redirect intercepts on 401 response status, and secure keys in vault storage.",
    prevention: "Apply rate limiting on auth endpoints, monitor token issuance, and verify token cryptographic standards (e.g. HS256/RS256) are up to date.",
    productionImpact: "Users blocked from accessing authorized panels, API service rejections (401/403 HTTP status), and authentication timeout alerts.",
    businessImpact: "Loss of access to application features, increase in client login complaints, and potential transactional disruption.",
    riskAssessment: "High security risk. Authentication failures can indicate session expiration or active brute-force / hijack attempts.",
    debuggingSteps: "1. Decode the token on jwt.io to verify payload claims (exp, sub, roles).\n2. Verify the Authorization header is set in network request tools.\n3. Verify JWT_SECRET matches on the running server environment.",
    codeExamples: "// Attach Token:\nfetch('/api/data', {\n  headers: {\n    'Authorization': `Bearer ${localStorage.getItem('tk_token')}`\n  }\n});",
    bestPractices: "Never store highly sensitive tokens in localStorage if vulnerable to XSS; transition to secure HTTP-only cookies with SameSite configuration.",
    codeImprovementSuggestions: "Create an Axios request interceptor to automatically inject the auth header and handle expired token refresh cycles dynamically.",
    securityRecommendations: "Ensure session tokens are revoked server-side upon user logout, and block authentication attempts after 5 consecutive failures from one IP.",
    performanceRecommendations: "Use fast in-memory key-value stores (e.g., Redis) to track active sessions or token blacklist status instead of querying primary databases on every API check.",
    relatedTechnologies: "JSON Web Tokens (JWT), OAuth 2.0, HTTP Security Headers, bcryptjs",
    roles: {
      developer: "The token signature failed verification. Verify JWT_SECRET env matches. Ensure header parser handles Bearer prefix correctly.",
      qa: "Verify login fails on wrong passwords, token expiry forces automatic redirect to login screen, and protected routes cannot be reached via direct URL.",
      manager: "High-priority ticket. Affects user logins and system access. Estimated fix time: 1-2 hours depending on key rotation or code fix.",
      devops: "Monitor authentication traffic patterns. Set up threshold alerts for high rate of 401/403 HTTP responses indicating potential scans.",
      security: "Ensure cryptographic signature algorithms are secure. Enforce HTTPS, restrict CORS origins, and ensure JWT payloads contain no sensitive PII."
    }
  },
  NETWORK: {
    executiveSummary: "Network request failed due to host resolution failure, gateway timeout, or cross-origin restrictions.",
    humanExplanation: "The application tried to speak to the server, but the network was slow, offline, or blocked the request. Check your internet connection.",
    technicalExplanation: "The HTTP request failed because of CORS origin restrictions, network timeouts, DNS name resolution errors, or the destination server rejecting connection sockets.",
    rootCause: "The target API server is offline, CORS headers are missing on the host response, or a network firewall/proxy blocked communication paths.",
    immediateFix: "Verify the destination URL is correct and online. If CORS is the issue, configure your backend to allow requests from the frontend origin.",
    permanentFix: "Implement a proxy gateway, configure resilient network timeout periods, and establish comprehensive circuit breakers.",
    prevention: "Configure server-side HTTP headers to support origin white-lists and set up automated API health diagnostics.",
    productionImpact: "Frontend interface blocks, missing data segments, loading spins, or backend integration failures.",
    businessImpact: "System degradation, user workflow freezes, and failure to process external third-party API integration events.",
    riskAssessment: "High operational risk. Directly impacts application functionality and integration stability.",
    debuggingSteps: "1. Inspect DevTools -> Network tab for status codes.\n2. Test target server access using curl or Postman.\n3. Audit Access-Control-Allow-Origin headers on target server responses.",
    codeExamples: "// CORS Setup (Express):\napp.use(cors({\n  origin: process.env.CLIENT_URL || 'http://localhost:3000',\n  credentials: true\n}));",
    bestPractices: "Set client network timeouts (e.g. 5000ms) rather than waiting indefinitely. Show clear network recovery messages to users.",
    codeImprovementSuggestions: "Implement fetch retry wrappers using exponential backoff to handle transient network blips.",
    securityRecommendations: "Never set Access-Control-Allow-Origin: '*' in production when supporting credentials; explicitly define verified domains.",
    performanceRecommendations: "Cache static backend API responses in browser storage or CDN layers to minimize unnecessary network roundtrips.",
    relatedTechnologies: "HTTP headers, CORS, fetch API, axios, HTTP Proxies",
    roles: {
      developer: "Request blocked by CORS or network timeout. Add the required origin to the server's CORS configuration or use a backend reverse proxy.",
      qa: "Simulate offline mode in browser DevTools to test recovery UI. Verify network errors do not crash the React view layer.",
      manager: "High-priority issue. Disrupts communication between UI and database APIs. Estimated fix time: 30 minutes to configure CORS/proxy.",
      devops: "Check reverse proxy (Nginx/Cloudflare) logs. Verify server ports are open in host security groups.",
      security: "Restrict CORS origins to authorized hosts. Verify SSL certificates are active and meet TLS 1.3 standards."
    }
  },
  DATABASE: {
    executiveSummary: "Database query or connection operation failed on the data storage layer.",
    humanExplanation: "The database containing the application's data is temporarily unreachable, slow, or rejecting our queries.",
    technicalExplanation: "Mongoose/MongoDB driver threw a connection timeout, authorization failure, or invalid schema validation error during transaction processing.",
    rootCause: "The MongoDB Atlas connection was refused due to IP whitelist restrictions, invalid credentials, or the query syntax violating database schema constraints.",
    immediateFix: "Verify process.env.MONGO_URI is defined, the username/password are correct, and the host VM IP is whitelisted in MongoDB Atlas.",
    permanentFix: "Implement connection pooling, configure proper query indexing, and write data migration scripts for schema updates.",
    prevention: "Set up automated replication, configure performance profiling for slow queries, and monitor active connection pool sizes.",
    productionImpact: "Total system outage, user authentication failures, write transaction crashes, or stale data reads.",
    businessImpact: "Critical. Users cannot login, sign up, or save work, potentially causing direct revenue loss.",
    riskAssessment: "Critical risk. High threat to application availability and data integrity.",
    debuggingSteps: "1. Verify network connectivity to the database cluster.\n2. Check database engine metrics for high CPU/Memory load.\n3. Run a minimal test connection script locally to confirm credentials.",
    codeExamples: "// Database connection options:\nmongoose.connect(process.env.MONGO_URI, {\n  serverSelectionTimeoutMS: 5000,\n  bufferCommands: false\n});",
    bestPractices: "Set mongoose bufferCommands: false to fail fast during database outages rather than blocking Node memory queues.",
    codeImprovementSuggestions: "Optimize database queries by selecting only required fields (.select('name email')) instead of fetching full documents.",
    securityRecommendations: "Restrict database network access strictly to application servers. Change database credentials regularly and use IAM roles.",
    performanceRecommendations: "Index frequently queried properties (such as email or userId) to maintain fast search speeds under load.",
    relatedTechnologies: "MongoDB, Mongoose, PostgreSQL, Redis, Database Indexing",
    roles: {
      developer: "A database driver error occurred. Verify connection strings, query selectors, and Mongoose schema properties.",
      qa: "Verify application states when the database is unreachable (e.g. check for 503 response codes and clean error notices).",
      manager: "Critical issue. High business risk. Needs immediate developer assignment. Verify Atlas cluster status and whitelist configurations.",
      devops: "Check cluster health on MongoDB Atlas dashboard. Verify IP access list permits current server IP address.",
      security: "Ensure encryption-at-rest is enabled. Check audit logs for unauthorized login attempts on the database server."
    }
  },
  SECURITY: {
    executiveSummary: "A critical security threat or potential credential exposure was detected in the code or log outputs.",
    humanExplanation: "The system detected sensitive passwords or secret keys exposed in plain text. These keys must be secured to prevent unauthorized access.",
    technicalExplanation: "Plaintext credential signatures (e.g., API keys, private tokens, passwords) were detected in files, logs, or unencrypted data transfers, violating security policies.",
    rootCause: "Secrets were hardcoded into code files instead of loaded dynamically through environment variables, or debug logging was not disabled in production.",
    immediateFix: "Move exposed keys to `.env` files, add the file to `.gitignore`, and revoke/regenerate the exposed API keys immediately.",
    permanentFix: "Integrate secret managers (like AWS Secrets Manager or HashiCorp Vault) and configure automated static scan checks in CI/CD pipelines.",
    prevention: "Use tools like gitleaks or trufflehog to scan commits, and establish a security-first code review culture.",
    productionImpact: "Compromised cloud resources, potential billing spikes, unauthorized access to user data, or service suspension.",
    businessImpact: "Loss of customer trust, financial liabilities due to resource abuse, and legal penalties for data breaches.",
    riskAssessment: "Critical. Exposed credentials can be parsed by automated bots within minutes of being pushed to repository hosts.",
    debuggingSteps: "1. Identify the exact line and file holding the hardcoded string.\n2. Revoke the key on the provider platform.\n3. Run git history clean tools if pushed to remote servers.",
    codeExamples: "// INCORRECT:\nconst API_KEY = 'hf_123456...';\n\n// CORRECT:\nconst API_KEY = process.env.HF_API_KEY;",
    bestPractices: "Never commit configuration profiles containing raw credentials. Ensure security scanners block pushes with matched key patterns.",
    codeImprovementSuggestions: "Refactor secret access to load through configuration wrappers that validate properties on application start.",
    securityRecommendations: "Implement token rotation policies, restrict credential scopes to absolute minimums, and enable IP restrictions on API keys.",
    performanceRecommendations: "Loading environment variables from memory (process.env) has zero runtime overhead compared to hardcoding.",
    relatedTechnologies: "Git, environment variables, secret managers, Vault, static analysis scanners",
    roles: {
      developer: "An API key is hardcoded. Move it to the .env file. Access it via process.env and rotate the current credentials.",
      qa: "Verify that sensitive credentials do not print in browser console logs or API response payloads during manual test flows.",
      manager: "Critical risk. Pushed secrets must be rotated immediately. Verify git repository access list is secure.",
      devops: "Remove key history from Git commits using git-filter-repo. Set up secure secret variables in deployment systems.",
      security: "Wipe credential history immediately. Verify access logs on the affected cloud provider account to detect early abuse."
    }
  },
  REACT: {
    executiveSummary: "Client-side React component runtime failure or lifecycle loop detected.",
    humanExplanation: "The web page encountered a layout rendering error. A reload should fix it, but developers need to repair the page code.",
    technicalExplanation: "An unhandled error occurred during React render, state updates, or hook execution, triggering a UI crash or rendering loop.",
    rootCause: "A useEffect hook trigger loop was created by modifying its dependency properties inside the effect callback, or a component tried to render null values.",
    immediateFix: "Audit the useEffect dependency arrays to ensure no loop mutations occur, and check component rendering guards.",
    permanentFix: "Implement global Error Boundaries to isolate failing widgets, and write unit tests for component rendering under empty states.",
    prevention: "Configure React eslint rules, enforce state normalization, and separate business logic from layout views.",
    productionImpact: "UI freeze, tab crash, high CPU usage on client browser, or unresponsive layout segments.",
    businessImpact: "Bad user experience, page unresponsiveness, and user drop-offs on critical checkout/auth flows.",
    riskAssessment: "Medium risk. Affects client browsers, does not compromise server assets but breaks visual usability.",
    debuggingSteps: "1. Use React DevTools to check state properties.\n2. Analyze browser console logs for the component trace stack.\n3. Isolate the failing component by wrapping it in an Error Boundary.",
    codeExamples: "// Safe state mapping:\nconst usersList = users && Array.isArray(users) ? users.map(u => u.name) : [];",
    bestPractices: "Never map or iterate over collections without validating they are arrays. Provide key properties to rendered lists.",
    codeImprovementSuggestions: "Refactor nested hooks to split complex state management into custom React hooks or Redux/Zustand stores.",
    securityRecommendations: "Ensure stack traces and debug state details are stripped from client-side production builds.",
    performanceRecommendations: "Memoize expensive computations using useMemo and prevent redundant component rerenders with useCallback.",
    relatedTechnologies: "React, DOM API, JavaScript, React Hooks, JSX",
    roles: {
      developer: "A render loop or state error occurred. Check dependency arrays and verify data structures before rendering them.",
      qa: "Test page with slow internet or broken APIs to verify loading skeletons or generic error notifications handle exceptions safely.",
      manager: "Medium priority. Page layout breaks. Estimated resolution time: 1 hour. Assign to frontend developer.",
      devops: "Verify bundle asset CDN routing works. Ensure client-side JavaScript source maps are accessible to error analytics.",
      security: "Verify error screens do not leak backend file system paths or internal API details to browser console windows."
    }
  },
  ASYNC: {
    executiveSummary: "Unhandled promise rejection or asynchronous flow exception occurred.",
    humanExplanation: "The application started a background task and failed to wait for it, or the task failed without a backup plan.",
    technicalExplanation: "An asynchronous promise failed to resolve and had no associated .catch() handler, causing an uncaught rejection event.",
    rootCause: "Code triggered fetch, file I/O, or database queries inside an async block without wrapping it in a try-catch construct.",
    immediateFix: "Wrap async code blocks in try-catch, or append a .catch() handler directly to the promise chain.",
    permanentFix: "Enforce eslint rules requiring floating promises to be handled, and register global unhandled rejection process bindings.",
    prevention: "Standardize async flow handling. Use helper patterns that wrap promises in safe return tuples.",
    productionImpact: "Unstable server process state, memory leaks on unresolved network sockets, or client-side telemetry drops.",
    businessImpact: "Dangling transactions, missing callback events, and silent data processing gaps in backend flows.",
    riskAssessment: "Medium risk. Hard to detect without dedicated logging because it fails silently in background loops.",
    debuggingSteps: "1. Run server with --unhandled-rejections=warn or strict flag.\n2. Trace unawaited callbacks in async hooks.\n3. Locate the failing network request or DB query in logs.",
    codeExamples: "// Correct async-await:\ntry {\n  const data = await fetchData();\n} catch (error) {\n  console.error('Handled rejection:', error.message);\n}",
    bestPractices: "Never leave promises floating. Always catch rejects at the lowest possible layer before propagating errors.",
    codeImprovementSuggestions: "Refactor callback-style code to modern promise-based flows using Node.js util.promisify.",
    securityRecommendations: "Ensure authentication checks running asynchronously fail closed (reject access) if a database or external lookup rejects.",
    performanceRecommendations: "Avoid awaiting independent promises sequentially; use Promise.all() to run concurrent operations in parallel.",
    relatedTechnologies: "Promises, async/await, Event Loop, JavaScript ES6",
    roles: {
      developer: "Promise failed without a catch handler. Wrap the async scope in try-catch to log and resolve the rejection.",
      qa: "Trigger API network timeouts to verify the application handles connection drops gracefully instead of blocking.",
      manager: "Medium priority. Can cause silent errors in background data syncing. Estimated developer fix: 1 hour.",
      devops: "Track process exit signals. Configure Node containers to restart automatically if an unhandled rejection crashes the daemon.",
      security: "Ensure unhandled promise rejections do not expose auth logic bypasses or leak memory structures over long durations."
    }
  },
  SYNTAX: {
    executiveSummary: "Syntax parsing or file compilation error detected in the code structure.",
    humanExplanation: "The application code has a typo, missing bracket, or grammar error that prevents it from running.",
    technicalExplanation: "The JavaScript interpreter or compiler failed to parse the source file because of malformed syntax (unexpected token, missing brackets).",
    rootCause: "A typo was introduced during development, or modern language structures were used without corresponding compiler transpilation (Babel/TypeScript).",
    immediateFix: "Locate the exact line from the syntax parse error stack, fix the typo, and save the file.",
    permanentFix: "Configure pre-commit hooks running linting and type-checking commands to catch syntax errors before commit push.",
    prevention: "Configure real-time syntax checking in code editors, and run test suites locally during development.",
    productionImpact: "Complete app startup crash, build compilation failure, or route loading blocks.",
    businessImpact: "Critical build block. Prevents new deployments, updates, or hotfixes from reaching staging/production environments.",
    riskAssessment: "High operational risk. Prevents code execution. Must be fixed before code is pushed to production.",
    debuggingSteps: "1. Inspect compiler/packager outputs for parsing warnings.\n2. Verify package.json build configurations.\n3. Check target code syntax using an IDE.",
    codeExamples: "// Syntax typo:\nif (x === y {\n  console.log('typo');\n}\n\n// Correct syntax:\nif (x === y) {\n  console.log('corrected');\n}",
    bestPractices: "Never deploy code directly without verification. Let compiler build steps run and pass successfully first.",
    codeImprovementSuggestions: "Refactor build systems to use modern compilers (like Vite or ts-node) for faster parse verification during editing.",
    securityRecommendations: "Verify syntax parser errors are not exposed in browser client logs to prevent disclosure of file names and code snippets.",
    performanceRecommendations: "Syntax validation is a build-time process. Keep runtime bundle compilation minimal.",
    relatedTechnologies: "Vite, TypeScript, Babel, ESLint, Webpack",
    roles: {
      developer: "A syntax parse error occurred. Fix the typo (bracket/comma) at the logged file line and run build checks.",
      qa: "N/A. This is a build blocker that should prevent release builds from being compiled for QA verification.",
      manager: "High priority. Blocks the release pipeline. Estimated fix time: 5-10 minutes.",
      devops: "Integrate build checks into the CI/CD pipeline to block deploy hooks if npm run build fails.",
      security: "Verify that source code files containing syntax errors do not get uploaded to public server routes."
    }
  },
  SERVER: {
    executiveSummary: "An unhandled server-side application exception caused transaction termination.",
    humanExplanation: "The main server computer encountered an internal problem and had to stop processing your request.",
    technicalExplanation: "Express router or Node process threw an unhandled runtime error. The request failed with HTTP 500 Internal Server Error status.",
    rootCause: "The server encountered unexpected input parameters, external database connection drops, or memory overflow inside route execution.",
    immediateFix: "Check server console trace outputs, wrap the throwing module in error handling middleware, and verify target dependencies.",
    permanentFix: "Establish comprehensive global exception handling, write validation middleware, and configure cluster scaling structures.",
    prevention: "Enforce strict schema checking at API entrypoints, monitor memory usage, and run code profiling tests.",
    productionImpact: "Gateway errors (502 Bad Gateway), dropped API requests, or server process restarts.",
    businessImpact: "Loss of backend API functionality, transaction drops, and potential downtime for integrated systems.",
    riskAssessment: "Critical risk. Impacts core business logic and API availability.",
    debuggingSteps: "1. View server process error logs.\n2. Replicate the request payload locally using automated API clients.\n3. Check resource constraints on the hosting server instance.",
    codeExamples: "// Global Express Error Handler:\napp.use((err, req, res, next) => {\n  console.error(err.stack);\n  res.status(500).json({ success: false, message: 'Internal Server Error' });\n});",
    bestPractices: "Never let exceptions crash the Express router; catch them and return a clean HTTP 500 response payload.",
    codeImprovementSuggestions: "Refactor promise-based route handlers to use async-await wrapper helpers that catch errors and pass them to next().",
    securityRecommendations: "Never output raw server error details or system stacks in production JSON responses; render generic error payloads.",
    performanceRecommendations: "Use clustering or serverless execution limits to handle traffic spike requests without resource exhaustion.",
    relatedTechnologies: "Node.js, Express, PM2, Docker, API Gateways",
    roles: {
      developer: "An unhandled route error occurred. Wrap the handler in a try-catch block and send errors to next(). Check input validity.",
      qa: "Validate how the client page recovers from a 500 error response. Verify that user state remains safe and uncorrupted.",
      manager: "High priority. Backend API failures disrupt user actions. Estimated fix: 1-2 hours of debugging and code patch.",
      devops: "Inspect container restart rates. Check application error rates inside APM monitoring systems.",
      security: "Ensure debug stacks are fully suppressed on production route outputs to block internal structure exposure."
    }
  },
  GENERIC: {
    executiveSummary: "An unclassified runtime exception occurred in the application execution flow.",
    humanExplanation: "The application encountered a problem it did not expect. Refresh the page or try again in a few minutes.",
    technicalExplanation: "An exception occurred that did not match known error classification patterns. System telemetry captured the trace for analysis.",
    rootCause: "Insufficient context or custom code logic threw an error that lacks standard classification tags.",
    immediateFix: "Review the full stack trace inside the telemetry logs to locate the throw source.",
    permanentFix: "Add custom classification tags and logging hooks around the throwing module to capture context next time.",
    prevention: "Improve error handling structures and ensure all exceptions are subclassed with descriptive names.",
    productionImpact: "Local functional instability or request termination depending on the module context.",
    businessImpact: "Localized user friction or functional gaps depending on the severity of the throwing path.",
    riskAssessment: "Medium risk. Requires research to isolate and classify correctly.",
    debuggingSteps: "1. Locate source files in the trace.\n2. Print variables and examine execution paths.\n3. Write a test case mapping to the inputs.",
    codeExamples: "// Custom Error Class:\nclass AppError extends Error {\n  constructor(message, status) {\n    super(message);\n    this.status = status;\n  }\n}",
    bestPractices: "Classify errors with distinct names and statuses to avoid generic fallback captures.",
    codeImprovementSuggestions: "Replace generic Error objects with custom domain exceptions to describe business logic failures.",
    securityRecommendations: "Ensure all logs are securely stored and do not leak user passwords, tokens, or PII keys in trace strings.",
    performanceRecommendations: "Logging overhead should be kept low. Do not log large object payloads in unclassified exceptions.",
    relatedTechnologies: "JavaScript, logging frameworks, telemetry trackers",
    roles: {
      developer: "An unclassified exception occurred. Inspect the stack trace, isolate the throwing module, and add specific catches.",
      qa: "Verify that functional actions still complete if safe, or that the application displays a user-friendly error message.",
      manager: "Medium priority. Needs developer investigation to classify and estimate impact. Fix time: 1-2 hours.",
      devops: "Check logging channels. Verify error telemetry successfully records stack metadata.",
      security: "Verify that unclassified exceptions do not expose database schema layouts or internal environment details in logs."
    }
  }
};

/**
 * Low-level HF call — delegates to shared huggingFaceService.hfCall
 * to avoid code duplication while keeping the same interface.
 * The apiKey is now forwarded as the 4th argument so per-request keys work.
 */
async function hfGenerate(prompt, maxTokens = 120, apiKey = "") {
  // Build the full API key value: prefer passed key, fallback to env
  let keyToUse = apiKey || process.env.HF_API_KEY || "";
  if (keyToUse.startsWith("hf_REPLACE")) {
    keyToUse = "";
  }
  if (!keyToUse) return null;

  // Delegate to the shared huggingFaceService.hfCall, passing the key as 4th argument
  const result = await huggingFaceService.hfCall(HF_MODEL, {
    inputs: prompt.slice(0, 480),
    parameters: { max_new_tokens: maxTokens, temperature: 0.3 },
  }, 12000, keyToUse);

  if (!result) return null;
  const text = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
  return text ? text.trim() : null;
}

/**
 * Build the 5-role seniority explanation fallback from an existing local template.
 * This ensures both the HF-success path and the local-fallback path always
 * return the same rich `roleExplanations` schema tailored for Beginner, Junior, Mid-Level, Senior, and Tech Lead.
 */
function buildRoleExplanations(template) {
  const human = template.humanExplanation || "An unexpected error occurred during execution.";
  const tech = template.technicalExplanation || "Execution flow encountered an unhandled condition.";
  const root = template.rootCause || "Input state or missing guard clause triggered an exception.";
  const fix = template.immediateFix || "Review code logic and apply defensive guard clauses.";
  const perm = template.permanentFix || "Implement robust input validation and type safety.";
  const prev = template.prevention || "Enforce automated testing and static analysis.";
  const devRole = template.roles?.developer || fix;
  const devops = template.roles?.devops || "Verify server configuration, monitoring, and restart policies.";
  const sec = template.securityRecommendations || template.roles?.security || "Ensure secrets are safe and no sensitive data is leaked in logs.";

  return {
    beginner: `Plain-English Overview: ${human}\n\nWhat happened: The application encountered something unexpected and couldn't continue.\n\nHow to fix it:\n1. Open the file where the error occurred.\n2. ${fix}\n3. Save and re-test to confirm it works.`,

    junior: `Technical Explanation: ${tech}\n\nRoot Cause: ${root}\n\nImmediate Code Fix: ${fix}\n\nDeveloper Note: ${devRole}\n\nBest Practice: Add defensive checks before accessing dynamic data.`,

    midLevel: `Root Cause Analysis: ${root}\n\nSystem Mechanics: ${tech}\n\nPermanent Fix: ${perm}\n\nDefensive Architecture: ${prev}\n\nQuality Assurance: Write unit and regression tests covering this edge case.`,

    senior: `Architectural Impact: ${tech}\n\nSystemic Solution: ${perm}\n\nState & Lifecycle Considerations: ${devRole}\n\nLong-Term Prevention: ${prev}\n\nSecurity & Resilience: ${sec}`,

    techLead: `System Blast Radius & Impact: ${template.riskAssessment || "Moderate operational risk."} Production Impact: ${template.productionImpact || "Localized disruption."}\n\nBusiness Risk: ${template.businessImpact || "Potential user friction."}\n\nInfrastructure & DevOps: ${devops}\n\nRemediation Strategy: ${perm} Enforce pre-commit linting, CI guardrails, and architectural guidelines: ${prev}`
  };
}

/**
 * Generate AI explanation for the error.
 * Falls back to local templates if HF fails.
 *
 * @param {string} rawError
 * @param {string} category
 * @param {string} apiKey
 * @param {string} analysisContext
 * @returns {Promise<object>}
 */
async function generateAIExplanation(rawError, category, apiKey, analysisContext = "") {
  const normCat = normalizeCategory(category, rawError);
  const localTemplate = LOCAL_TEMPLATES[normCat] || LOCAL_TEMPLATES.GENERIC;
  const snippet = rawError.slice(0, 400);
  const contextPrefix = analysisContext ? `Project Context: ${analysisContext}\n\n` : "";

  let keyToUse = apiKey || process.env.HF_API_KEY || "";
  if (keyToUse.startsWith("hf_REPLACE")) {
    keyToUse = "";
  }

  // If API Key exists, invoke Hugging Face via the shared service
  if (keyToUse) {
    try {
      // 1. Main 9-way parallel enrichment (existing roles preserved)
      const [explanation, rootCause, fix, prevention, devRole, qaRole, devopsRole, secRole, managerRole] =
        await Promise.all([
          hfGenerate(
            `${contextPrefix}Summarize this ${category} error in one clear sentence for a manager:\n\n${snippet}`,
            60,
            keyToUse
          ),
          hfGenerate(
            `${contextPrefix}Explain the technical root cause of this ${category} error:\n\n${snippet}`,
            80,
            keyToUse
          ),
          hfGenerate(
            `${contextPrefix}What is the immediate code fix for this ${category} error?:\n\n${snippet}`,
            100,
            keyToUse
          ),
          hfGenerate(
            `${contextPrefix}What is the permanent prevention strategy for this ${category} error?:\n\n${snippet}`,
            80,
            keyToUse
          ),
          hfGenerate(
            `${contextPrefix}As a developer, explain the code-level fix for this:\n\n${snippet}`,
            90,
            keyToUse
          ),
          hfGenerate(
            `${contextPrefix}As a QA tester, how do I reproduce and test this?:\n\n${snippet}`,
            90,
            keyToUse
          ),
          hfGenerate(
            `${contextPrefix}As a DevOps engineer, what are the server and log implications?:\n\n${snippet}`,
            90,
            keyToUse
          ),
          hfGenerate(
            `${contextPrefix}As a security analyst, what are the vulnerabilities or risks?:\n\n${snippet}`,
            90,
            keyToUse
          ),
          hfGenerate(
            `${contextPrefix}As an engineering manager, explain the release and business impact:\n\n${snippet}`,
            70,
            keyToUse
          )
        ]);

      // 2. 5-role generation: Beginner, Junior, Mid-Level, Senior, Tech Lead
      const [beginnerRole, juniorRole, midLevelRole, seniorRole, techLeadRole] =
        await Promise.all([
          hfGenerate(
            `${contextPrefix}Explain this ${category} error in very simple terms for someone who is completely new to programming:\n\n${snippet}`,
            100,
            keyToUse
          ),
          hfGenerate(
            `${contextPrefix}Explain this ${category} error and how to fix it for a junior developer with 1-2 years of experience:\n\n${snippet}`,
            100,
            keyToUse
          ),
          hfGenerate(
            `${contextPrefix}Explain the root cause and best solution for this ${category} error for a mid-level developer:\n\n${snippet}`,
            100,
            keyToUse
          ),
          hfGenerate(
            `${contextPrefix}As a senior developer, analyze this ${category} error, its architectural implications and long-term prevention:\n\n${snippet}`,
            110,
            keyToUse
          ),
          hfGenerate(
            `${contextPrefix}As a tech lead, summarize this ${category} error's system-level impact, team action items, and architectural remediation:\n\n${snippet}`,
            120,
            keyToUse
          ),
        ]);

      // 3. New parallel enrichment using huggingFaceService functions (key forwarded)
      const [stackResult, codeResult, frameworkResult, recResult] = await Promise.all([
        huggingFaceService.interpretStackTrace(rawError, category, keyToUse).catch(() => null),
        huggingFaceService.analyzeCodeSnippet(rawError.slice(0, 500), keyToUse).catch(() => null),
        huggingFaceService.generateFrameworkAnalysis(rawError, "web", keyToUse).catch(() => null),
        huggingFaceService.generateRecommendations(rawError, category, keyToUse).catch(() => null),
      ]);

      const hasAnyHuggingFaceResult = [
        explanation, rootCause, fix, prevention,
        devRole, qaRole, devopsRole, secRole, managerRole
      ].some(Boolean);

      if (hasAnyHuggingFaceResult) {
        const defaultRoleExplanations = buildRoleExplanations(localTemplate);
        // Return rich structured JSON combining HF values, local details, and new enrichments
        return {
          // (Existing fields — all preserved)
          executiveSummary: explanation || localTemplate.executiveSummary,
          humanExplanation: explanation || localTemplate.humanExplanation,
          technicalExplanation: rootCause || localTemplate.technicalExplanation,
          rootCause: rootCause || localTemplate.rootCause,
          immediateFix: fix || localTemplate.immediateFix,
          permanentFix: prevention || localTemplate.permanentFix,
          prevention: prevention || localTemplate.prevention,
          productionImpact: localTemplate.productionImpact,
          businessImpact: managerRole || localTemplate.businessImpact,
          riskAssessment: localTemplate.riskAssessment,
          debuggingSteps: localTemplate.debuggingSteps,
          codeExamples: localTemplate.codeExamples,
          bestPractices: localTemplate.bestPractices,
          codeImprovementSuggestions: localTemplate.codeImprovementSuggestions,
          securityRecommendations: secRole || localTemplate.securityRecommendations,
          performanceRecommendations: localTemplate.performanceRecommendations,
          relatedTechnologies: localTemplate.relatedTechnologies,

          // === PHASE 3: NEW STRUCTURED FIELDS ===
          // Stack trace interpretation
          stackTraceAnalysis: stackResult?.summary || null,
          // Code snippet understanding
          codeAnalysis: codeResult ? {
            explanation: codeResult.explanation,
            fixSuggestion: codeResult.fixSuggestion,
          } : null,
          // Framework-aware context
          frameworkAnalysis: frameworkResult?.frameworkContext || null,
          // Structured recommendations
          hfRecommendations: recResult?.recommendations || null,

          // Role-based summaries (existing: developer/qa/devops/security/manager)
          roles: {
            developer: devRole || localTemplate.roles.developer,
            qa: qaRole || localTemplate.roles.qa,
            devops: devopsRole || localTemplate.roles.devops,
            security: secRole || localTemplate.roles.security,
            manager: managerRole || localTemplate.roles.manager,
          },

          // === REQUIRED: 5 seniority-based role explanations ===
          roleExplanations: {
            beginner: beginnerRole || defaultRoleExplanations.beginner,
            junior: juniorRole || defaultRoleExplanations.junior,
            midLevel: midLevelRole || defaultRoleExplanations.midLevel,
            senior: seniorRole || defaultRoleExplanations.senior,
            techLead: techLeadRole || defaultRoleExplanations.techLead,
          },

          provider: "Hugging Face"
        };
      }
    } catch (err) {
      console.warn("[HF] Enrichment pipeline failed. Falling back to local templates:", err.message);
    }
  }

  // Graceful Local Fallback — return the full structured response using templates
  return {
    executiveSummary: localTemplate.executiveSummary,
    humanExplanation: localTemplate.humanExplanation,
    technicalExplanation: localTemplate.technicalExplanation,
    rootCause: localTemplate.rootCause,
    immediateFix: localTemplate.immediateFix,
    permanentFix: localTemplate.permanentFix,
    prevention: localTemplate.prevention,
    productionImpact: localTemplate.productionImpact,
    businessImpact: localTemplate.businessImpact,
    riskAssessment: localTemplate.riskAssessment,
    debuggingSteps: localTemplate.debuggingSteps,
    codeExamples: localTemplate.codeExamples,
    bestPractices: localTemplate.bestPractices,
    codeImprovementSuggestions: localTemplate.codeImprovementSuggestions,
    securityRecommendations: localTemplate.securityRecommendations,
    performanceRecommendations: localTemplate.performanceRecommendations,
    relatedTechnologies: localTemplate.relatedTechnologies,

    // Phase 3 fields (null when in fallback mode)
    stackTraceAnalysis: null,
    codeAnalysis: null,
    frameworkAnalysis: null,
    hfRecommendations: null,

    // Existing role-based summaries (developer/qa/devops/security/manager)
    roles: {
      developer: localTemplate.roles.developer,
      qa: localTemplate.roles.qa,
      devops: localTemplate.roles.devops,
      security: localTemplate.roles.security,
      manager: localTemplate.roles.manager,
    },

    // 5 seniority-based role explanations (always present in both HF and fallback paths)
    roleExplanations: buildRoleExplanations(localTemplate),

    provider: "TraceKey Local Engine (Fallback)"
  };
}

module.exports = { generateAIExplanation, normalizeCategory };
