import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext.jsx";
import {
  fetchHealth,
  fetchSecurityScore,
  fetchErrorReports,
  fetchTelemetry,
  fetchProjectKnowledge,
  fetchPredictions,
} from "../api.js";

/* ─── Stat Card ─────────────────────────────────────── */
function StatCard({ label, value, sub, accent = "#3b82f6", icon, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#0d0d0d",
        border: "1px solid #1a1a1a",
        borderRadius: "14px",
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)";
          e.currentTarget.style.background = "#0f0f0f";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = "#1a1a1a";
          e.currentTarget.style.background = "#0d0d0d";
        }
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p
          style={{
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#555",
            margin: 0,
          }}
        >
          {label}
        </p>
        {icon && <span style={{ fontSize: "1.2rem", opacity: 0.5 }}>{icon}</span>}
      </div>
      <h2
        style={{
          fontSize: "1.9rem",
          fontWeight: 700,
          color: accent,
          margin: 0,
          lineHeight: 1.1,
          wordBreak: "break-word",
        }}
      >
        {value ?? "—"}
      </h2>
      {sub && (
        <p style={{ fontSize: "0.78rem", color: "#444", margin: 0 }}>{sub}</p>
      )}
    </div>
  );
}

/* ─── Severity Badge ─────────────────────────────────── */
const SEVERITY_COLOR = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#facc15",
  LOW: "#22c55e",
  ERROR: "#ef4444",
};

function SeverityBadge({ value }) {
  const v = (value || "LOW").toUpperCase();
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

/* ─── Error Row ─────────────────────────────────────── */
function ErrorRow({ report }) {
  const ts = report.createdAt
    ? new Date(report.createdAt).toLocaleString()
    : "—";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "12px",
        padding: "14px 0",
        borderBottom: "1px solid #141414",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 600,
            color: "#e2e8f0",
            margin: 0,
            fontSize: "0.88rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {report.category || "UNKNOWN_ERROR"}
        </p>
        <p
          style={{
            color: "#444",
            fontSize: "0.78rem",
            margin: "4px 0 0",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {report.rootCause || report.fix || "No details available."}
        </p>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "6px",
          flexShrink: 0,
        }}
      >
        <SeverityBadge value={report.severity} />
        <span style={{ fontSize: "0.68rem", color: "#333" }}>{ts}</span>
      </div>
    </div>
  );
}

