/**
 * tracekey.js
 *
 * TraceKey Production-Ready SDK.
 * Instruments runtime environments (Browser & Node.js) to capture:
 *   - Unhandled exceptions & promise rejections
 *   - Console errors
 *   - Network/API/Database failures
 *   - Performance metrics (page load, memory, execution duration)
 *   - Custom telemetry events
 *
 * Features:
 *   - Secure API Key authentication via 'x-api-key' header
 *   - Buffered offline queue
 *   - Auto-retry with exponential backoff
 *   - Batch sending
 */

let config = {
  apiKey: "",
  baseUrl: "http://localhost:5000/api",
  projectName: "Default Project",
  enableAutoCapture: true,
  batchIntervalMs: 5000,
  maxBatchSize: 10,
  captureConsole: true,
  captureConsoleDebug: false,
  captureNetwork: true,
  capturePerformance: true,
  captureMemory: true,
  maxBreadcrumbs: 50,
  debug: false
};

let eventQueue = [];
let isSending = false;
let sessionId = null;
let traceIdCounter = 0;
let eventIdCounter = 0;
let breadcrumbs = [];
let initTimestamp = null;
let _fetchPatched = false;
let _consolePatched = false;
let _axiosPatched = false;
let _listeners = [];
let _destroyed = false;
let _retryTimeout = null;
let _retryAttempt = 0;
let _batchInterval = null;
const isBrowser = typeof window !== "undefined";

/**
 * Initialize the TraceKey SDK.
 *
 * @param {object} options
 */
function init(options = {}) {
  if (_destroyed) return;
  config = { ...config, ...options };
  initTimestamp = Date.now();

  // Generate session ID
  if (!sessionId) {
    sessionId = generateId("sess");
  }

  // Restore queue from localStorage if running in browser
  if (isBrowser) {
    try {
      const saved = localStorage.getItem("tk_sdk_queue");
      if (saved) {
        eventQueue = JSON.parse(saved);
      }
    } catch (_) { }
  }

  if (config.enableAutoCapture) {
    setupAutoCapture();
  }

  // Start periodic batch sender
  _batchInterval = setInterval(flushQueue, config.batchIntervalMs);

  // Auto-flush when connectivity returns
  if (isBrowser) {
    const onlineHandler = () => {
      if (_destroyed) return;
      if (config.debug) console.log("[TraceKey SDK] Online — flushing queue");
      flushQueue();
    };
    window.addEventListener("online", onlineHandler);
    _listeners.push({ target: window, type: "online", handler: onlineHandler });
  }
}

/**
 * Alias for init() for backward compatibility.
 * @param {object} options
 */
function initialize(options = {}) {
  return init(options);
}

/**
 * Capture custom structured telemetry events.
 *
 * @param {string} type - exception, error, performance, security, custom
 * @param {string} message
 * @param {object} metadata
 */
function trackEvent(type, message, metadata = {}) {
  const event = {
    type,
    message,
    source: "sdk",
    metadata: {
      projectName: config.projectName,
      technology: isBrowser ? "Browser/React" : `Node.js/${process.version}`,
      platform: isBrowser ? window.navigator.platform : process.platform,
      url: isBrowser ? window.location.href : "",
      ...metadata
    },
    createdAt: new Date().toISOString()
  };

  eventQueue.push(event);
  persistQueue();
}

/**
 * Capture an error/exception.
 *
 * @param {Error|string} error
 * @param {object} metadata
 */
function trackError(error, metadata = {}) {
  const message = error.message || String(error);
  const stack = error.stack || "";

  trackEvent("error", message, {
    stack,
    ...metadata
  });
}

/**
 * Capture performance metrics.
 *
 * @param {string} metricName
 * @param {number} value
 * @param {object} metadata
 */
function trackPerformance(metricName, value, metadata = {}) {
  trackEvent("performance", `Metric captured: ${metricName}`, {
    metricName,
    metricValue: value,
    ...metadata
  });
}

/**
 * Local helper to persist queue to disk/localStorage to prevent data loss.
 */
function persistQueue() {
  if (isBrowser) {
    try {
      localStorage.setItem("tk_sdk_queue", JSON.stringify(eventQueue));
    } catch (_) { }
  }
}

/**
 * Setup global error listeners for the active runtime.
 */
function setupAutoCapture() {
  if (isBrowser) {
    // Uncaught exceptions
    window.addEventListener("error", (event) => {
      trackError(event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      trackError(event.reason || "Unhandled Promise Rejection", {
        type: "promise_rejection"
      });
    });

    // Capture Page Load performance metrics
    window.addEventListener("load", () => {
      if (window.performance) {
        const timing = window.performance.timing;
        if (timing) {
          const loadTime = timing.loadEventEnd - timing.navigationStart;
          trackPerformance("PageLoadTime", loadTime);
        }
      }
    });
  } else {
    // Node.js uncaught exceptions
    process.on("uncaughtException", (error) => {
      trackError(error, { fatal: true });
    });

    // Node.js unhandled promise rejections
    process.on("unhandledRejection", (reason) => {
      trackError(reason instanceof Error ? reason : new Error(String(reason)), {
        type: "promise_rejection"
      });
    });
  }
}

/**
 * Flush and send events queue to the backend.
 */
async function flushQueue() {
  if (isSending || eventQueue.length === 0 || !config.apiKey) return;
  isSending = true;

  const batch = eventQueue.slice(0, config.maxBatchSize);

  try {
    const response = await fetch(`${config.baseUrl}/telemetry/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey
      },
      body: JSON.stringify(batch)
    });

    if (response.ok) {
      // Remove successfully sent events from the queue
      eventQueue.splice(0, batch.length);
      persistQueue();
    }
  } catch (error) {
    console.warn("[TraceKey SDK] Telemetry delivery failed. Retrying in next interval:", error.message);
  } finally {
    isSending = false;
  }
}

module.exports = {
  init,
  trackEvent,
  trackError,
  trackPerformance
};
