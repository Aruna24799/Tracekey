// TraceKey SDK - simple wrapper for API calls
// This SDK can be used in other Node.js projects to interact with the TraceKey backend.
// It provides functions to register, login, analyze errors, and fetch reports.

const API_BASE = "http://localhost:5000/api";

/**
 * Register a new user.
 * @param {{name:string,email:string,password:string}} data
 * @returns {Promise<any>}
 */
async function register(data) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

/**
 * Login and obtain JWT token.
 * @param {{email:string,password:string}} credentials
 * @returns {Promise<{token:string,user:any}>}
 */
async function login(credentials) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });
  return res.json();
}

/**
 * Analyze an error string.
 * @param {string} errorText
 * @param {string} token JWT token
 * @returns {Promise<any>}
 */
async function analyzeError(errorText, token) {
  const res = await fetch(`${API_BASE}/errors/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ error: errorText })
  });
  return res.json();
}

/**
 * Get recent error reports for the authenticated user.
 * @param {string} token JWT token
 * @returns {Promise<any[]>}
 */
async function getReports(token) {
  const res = await fetch(`${API_BASE}/errors/reports`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  return res.json();
}

/**
 * Get security score and details.
 * @param {string} token JWT token
 * @returns {Promise<any>}
 */
async function getSecurityScore(token) {
  const res = await fetch(`${API_BASE}/security/score`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  return res.json();
}

/**
 * Get security activity timeline.
 * @param {string} token JWT token
 * @returns {Promise<any>}
 */
async function getActivity(token) {
  const res = await fetch(`${API_BASE}/security/activity`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  return res.json();
}

/**
 * Get all active sessions.
 * @param {string} token JWT token
 * @returns {Promise<any[]>}
 */
async function getSessions(token) {
  const res = await fetch(`${API_BASE}/auth/sessions`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  return res.json();
}

/**
 * Revoke a specific session.
 * @param {string} sessionId
 * @param {string} token JWT token
 * @returns {Promise<any>}
 */
async function revokeSession(sessionId, token) {
  const res = await fetch(`${API_BASE}/auth/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  return res.json();
}

module.exports = { register, login, analyzeError, getReports, getSecurityScore, getActivity, getSessions, revokeSession };