/* ─── Section Card ───────────────────────────────────── */
function Section({ title, children, action }) {
  return (
    <div
      style={{
        background: "#0d0d0d",
        border: "1px solid #1a1a1a",
        borderRadius: "14px",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "0.95rem",
            fontWeight: 700,
            color: "#e2e8f0",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─── Bar ──────────────────────────────────────────── */
function ScoreBar({ value, color = "#3b82f6" }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div
      style={{
        height: "6px",
        borderRadius: "999px",
        background: "#1a1a1a",
        overflow: "hidden",
        marginTop: "10px",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: "999px",
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

/* ─── Health Row ─────────────────────────────────────── */
function HealthRow({ label, value, color }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.8rem",
          color: "#666",
          marginBottom: "4px",
        }}
      >
        <span>{label}</span>
        <span style={{ color: color || "#e2e8f0", fontWeight: 600 }}>
          {value}
        </span>
      </div>
      <ScoreBar value={Number(String(value).replace("%", "")) || 0} color={color} />
    </div>
  );
}

/* ─── Quick Action Button ──────────────────────────── */
function QuickAction({ label, icon, to, onClick, color = "#3b82f6" }) {
  const navigate = useNavigate();
  const handleClick = onClick || (to ? () => navigate(to) : undefined);
  return (
    <button
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 16px",
        borderRadius: "10px",
        border: "1px solid #1a1a1a",
        background: "#080808",
        color: "#e2e8f0",
        fontSize: "0.82rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s ease",
        textAlign: "left",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}40`;
        e.currentTarget.style.background = `${color}08`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#1a1a1a";
        e.currentTarget.style.background = "#080808";
      }}
    >
      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* ─── Project Upload Section ─────────────────────────── */
function ProjectUploader({ onAnalysisComplete }) {
  const { analyzeProjectFile, isAnalyzing, analysisError, projectData } = useProject();
  const [file, setFile] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [localError, setLocalError] = useState("");
  const [collapsed, setCollapsed] = useState(!!projectData);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".zip")) {
      setLocalError("Only .zip files are supported. Please zip your project folder first.");
      return;
    }
    setLocalError("");
    setFile(f);
    if (!projectName) setProjectName(f.name.replace(".zip", ""));
  };

  const handleAnalyze = async () => {
    if (!file) {
      setLocalError("Please select a project ZIP file.");
      return;
    }
    setLocalError("");
    const fd = new FormData();
    fd.append("projectfile", file);
    fd.append("projectName", projectName || file.name.replace(".zip", ""));
    try {
      await analyzeProjectFile(fd);
      if (onAnalysisComplete) onAnalysisComplete();
      setCollapsed(true);
    } catch {
      // analysisError from context is shown below
    }
  };

  const displayError = localError || analysisError;

  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid rgba(59,130,246,0.2)",
        borderRadius: "14px",
        overflow: "hidden",
        marginBottom: "20px",
      }}
    >
      {/* Header row — always visible */}
      <div
        style={{
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          borderBottom: collapsed ? "none" : "1px solid #1a1a1a",
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.1rem" }}>📂</span>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "#e2e8f0",
              }}
            >
              Analyze Project
            </p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#444" }}>
              {projectData
                ? `Last: ${projectData.projectName || "project"} · ${projectData.filesAnalyzedCount || 0} files scanned`
                : "Upload a ZIP to activate the full platform"}
            </p>
          </div>
        </div>
        <span style={{ color: "#555", fontSize: "0.8rem" }}>
          {collapsed ? "▼ Expand" : "▲ Collapse"}
        </span>
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <div style={{ padding: "20px 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: "12px",
              alignItems: "end",
            }}
          >
            <div>
              <label
                htmlFor="project-zip-input"
                style={{
                  display: "block",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "6px",
                }}
              >
                Project ZIP File
              </label>
              <input
                id="project-zip-input"
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                style={{
                  background: "#0d0d0d",
                  border: "1px solid #1a1a1a",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  color: "#e2e8f0",
                  fontSize: "0.82rem",
                  width: "100%",
                  cursor: "pointer",
                  marginTop: 0,
                }}
              />
            </div>
            <div>
              <label
                htmlFor="project-name-input"
                style={{
                  display: "block",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "6px",
                }}
              >
                Project Name (optional)
              </label>
              <input
                id="project-name-input"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-project"
                style={{
                  background: "#0d0d0d",
                  border: "1px solid #1a1a1a",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  color: "#e2e8f0",
                  fontSize: "0.82rem",
                  width: "100%",
                  marginTop: 0,
                  outline: "none",
                }}
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !file}
              style={{
                background: isAnalyzing || !file ? "#1a1a1a" : "#3b82f6",
                color: isAnalyzing || !file ? "#555" : "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "11px 20px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: isAnalyzing || !file ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                height: "42px",
              }}
            >
              {isAnalyzing ? "Analyzing…" : "Analyze Project"}
            </button>
          </div>

          {displayError && (
            <p
              style={{
                marginTop: "12px",
                color: "#f87171",
                fontSize: "0.82rem",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "8px",
                padding: "10px 14px",
              }}
            >
              ⚠ {displayError}
            </p>
          )}

          {/* Analysis result summary */}
          {projectData && (
            <div
              style={{
                marginTop: "16px",
                padding: "14px 16px",
                background: "rgba(34,197,94,0.06)",
                border: "1px solid rgba(34,197,94,0.18)",
                borderRadius: "10px",
              }}
            >
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "#4ade80",
                  fontWeight: 700,
                  margin: "0 0 8px",
                }}
              >
                ✓ Analysis complete — platform updated
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "12px",
                }}
              >
                {[
                  { label: "Project", val: projectData.projectName },
                  { label: "Project Type", val: projectData.projectType || "Node Application" },
                  { label: "Framework", val: projectData.framework },
                  { label: "Total Files", val: projectData.totalFiles ?? projectData.filesAnalyzedCount },
                  { label: "Source Files", val: projectData.sourceFiles ?? projectData.filesAnalyzedCount },
                  { label: "Config Files", val: projectData.configFiles ?? 1 },
                  { label: "Env Files", val: projectData.envFilesCount ?? (projectData.envFiles?.length ?? 0) },
                  {
                    label: "Health Score",
                    val: projectData.healthScore ? `${projectData.healthScore}%` : "—",
                  },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: "var(--bg-raised)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.68rem",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        margin: "3px 0 0",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {val ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
              {projectData.analysis?.rootCause && (
                <p
                  style={{
                    marginTop: "12px",
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ color: "var(--text-primary)" }}>AI Summary: </strong>
                  {projectData.analysis.rootCause}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard ──────────────────────────────────────── */
function Dashboard() {
  const [health, setHealth] = useState(null);
  const [security, setSecurity] = useState(null);
  const [reports, setReports] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [knowledge, setKnowledge] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Consume projectVersion — when it increments (after analysis), re-fetch all data
  const { projectVersion } = useProject();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [h, s, r, t, k, p] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchSecurityScore().catch(() => null),
        fetchErrorReports().catch(() => null),
        fetchTelemetry().catch(() => null),
        fetchProjectKnowledge().catch(() => null),
        fetchPredictions().catch(() => null),
      ]);
      setHealth(h?.health || null);
      setSecurity(s || null);
      setReports(
        Array.isArray(r?.reports)
          ? r.reports
          : Array.isArray(r)
          ? r
          : []
      );
      setTelemetry(Array.isArray(t?.events) ? t.events : []);
      setKnowledge(k?.knowledge || null);
      setPredictions(p?.analysis || p || null);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Dashboard failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch when projectVersion changes (after successful analysis) OR on mount
  useEffect(() => {
    load();
  }, [load, projectVersion]);

  /* derived values */
  const stabilityIndex = health?.stabilityIndex ?? 0;
  const securityScore = security?.score ?? 0;
  const securityStatus = security?.status || "UNKNOWN";
  const dbStatus = health?.db?.status || "UNKNOWN";
  const dbPing = health?.db?.pingMs != null ? `${health.db.pingMs} ms` : null;
  const criticalCount = reports.filter(
    (r) => r.severity === "CRITICAL" || r.severity === "HIGH"
  ).length;
  const sdkEvents = telemetry.length;
  const projectName = knowledge?.projectName || "No project connected";
  const framework = knowledge?.framework || "—";
  const recentErrors = reports.slice(0, 5);
  const username = localStorage.getItem("tk_username") || "Analyst";

  /* AI Insights from predictions */
  const runtimeRiskScore = predictions?.runtimeRiskScore ?? null;
  const escalationWarnings = Array.isArray(predictions?.escalationWarnings)
    ? predictions.escalationWarnings
    : [];
  const topWarning = escalationWarnings[0] || null;

  /* performance summary from health memory */
  const memory = health?.memory || {};
  const system = health?.system || {};

  return (
    <div
      style={{
        padding: "32px 36px",
        maxWidth: "1400px",
        margin: "0 auto",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 700,
            color: "#e2e8f0",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Welcome back, {username}
        </h1>
        <p style={{ color: "#3a3a3a", marginTop: "6px", fontSize: "0.85rem" }}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          {" · "}
          <span
            style={{
              color: dbStatus === "CONNECTED" ? "#22c55e" : "#f97316",
            }}
          >
            ● {dbStatus === "CONNECTED" ? "All systems operational" : "Database " + dbStatus}
          </span>
        </p>
      </div>

      {/* ── Project Uploader ── */}
      <ProjectUploader onAnalysisComplete={load} />

      {error && (
        <div
          style={{
            background: "#1a0a0a",
            border: "1px solid #3f0f0f",
            borderRadius: "12px",
            padding: "14px 18px",
            color: "#f87171",
            marginBottom: "24px",
            fontSize: "0.85rem",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            background: "#0d0d0d",
            border: "1px solid #1a1a1a",
            borderRadius: "14px",
            padding: "48px",
            textAlign: "center",
            color: "#333",
          }}
        >
          Loading dashboard…
        </div>
      ) : (
        <>
          {/* ── Quick Actions Row ── */}
          <Section title="Quick Actions" action={null}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px",
              }}
            >
              <QuickAction
                label="Analyze Error"
                icon="🔍"
                to="/error"
                color="#3b82f6"
              />
              <QuickAction
                label="OCR Screenshot"
                icon="📷"
                to="/ocr"
                color="#06b6d4"
              />
              <QuickAction
                label="View Reports"
                icon="📊"
                to="/reports"
                color="#22c55e"
              />
              <QuickAction
                label="SDK Setup"
                icon="⚡"
                to="/sdk"
                color="#f97316"
              />
            </div>
          </Section>

          {/* ── Stat Row ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
              marginTop: "20px",
              marginBottom: "24px",
            }}
          >
            <StatCard
              label="Runtime Stability"
              value={`${stabilityIndex}%`}
              sub="Based on telemetry health index"
              accent="#22c55e"
              icon="🛡️"
              onClick={() => navigate("/health")}
            />
            <StatCard
              label="Security Score"
              value={`${securityScore}%`}
              sub={`Status: ${securityStatus}`}
              accent="#3b82f6"
              icon="🔒"
              onClick={() => navigate("/security")}
            />
            <StatCard
              label="Critical / High Errors"
              value={criticalCount}
              sub={`${reports.length} total reports`}
              accent="#ef4444"
              icon="⚠️"
              onClick={() => navigate("/reports")}
            />
            <StatCard
              label="SDK Events"
              value={sdkEvents}
              sub={sdkEvents > 0 ? "SDK connected" : "SDK not connected"}
              accent={sdkEvents > 0 ? "#22c55e" : "#f97316"}
              icon="📡"
              onClick={() => navigate("/sdk")}
            />
          </div>

          {/* ── Two Column: Recent Analysis + System Health ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 340px",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {/* Recent Analysis */}
            <Section
              title="Recent Analysis"
              action={
                <button
                  onClick={() => navigate("/reports")}
                  className="dash-link-btn"
                >
                  View All →
                </button>
              }
            >
              {recentErrors.length === 0 ? (
                <p style={{ color: "#333", fontSize: "0.85rem", margin: 0 }}>
                  No error reports found. Upload a project above or use Quick Actions to begin.
                </p>
              ) : (
                <>
                  {recentErrors.map((report, i) => (
                    <ErrorRow
                      key={report._id || i}
                      report={report}
                    />
                  ))}
                </>
              )}
            </Section>

            {/* System Health + Security Summary */}
            <Section title="System Health">
              <HealthRow
                label="Stability Index"
                value={`${stabilityIndex}%`}
                color="#22c55e"
              />
              <HealthRow
                label="Security Score"
                value={`${securityScore}%`}
                color="#3b82f6"
              />
              <HealthRow
                label="DB Ping"
                value={dbPing || "—"}
                color="#facc15"
              />

              <div
                style={{
                  marginTop: "20px",
                  paddingTop: "20px",
                  borderTop: "1px solid #141414",
                }}
              >
                <p
                  style={{
                    fontSize: "0.72rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--text-muted)",
                    margin: "0 0 10px",
                  }}
                >
                  Connected Project
                </p>
                <p
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {projectName}
                </p>
                {framework !== "—" && (
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-secondary)",
                      margin: "4px 0 0",
                    }}
                  >
                    {knowledge?.projectType || framework}
                  </p>
                )}

                {knowledge && (
                  <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.78rem" }}>
                    <div style={{ background: "var(--bg-raised)", padding: "6px 8px", borderRadius: "6px" }}>
                      <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.68rem" }}>Total Files</span>
                      <strong style={{ color: "var(--text-primary)" }}>{knowledge.totalFiles ?? (knowledge.folderStructure?.length || "—")}</strong>
                    </div>
                    <div style={{ background: "var(--bg-raised)", padding: "6px 8px", borderRadius: "6px" }}>
                      <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.68rem" }}>Source Files</span>
                      <strong style={{ color: "var(--text-primary)" }}>{knowledge.sourceFiles ?? "—"}</strong>
                    </div>
                    <div style={{ background: "var(--bg-raised)", padding: "6px 8px", borderRadius: "6px" }}>
                      <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.68rem" }}>Config Files</span>
                      <strong style={{ color: "var(--text-primary)" }}>{knowledge.configFiles ?? (knowledge.configuration?.length || "—")}</strong>
                    </div>
                    <div style={{ background: "var(--bg-raised)", padding: "6px 8px", borderRadius: "6px" }}>
                      <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.68rem" }}>Env Files</span>
                      <strong style={{ color: "var(--text-primary)" }}>{knowledge.environment?.length || 0}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: "16px",
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => navigate("/health")}
                  className="dash-link-btn"
                >
                  Health Details
                </button>
                <button
                  onClick={() => navigate("/insights")}
                  className="dash-link-btn"
                >
                  Insights
                </button>
              </div>
            </Section>
          </div>

          {/* ── Bottom Grid: Security Summary + AI Insights + Performance ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {/* Security Summary */}
            <Section title="Security Summary">
              <div className="dash-inner-card">
                <p className="dash-inner-label">Threat Status</p>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color:
                      security?.status === "Excellent" || security?.status === "Good"
                        ? "#22c55e"
                        : "#f97316",
                  }}
                >
                  {security?.status || "UNKNOWN"}
                </h3>
              </div>
              <div className="dash-inner-card">
                <p className="dash-inner-label">High / Critical Findings</p>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: criticalCount > 0 ? "#ef4444" : "#22c55e",
                  }}
                >
                  {criticalCount}
                </h3>
              </div>
              <div style={{ marginTop: "12px" }}>
                <button
                  onClick={() => navigate("/security")}
                  className="dash-link-btn"
                  style={{ width: "100%" }}
                >
                  View Security Details →
                </button>
              </div>
            </Section>

            {/* AI Insights Preview */}
            <Section title="AI Insights">
              {topWarning ? (
                <div
                  className={`dash-alert ${
                    topWarning.level === "CRITICAL" ? "dash-alert-critical" : "dash-alert-warning"
                  }`}
                >
                  <p className="dash-alert-level">
                    {topWarning.level === "CRITICAL" ? "🔴 Critical Alert" : "🟡 Warning"}
                  </p>
                  <p className="dash-alert-msg">
                    {topWarning.message}
                  </p>
                </div>
              ) : (
                <div className="dash-alert dash-alert-ok">
                  <p className="dash-alert-level">✅ System Nominal</p>
                  <p className="dash-alert-msg">
                    No critical predictive alerts. Runtime patterns are stable.
                  </p>
                </div>
              )}

              {runtimeRiskScore !== null && (
                <div style={{ marginTop: "12px" }}>
                  <HealthRow
                    label="Runtime Risk Score"
                    value={`${runtimeRiskScore}%`}
                    color={
                      runtimeRiskScore > 75
                        ? "#ef4444"
                        : runtimeRiskScore > 45
                        ? "#f97316"
                        : "#22c55e"
                    }
                  />
                </div>
              )}

              <div style={{ marginTop: "12px" }}>
                <button
                  onClick={() => navigate("/insights")}
                  className="dash-link-btn"
                  style={{ width: "100%" }}
                >
                  View Full Insights →
                </button>
              </div>
            </Section>

            {/* Performance Summary */}
            <Section title="Performance Summary">
              <div className="dash-inner-card">
                <p className="dash-inner-label">Memory (RSS)</p>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "#60a5fa",
                  }}
                >
                  {memory.rss ?? "—"} MB
                </h3>
              </div>
              <div className="dash-perf-grid">
                <div className="dash-inner-card">
                  <p className="dash-inner-label sm">Heap</p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "#e2e8f0",
                    }}
                  >
                    {memory.heapUsed != null ? `${memory.heapUsed} MB` : "—"}
                  </p>
                </div>
                <div className="dash-inner-card">
                  <p className="dash-inner-label sm">Uptime</p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "#e2e8f0",
                    }}
                  >
                    {system.uptime != null
                      ? `${Math.round(system.uptime / 60)} min`
                      : "—"}
                  </p>
                </div>
              </div>
              <div style={{ marginTop: "12px" }}>
                <button
                  onClick={() => navigate("/health")}
                  className="dash-link-btn"
                  style={{ width: "100%" }}
                >
                  View System Health →
                </button>
              </div>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;