
// frontend/src/api.js

const BASE =
  import.meta.env.VITE_API_BASE ||
  "/api";

function getToken() {
  try {
    return (
      localStorage.getItem(
        "tk_token"
      ) || ""
    );
  } catch {
    return "";
  }
}

function createHeaders(
  extraHeaders = {},
  isFormData = false
) {
  const token = getToken();

  return {
    ...(isFormData
      ? {}
      : {
        "Content-Type":
          "application/json",
      }),

    ...(token
      ? {
        Authorization: `Bearer ${token}`,
      }
      : {}),

    ...extraHeaders,
  };
}

async function apiFetch(
  path,
  options = {}
) {
  const controller =
    new AbortController();

  const timeoutDuration = options.timeout || 45000;
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutDuration);

  try {
    const isFormData =
      options.body instanceof FormData;

    const response = await fetch(
      `${BASE}${path}`,
      {
        ...options,

        signal:
          controller.signal,

        headers: createHeaders(
          options.headers,
          isFormData
        ),
      }
    );

    clearTimeout(timeout);

    if (response.status === 401) {
      try {
        localStorage.removeItem("tk_token");
        localStorage.removeItem("tk_username");
        localStorage.removeItem("tk_email");
      } catch (e) { }
      window.location.reload();
      return null;
    }

    let data = null;

    try {
      data =
        await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
        data?.error ||
        `API Error ${response.status}`
      );
    }

    return data;
  } catch (err) {
    clearTimeout(timeout);

    if (
      err.name ===
      "AbortError"
    ) {
      throw new Error(
        "Request timeout"
      );
    }

    throw err;
  }
}

//
// TELEMETRY EVENT INGESTION
//
export const sendTelemetryEvent = (payload) =>
  apiFetch("/telemetry/event", {
    method: "POST",
    body: JSON.stringify(payload),
  });
// AUTH
//

export const loginUser = (
  payload
) =>
  apiFetch("/auth/login", {
    method: "POST",

    body: JSON.stringify(
      payload
    ),
  });

export const registerUser = (
  payload
) =>
  apiFetch(
    "/auth/register",
    {
      method: "POST",

      body: JSON.stringify(
        payload
      ),
    }
  );

// Get sessions
export const getSessions = () =>
  apiFetch("/auth/sessions");

// Revoke session
export const revokeSession = (sessionId) =>
  apiFetch(`/auth/sessions/${sessionId}`, {
    method: "DELETE",
  });

// Settings Management
export const fetchSettings = () =>
  apiFetch("/auth/settings");

export const saveSettings = (payload) =>
  apiFetch("/auth/settings", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const generateApiKey = (payload) =>
  apiFetch("/auth/settings/apikey", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const revokeApiKey = (key) =>
  apiFetch(`/auth/settings/apikey/${key}`, {
    method: "DELETE",
  });

export const addTeamMember = (payload) =>
  apiFetch("/auth/settings/team", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const removeTeamMember = (email) =>
  apiFetch(`/auth/settings/team/${email}`, {
    method: "DELETE",
  });

export const testAiConnection = () =>
  apiFetch("/auth/settings/ai/test", {
    method: "POST",
  });

//
// HEALTH
//

export const fetchHealth =
  () => apiFetch("/health/stats");

//
// TELEMETRY
//

export const fetchTelemetry =
  () =>
    apiFetch(
      "/telemetry"
    );

//
// REPORTS / ERRORS
//

export const fetchErrorReports =
  () => apiFetch("/errors/reports");

// Run a manual error analysis
export const analyzeError = (errorText) =>
  apiFetch("/errors/analyze", {
    method: "POST",
    body: JSON.stringify({ error: errorText, source: "manual" }),
  });

//
// OCR
//

export const uploadScreenshot =
  (formData) =>
    apiFetch(
      "/ocr/extract",
      {
        method: "POST",
        body: formData,
      }
    );

//
// SECURITY
//

export const fetchSecurityScore =
  () =>
    apiFetch(
      "/security/score"
    );

export const fetchSecurityActivity =
  () =>
    apiFetch(
      "/security/activity"
    );

export const fetchSecurityFindings =
  () =>
    apiFetch(
      "/security/findings"
    );

export const fetchProjectKnowledge =
  () =>
    apiFetch(
      "/knowledge/current"
    );

//
// PREDICTIVE INSIGHTS
//

export const fetchPredictions =
  () =>
    apiFetch(
      "/predictive/analysis"
    );

//
// FILE / PROJECT ANALYSIS
//

export const analyzeFile = (payload) =>
  apiFetch("/analysis/file", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const analyzeProject = (formData) =>
  apiFetch("/analysis/project", {
    method: "POST",
    body: formData,
  });

//
// FORENSICS
//

export const fetchForensicTimeline =
  () =>
    apiFetch(
      "/forensics/timeline"
    );

//
// ROOT CAUSE ANALYSIS
//

export const fetchRootCauseAnalysis =
  (payload) =>
    apiFetch(
      "/analysis/root-cause",
      {
        method: "POST",

        body: JSON.stringify(
          payload
        ),
      }
    );

//
// SDK EVENTS
//

export const sendSdkEvent = (
  payload
) =>
  apiFetch("/sdk/event", {
    method: "POST",

    body: JSON.stringify(
      payload
    ),
  });

//
// RUNTIME EVENTS
//

export const captureRuntimeEvent =
  (payload) =>
    apiFetch(
      "/runtime/event",
      {
        method: "POST",

        body: JSON.stringify(
          payload
        ),
      }
    );

export default apiFetch;
