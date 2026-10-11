/**
 * TraceKey 2.0 - Client-side Telemetry & Silent Failure Detection Engine
 * Instruments fetch, Promises, setTimeout, and XMLHttpRequest
 * to expose and record swallowed, unresolved, or logical runtime failures.
 */

(function () {
  // --- 1. Cache Original Native Browser Bindings ---
  // Crucial: Use cached bindings to report telemetry to prevent infinite recursion loop crashes.
  const rawFetch = window.fetch;
  const rawGetItem = window.localStorage.getItem;
  const rawSetTimeout = window.setTimeout;
  const rawXhrOpen = window.XMLHttpRequest.prototype.open;
  const rawXhrSend = window.XMLHttpRequest.prototype.send;

  const API_TELEMETRY = "/api/telemetry/event";
  const telemetryQueue = [];
  let isFlushing = false;

  // --- 2. Lightweight, Buffered, Non-blocking Telemetry Flusher ---
  function reportTelemetry(event) {
    try {
      const correlationId = "tlm_" + Math.random().toString(36).substring(2, 11);
      const stackLines = new Error().stack?.split("\n") || [];
      const cleanStack = stackLines.slice(2).join("\n");

      const item = {
        correlationId,
        timestamp: new Date().toISOString(),
        type: event.type || "RUNTIME_EVENT",
        category: event.category || "UNKNOWN_ERROR",
        description: event.description || "Runtime telemetry event",
        payload: event.payload || {},
        stack: cleanStack
      };

      telemetryQueue.push(item);

      // Schedule asynchronous non-blocking flush
      rawSetTimeout(flushQueue, 1500);
    } catch (e) {
      console.warn("⚠️ [TraceKey Telemetry] Failed to buffer event:", e.message);
    }
  }

  async function flushQueue() {
    if (isFlushing || telemetryQueue.length === 0) return;
    isFlushing = true;

    try {
      const token = rawGetItem.call(window.localStorage, "tk_token");
      if (!token) {
        isFlushing = false;
        return;
      }

      // Take a batch of up to 10 events
      const batch = telemetryQueue.splice(0, 10);

      try {
        await rawFetch(API_TELEMETRY, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            events: batch
          })
        });
      } catch (err) {
        // Re-queue items on network failure
        telemetryQueue.unshift(...batch);
      }
    } catch (globalErr) {
      // Silently ignore flusher errors to prevent cascading failures
    } finally {
      isFlushing = false;
    }
  }

  // Periodic flush
  setInterval(flushQueue, 10000);

  // --- 3. XMLHttpRequest Instrumentation ---
  try {
    window.XMLHttpRequest.prototype.open = function (method, url, ...args) {
      this._tracekeyUrl = String(url || "");
      this._tracekeyMethod = method;
      this._tracekeyStartTime = Date.now();
      return rawXhrOpen.apply(this, [method, url, ...args]);
    };

    window.XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener("load", function () {
        const url = this._tracekeyUrl || "";
        // Exclude internal API calls to prevent recursive loops
        if (url.includes("/api/")) {
          return;
        }

        if (this.status >= 400) {
          reportTelemetry({
            type: "RESPONSE_UNCHECKED",
            category: "NETWORK_ERROR",
            description: `XHR request failed with status ${this.status} on ${this._tracekeyMethod} endpoint: ${url}`,
            payload: { url, method: this._tracekeyMethod, status: this.status, duration: Date.now() - this._tracekeyStartTime }
          });
        }
      });

      this.addEventListener("error", function () {
        const url = this._tracekeyUrl || "";
        if (url.includes("/api/")) return;

        reportTelemetry({
          type: "RACE_FETCH",
          category: "NETWORK_ERROR",
          description: `XHR critical network failure on ${this._tracekeyMethod} endpoint: ${url}`,
          payload: { url, method: this._tracekeyMethod }
        });
      });

      return rawXhrSend.apply(this, args);
    };
  } catch (xhrErr) {
    console.warn("⚠️ [TraceKey Telemetry] XMLHttpRequest instrumentation failed:", xhrErr.message);
  }

  // --- 4. Fetch API Instrumentation ---
  try {
    const activeRequests = {};

    window.fetch = async function (resource, options) {
      const url = typeof resource === "string" ? resource : (resource?.url || "");

      // Strictly avoid intercepting internal API calls to avoid recursive loop cascades
      if (url.includes("/api/")) {
        return rawFetch.apply(this, arguments);
      }

      const startTime = Date.now();

      if (!activeRequests[url]) activeRequests[url] = [];
      activeRequests[url].push(startTime);

      try {
        const response = await rawFetch.apply(this, arguments);
        const duration = Date.now() - startTime;

        if (activeRequests[url]) {
          const idx = activeRequests[url].indexOf(startTime);
          if (idx > -1) activeRequests[url].splice(idx, 1);
        }

        if (response.status >= 400) {
          reportTelemetry({
            type: "RESPONSE_UNCHECKED",
            category: "NETWORK_ERROR",
            description: `Fetch HTTP request failed with code ${response.status} on endpoint: ${url}`,
            payload: { url, status: response.status, statusText: response.statusText, duration }
          });
        }

        return response;
      } catch (err) {
        if (activeRequests[url]) {
          const idx = activeRequests[url].indexOf(startTime);
          if (idx > -1) activeRequests[url].splice(idx, 1);
        }

        reportTelemetry({
          type: "RACE_FETCH",
          category: "NETWORK_ERROR",
          description: `Fetch network execution error on endpoint: ${url}. Reason: ${err.message}`,
          payload: { url, error: err.message }
        });
        throw err;
      }
    };
  } catch (fetchErr) {
    console.warn("⚠️ [TraceKey Telemetry] Fetch API instrumentation failed:", fetchErr.message);
  }

  // --- 5. SetTimeout Callback Wrapper Exception Catcher ---
  try {
    window.setTimeout = function (callback, delay, ...args) {
      if (typeof callback !== "function") {
        return rawSetTimeout.call(window, callback, delay, ...args);
      }
      const wrappedCallback = function () {
        try {
          return callback.apply(this, args);
        } catch (err) {
          reportTelemetry({
            type: "STALE_CLOSURE",
            category: "REACT_ERROR",
            description: `Deferred setTimeout callback execution threw exception: ${err.message}`,
            payload: { delay, error: err.message },
            stack: err.stack
          });
          throw err;
        }
      };

      return rawSetTimeout.call(window, wrappedCallback, delay);
    };
  } catch (timerErr) {
    console.warn("⚠️ [TraceKey Telemetry] setTimeout instrumentation failed:", timerErr.message);
  }

  // --- 6. Unhandled Promise Rejections Catcher ---
  try {
    window.addEventListener("unhandledrejection", function (event) {
      const reason = event.reason;
      let message = "Unknown reason";
      let stack = "";

      if (reason instanceof Error) {
        message = reason.message;
        stack = reason.stack || "";
      } else if (reason) {
        message = typeof reason === "object" ? JSON.stringify(reason) : String(reason);
      }

      if (message.includes("/api/")) return;

      reportTelemetry({
        type: "ASYNC_VOID",
        category: "ASYNC_ERROR",
        description: `Swallowed or unhandled promise rejection occurred: ${message}`,
        payload: { message },
        stack: stack
      });
    });
  } catch (promiseErr) {
    console.warn("⚠️ [TraceKey Telemetry] Promise rejection instrumentation failed:", promiseErr.message);
  }

  console.log("⚡ [TraceKey SDK] Telemetry Instrumentation Engine initialized & monitoring.");
})();
