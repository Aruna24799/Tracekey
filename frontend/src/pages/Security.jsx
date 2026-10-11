
import React, { useCallback, useEffect, useState } from "react";
import {
  fetchSecurityActivity,
  fetchSecurityFindings,
  fetchSecurityScore,
} from "../api.js";

// ─── Severity badge ────────────────────────────────────────────────────────────
const SEVERITY_COLOR = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#facc15",
  LOW: "#22c55e",
  ERROR: "#ef4444",
};

function SeverityBadge({ value }) {
  if (!value) return null;
  const v = String(value).toUpperCase();
  const color = SEVERITY_COLOR[v] || "#94a3b8";
  return (
    <span
      style={{
        fontSize: "0.68rem",
        fontWeight: 700,
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        padding: "2px 8px",
        borderRadius: "999px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {v}
    </span>
  );
}

// ─── Security page ─────────────────────────────────────────────────────────────

function Security() {
  const [scoreData, setScoreData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // All three API calls are the existing ones — nothing new added
  const loadSecurity = useCallback(async () => {
    try {
      setLoading(true);
      const [score, activityData, findingData] = await Promise.all([
        fetchSecurityScore(),
        fetchSecurityActivity(),
        fetchSecurityFindings(),
      ]);

      setScoreData(score || null);
      setActivity(
        Array.isArray(activityData?.timeline)
          ? activityData.timeline
          : Array.isArray(activityData)
          ? activityData
          : []
      );
      setFindings(Array.isArray(findingData) ? findingData : []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Security monitoring failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecurity();
  }, [loadSecurity]);

  const score = scoreData?.score ?? 0;
  const status = scoreData?.status || "UNKNOWN";

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div className="card">
        <h1>Runtime Security</h1>
        <p style={{ marginTop: "10px", color: "#94A3B8" }}>
          Verified security findings from error analysis and project scans. All data is
          backend-confirmed — no fabricated results.
        </p>
      </div>

      {loading ? (
        <div className="card"><p>Loading security metrics…</p></div>
      ) : error ? (
        <div className="card"><p style={{ color: "#F87171" }}>{error}</p></div>
      ) : (
        <>
          {/* ── Score row ── */}
          <div className="grid-2">
            <div className="card">
              <h2>Security Score</h2>
              <div style={{ marginTop: "16px", display: "flex", alignItems: "baseline", gap: "12px" }}>
                <span
                  style={{
                    fontSize: "3rem",
                    fontWeight: 800,
                    lineHeight: 1,
                    color:
                      score >= 80
                        ? "#22c55e"
                        : score >= 60
                        ? "#facc15"
                        : "#ef4444",
                  }}
                >
                  {score}%
                </span>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color:
                      status === "Excellent" || status === "Good"
                        ? "#22c55e"
                        : "#f97316",
                    fontWeight: 600,
                  }}
                >
                  {status}
                </span>
              </div>
              <p style={{ marginTop: "8px", color: "#94A3B8", fontSize: "0.82rem" }}>
                Computed from verified backend findings only.
              </p>
            </div>

            <div className="card">
              <h2>Finding Summary</h2>
              <div style={{ marginTop: "16px", display: "grid", gap: "8px" }}>
                {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => {
                  const count = findings.filter(
                    (f) => (f.severity || "MEDIUM").toUpperCase() === sev
                  ).length;
                  return (
                    <div
                      key={sev}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <SeverityBadge value={sev} />
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "1rem",
                          color: count > 0 ? SEVERITY_COLOR[sev] : "#333",
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Verified Findings ── */}
          <div className="card">
            <h2>Verified Findings</h2>
            <p style={{ color: "#94A3B8", fontSize: "0.82rem", marginBottom: "18px" }}>
              Only backend-confirmed security events from error analysis and project scans are shown.
            </p>

            {findings.length === 0 ? (
              <p style={{ color: "#555", fontSize: "0.85rem" }}>
                No verified security vulnerabilities detected. Upload and analyze a project to scan for
                hardcoded credentials, insecure patterns, and OWASP issues.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "14px" }}>
                {findings.slice(0, 10).map((item) => (
                  <div
                    key={item._id}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {/* Title row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "12px",
                        marginBottom: "10px",
                      }}
                    >
                      <strong style={{ fontSize: "0.9rem", color: "#e2e8f0" }}>
                        {item.title || item.errorTitle || item.category || "SECURITY_EVENT"}
                      </strong>
                      <SeverityBadge value={item.severity} />
                    </div>

                    {/* Root cause / description */}
                    {(item.rootCause || item.fix || item.prevention) && (
                      <p style={{ color: "#CBD5E1", fontSize: "0.85rem", lineHeight: 1.65, marginBottom: "10px" }}>
                        {item.rootCause || item.fix || item.prevention}
                      </p>
                    )}

                    {/* Security threats */}
                    {Array.isArray(item.security) && item.security.length > 0 && (
                      <div style={{ marginBottom: "8px" }}>
                        <p style={{ fontSize: "0.72rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>
                          Detected Threats
                        </p>
                        {item.security.slice(0, 5).map((threat, i) => (
                          <p key={i} style={{ fontSize: "0.82rem", color: "#f87171", marginBottom: "4px" }}>
                            • {threat}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Security impact */}
                    {Array.isArray(item.securityImpact) && item.securityImpact.length > 0 && (
                      <div style={{ marginBottom: "8px" }}>
                        <p style={{ fontSize: "0.72rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>
                          Security Impact
                        </p>
                        {item.securityImpact.slice(0, 3).map((impact, i) => (
                          <p key={i} style={{ fontSize: "0.82rem", color: "#fbbf24", marginBottom: "4px" }}>
                            • {impact}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Affected files */}
                    {Array.isArray(item.affectedFiles) && item.affectedFiles.length > 0 && (
                      <div style={{ marginBottom: "8px" }}>
                        <p style={{ fontSize: "0.72rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>
                          Affected Files
                        </p>
                        <p style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                          {item.affectedFiles.slice(0, 6).join(" • ")}
                        </p>
                      </div>
                    )}

                    {/* Recommendations */}
                    {item.securityRecommendations && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          background: "rgba(34,197,94,0.06)",
                          border: "1px solid rgba(34,197,94,0.15)",
                        }}
                      >
                        <p style={{ fontSize: "0.72rem", color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>
                          Recommendation
                        </p>
                        <p style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.6 }}>
                          {item.securityRecommendations}
                        </p>
                      </div>
                    )}

                    {/* Timestamp + source */}
                    <p style={{ marginTop: "10px", fontSize: "0.72rem", color: "#333" }}>
                      {item.source ? `Source: ${item.source} · ` : ""}
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Activity Timeline ── */}
          <div className="card">
            <h2>Activity Timeline</h2>
            {activity.length === 0 ? (
              <p style={{ color: "#555", fontSize: "0.85rem", marginTop: "8px" }}>
                No activity events returned by the backend.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
                {activity.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "14px",
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <strong style={{ fontSize: "0.88rem", color: "#e2e8f0" }}>
                      {item.date || item.type || item.category || "SECURITY_EVENT"}
                    </strong>
                    <p style={{ marginTop: "8px", color: "#CBD5E1", fontSize: "0.84rem" }}>
                      {typeof item.success === "number"
                        ? `Success: ${item.success}, Failed: ${item.failed}`
                        : item.message || item.rootCause || "No details."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Security;
