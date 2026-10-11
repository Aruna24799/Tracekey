import React, { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  analyzeError as analyzeErrorApi,
  analyzeFile,
  analyzeProject,
  fetchErrorReports,
  fetchProjectKnowledge,
} from "../api";

/* ─── Small helpers ─────────────────────────────────── */

function SectionCard({ title, children }) {
  return (
    <div
      style={{
        marginTop: "20px",
        padding: "20px 24px",
        borderRadius: "12px",
        background: "#0d0d0d",
        border: "1px solid #1a1a1a",
      }}
    >
      <h3
        style={{
          margin: "0 0 16px",
          fontSize: "0.78rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#4e70e6",
          fontWeight: 700,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function BadgeList({ items }) {
  if (!items) {
    return (
      <p style={{ color: "#3a3a3a", margin: 0, fontSize: "0.82rem" }}>
        Not available.
      </p>
    );
  }
  const rawArr = Array.isArray(items) ? items : [items];
  const flattened = rawArr.flat(Infinity).filter(Boolean);
  if (flattened.length === 0) {
    return (
      <p style={{ color: "#3a3a3a", margin: 0, fontSize: "0.82rem" }}>
        Not available.
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {flattened.map((item, i) => {
        const text = typeof item === "object" && item !== null
          ? (item.name || item.label || item.code || item.hash || item.title || item.value || item.summary || "")
          : String(item);
        if (!text) return null;
        return (
          <span
            key={`${text}-${i}`}
            style={{
              padding: "4px 10px",
              borderRadius: "999px",
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.2)",
              color: "#60a5fa",
              fontSize: "0.75rem",
            }}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}

function BulletList({ items }) {
  if (!items) {
    return (
      <p style={{ color: "#3a3a3a", margin: 0, fontSize: "0.82rem" }}>
        No recommendations generated.
      </p>
    );
  }
  const rawArr = Array.isArray(items) ? items : [items];
  const flattened = rawArr.flat(Infinity).filter(Boolean);
  if (flattened.length === 0) {
    return (
      <p style={{ color: "#3a3a3a", margin: 0, fontSize: "0.82rem" }}>
        No recommendations generated.
      </p>
    );
  }
  return (
    <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.85rem", color: "#a0aec0", lineHeight: 1.6 }}>
      {flattened.map((item, i) => {
        const text = typeof item === "object" && item !== null
          ? (item.message || item.description || item.text || item.fix || item.recommendation || item.summary || "")
          : String(item);
        if (!text) return null;
        return (
          <li key={i} style={{ marginBottom: "6px" }}>{text}</li>
        );
      })}
    </ul>
  );
}

function ReportList({ reports }) {
  if (!Array.isArray(reports) || reports.length === 0) {
    return (
      <p style={{ color: "#3a3a3a", margin: 0, fontSize: "0.82rem" }}>
        No related reports found.
      </p>
    );
  }
  return (
    <div style={{ display: "grid", gap: "10px" }}>
      {reports.slice(0, 5).map((report, idx) => {
        const cat = typeof report.category === "object" && report.category !== null
          ? (report.category.name || report.category.label || report.category.code || "UNKNOWN_ERROR")
          : (report.category || "UNKNOWN_ERROR");
        const sev = typeof report.severity === "object" && report.severity !== null
          ? (report.severity.level || report.severity.name || "LOW")
          : (report.severity || "LOW");
        let summary = "No summary available.";
        const summaryCandidate = report.rootCause || report.fix || report.executiveSummary || report.errorSummary || report.humanExplanation;
        if (summaryCandidate) {
          summary = typeof summaryCandidate === "object"
            ? (summaryCandidate.summary || summaryCandidate.message || summaryCandidate.description || summaryCandidate.text || "No summary available.")
            : String(summaryCandidate);
        }
        const key = typeof report._id === "object" && report._id !== null
          ? (report._id.$oid || String(report._id) || idx)
          : (report._id || `${cat}-${report.createdAt || idx}`);

        return (
          <div
            key={key}
            style={{
              padding: "12px",
              borderRadius: "10px",
              background: "#080808",
              border: "1px solid #141414",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <strong style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>
                {cat}
              </strong>
              <span
                style={{
                  color:
                    sev === "CRITICAL" || sev === "HIGH"
                      ? "#ef4444"
                      : "#555",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                {sev}
              </span>
            </div>
            <p
              style={{
                margin: "6px 0 0",
                color: "#6c7a89",
                fontSize: "0.8rem",
                lineHeight: 1.5,
              }}
            >
              {summary}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function TimelineList({ timeline }) {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return (
      <p style={{ color: "#3a3a3a", margin: 0, fontSize: "0.82rem" }}>
        No timeline data yet.
      </p>
    );
  }
  return (
    <div style={{ display: "grid", gap: "10px" }}>
      {timeline.slice(0, 8).map((item, i) => {
        const fp = typeof item.fingerprint === "object" && item.fingerprint !== null
          ? (item.fingerprint.code || item.fingerprint.hash || "PATTERN_GENERIC")
          : (item.fingerprint || "UNKNOWN_PATTERN");
        const cat = typeof item.category === "object" && item.category !== null
          ? (item.category.name || item.category.label || item.category.code || "UNKNOWN_ERROR")
          : (item.category || "UNKNOWN_ERROR");
        const sev = typeof item.severity === "object" && item.severity !== null
          ? (item.severity.level || item.severity.name || "MEDIUM")
          : (item.severity || "MEDIUM");
        const src = typeof item.source === "object" && item.source !== null
          ? (item.source.name || item.source.type || "manual")
          : (item.source || "manual");
        const lbl = typeof item.label === "object" && item.label !== null
          ? (item.label.title || item.label.name || cat)
          : (item.label || cat || "Analysis event");

        return (
          <div
            key={`${item.at || "tl"}-${i}`}
            style={{
              padding: "12px",
              borderRadius: "10px",
              background: "#080808",
              border: "1px solid #141414",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <strong style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>
                {lbl}
              </strong>
              <span style={{ color: "#555", fontSize: "0.75rem" }}>
                {item.at ? new Date(item.at).toLocaleString() : "Unknown time"}
              </span>
            </div>
            <p
              style={{
                margin: "6px 0 0",
                color: "#555",
                fontSize: "0.8rem",
                lineHeight: 1.5,
              }}
            >
              {cat} · {sev} · {src} · {fp}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ValueText({ value, fallback }) {
  if (value == null || value === "") {
    return <span style={{ color: "#3a3a3a" }}>{fallback}</span>;
  }
  let displayStr = "";
  if (typeof value === "object" && value !== null) {
    displayStr = value.summary || value.description || value.message || value.text || value.explanation || value.rootCause || value.fix || value.title || value.code || value.hash || "";
  } else {
    displayStr = String(value);
  }
  if (!displayStr) {
    return <span style={{ color: "#3a3a3a" }}>{fallback}</span>;
  }
  return <span style={{ color: "#a0aec0" }}>{displayStr}</span>;
}

function CodeSnippet({ code }) {
  if (!code) return null;
  let snippetStr = "";
  if (typeof code === "object" && code !== null) {
    if (code.code) snippetStr = String(code.code);
    else if (code.snippet) snippetStr = String(code.snippet);
    else if (code.example) snippetStr = String(code.example);
    else if (code.suggestedCode) snippetStr = String(code.suggestedCode);
    else {
      snippetStr = Object.values(code).filter(v => typeof v === "string").join("\n\n");
    }
  } else {
    snippetStr = String(code);
  }
  if (!snippetStr.trim()) return null;
  return (
    <pre
      style={{
        margin: "12px 0 0",
        padding: "14px 16px",
        background: "#050505",
        border: "1px solid #1e1e1e",
        borderRadius: "10px",
        overflowX: "auto",
        fontFamily: "'JetBrains Mono', Consolas, monospace",
        fontSize: "0.8rem",
        color: "#67e8f9",
        lineHeight: 1.5,
      }}
    >
      <code>{snippetStr}</code>
    </pre>
  );
}

/* ─── Progress bar ──────────────────────────────────── */
const STAGE_PCT = { idle: 0, preparing: 20, uploading: 55, analyzing: 80, complete: 100 };

function ProgressBar({ stage }) {
  const pct = STAGE_PCT[stage] || 0;
  if (pct === 0) return null;
  return (
    <div style={{ marginTop: "14px" }}>
      <div
        style={{
          height: "4px",
          borderRadius: "999px",
          background: "#1a1a1a",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "999px",
            background: "linear-gradient(90deg,#3b82f6,#06b6d4)",
            transition: "width 200ms ease",
          }}
        />
      </div>
      <p style={{ margin: "6px 0 0", color: "#555", fontSize: "0.72rem" }}>
        {stage === "complete" ? "Done" : stage.charAt(0).toUpperCase() + stage.slice(1)}
      </p>
    </div>
  );
}

/* ─── Mode tabs ─────────────────────────────────────── */
const MODES = [
  { id: "upload", label: "Upload" },
  { id: "manual", label: "Paste Error" },
];

const ROLE_TABS = [
  { key: "developer", label: "Developer" },
  { key: "qa", label: "QA / Tester" },
  { key: "devops", label: "DevOps" },
  { key: "security", label: "Security" },
  { key: "manager", label: "Manager" },
];

// 5 seniority-based roles required by the AI engine spec
const SENIORITY_ROLE_TABS = [
  { key: "beginner", label: "🌱 Beginner" },
  { key: "junior", label: "👶 Junior Dev" },
  { key: "midLevel", label: "🧑‍💻 Mid-Level" },
  { key: "senior", label: "🎯 Senior Dev" },
  { key: "techLead", label: "🏗 Tech Lead" },
];

/* ─── Main component ────────────────────────────────── */
function ErrorAnalysis() {
  const [mode, setMode] = useState("upload");
  const [errorInput, setErrorInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [projectKnowledge, setProjectKnowledge] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("idle");
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState("developer");
  const [activeSeniorityRoleTab, setActiveSeniorityRoleTab] = useState("beginner");
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchProjectKnowledge(), fetchErrorReports()])
      .then(([kd, rd]) => {
        if (!mounted) return;
        setProjectKnowledge(kd?.knowledge || null);
        setRecentReports(
          Array.isArray(rd?.reports) ? rd.reports.slice(0, 5) : []
        );
      })
      .catch(console.error);
    return () => {
      mounted = false;
    };
  }, []);

  const handleFiles = (files) => {
    const arr = Array.from(files || []);
    setSelectedFiles(arr);
    setMessage(arr.length ? `${arr.length} file(s) selected` : "");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const resetSelection = () => {
    setSelectedFiles([]);
    setAnalysis(null);
    setMessage("");
    setStage("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const buildFolderArchive = async (files) => {
    const zip = new JSZip();
    files.forEach((file) => {
      zip.file(file.webkitRelativePath || file.name, file);
    });
    return zip.generateAsync({ type: "blob" });
  };

  const submitAnalysis = async () => {
    try {
      setLoading(true);
      setAnalysis(null);
      setStage("preparing");
      setMessage("");

      let result = null;

      if (mode === "manual") {
        if (!errorInput.trim()) {
          throw new Error("Paste an error trace before analyzing.");
        }
        setStage("analyzing");
        result = await analyzeErrorApi(errorInput);
      } else {
        /* upload mode — detect what was dropped/selected */
        const file = selectedFiles[0];

        if (selectedFiles.length === 0) {
          throw new Error("Select or drop files before analyzing.");
        }

        if (selectedFiles.length > 1) {
          /* multiple files → package as ZIP and send as project */
          setStage("uploading");
          const firstPath = selectedFiles[0].webkitRelativePath || "";
          const inferredProjectName = firstPath.split("/")[0] || projectKnowledge?.projectName || "project";
          const archiveBlob = await buildFolderArchive(selectedFiles);
          const archiveFile = new File(
            [archiveBlob],
            `${inferredProjectName}.zip`,
            { type: "application/zip" }
          );
          const fd = new FormData();
          fd.append("projectfile", archiveFile);
          fd.append("projectName", inferredProjectName);
          setStage("analyzing");
          result = await analyzeProject(fd);
        } else if (file.name.toLowerCase().endsWith(".zip")) {
          /* single ZIP → project analysis */
          const fd = new FormData();
          fd.append("projectfile", file);
          fd.append("projectName", file.name.replace(/\.zip$/i, ""));
          setStage("uploading");
          setStage("analyzing");
          result = await analyzeProject(fd);
        } else {
          /* single code/text file */
          const content = await file.text();
          setStage("analyzing");
          result = await analyzeFile({ filename: file.name, content });
        }
      }

      // Unify the response shape so both flat and nested responses populate all UI fields
      const unifiedAnalysis = result?.analysis
        ? { ...result, ...result.analysis }
        : result;

      setAnalysis(unifiedAnalysis);
      setStage("complete");
      setMessage(unifiedAnalysis?.message || "Analysis completed successfully.");

      const [kd, rd] = await Promise.all([
        fetchProjectKnowledge(),
        fetchErrorReports(),
      ]);
      setProjectKnowledge(kd?.knowledge || result?.knowledge || unifiedAnalysis?.knowledge || null);
      setRecentReports(Array.isArray(rd?.reports) ? rd.reports.slice(0, 5) : []);
    } catch (err) {
      console.error(err);
      setStage("idle");
      setMessage(err.message || "Analysis failed.");
      setAnalysis({
        category: "ANALYSIS_ERROR",
        severity: "ERROR",
        rootCause: "Failed to analyze the selected input.",
        immediateFix: "Check backend logs and API connectivity.",
        prevention: "Verify backend services are running.",
        confidence: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const projectLabel =
    projectKnowledge?.projectName || "No connected project yet";

  return (
    <div
      style={{
        padding: "32px 36px",
        maxWidth: "1100px",
        margin: "0 auto",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#e2e8f0",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Error Analysis
        </h1>
        <p style={{ color: "#555", marginTop: "6px", fontSize: "0.82rem" }}>
          Analyze files, folders, ZIP archives, or paste an error trace.
          {projectKnowledge && (
            <>
              {" "}
              Connected project:{" "}
              <span style={{ color: "#60a5fa" }}>{projectLabel}</span>
              {projectKnowledge.framework && (
                <> · {typeof projectKnowledge.framework === "object" && projectKnowledge.framework !== null ? (projectKnowledge.framework.name || projectKnowledge.framework.title || "") : String(projectKnowledge.framework)}</>
              )}
            </>
          )}
        </p>
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => {
              setMode(id);
              resetSelection();
            }}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              border: mode === id ? "1px solid #3b82f6" : "1px solid #1a1a1a",
              background: mode === id ? "rgba(59,130,246,0.15)" : "#0d0d0d",
              color: mode === id ? "#60a5fa" : "#555",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div
        style={{
          background: "#0d0d0d",
          border: "1px solid #1a1a1a",
          borderRadius: "14px",
          padding: "24px",
        }}
      >
        {mode === "manual" ? (
          <>
            <p style={{ color: "#555", fontSize: "0.8rem", margin: "0 0 10px" }}>
              Paste a stack trace, runtime error, API failure, deployment log, database error or console output.
            </p>
            <textarea
              value={errorInput}
              onChange={(e) => setErrorInput(e.target.value)}
              placeholder="TypeError: Cannot read properties of undefined (reading 'map')&#10;    at Dashboard.jsx:142&#10;    ..."
              style={{
                width: "100%",
                minHeight: "200px",
                background: "#080808",
                color: "#e2e8f0",
                border: "1px solid #1a1a1a",
                borderRadius: "10px",
                padding: "14px",
                resize: "vertical",
                fontSize: "0.85rem",
                lineHeight: 1.6,
                fontFamily: "monospace",
                outline: "none",
                marginTop: 0,
              }}
            />
          </>
        ) : (
          <>
            {/* Unified drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: dragOver
                  ? "2px dashed #3b82f6"
                  : "2px dashed #1f1f1f",
                borderRadius: "12px",
                padding: "48px 24px",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "rgba(59,130,246,0.05)" : "transparent",
                transition: "all 0.15s ease",
                userSelect: "none",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".js,.jsx,.ts,.tsx,.py,.java,.go,.json,.yaml,.yml,.zip,.txt,.md,.cs,.rb,.php,.html,.css"
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)}
              />

              {/* Hidden folder input */}
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory="true"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)}
              />

              <div style={{ pointerEvents: "none" }}>
                <div
                  style={{
                    fontSize: "2.2rem",
                    marginBottom: "12px",
                    opacity: 0.4,
                  }}
                >
                  ↑
                </div>
                <p
                  style={{
                    color: "#e2e8f0",
                    fontWeight: 600,
                    margin: "0 0 6px",
                    fontSize: "0.95rem",
                  }}
                >
                  Drag &amp; Drop Files, Folder, or ZIP
                </p>
                <p style={{ color: "#333", fontSize: "0.78rem", margin: 0 }}>
                  Supports single file · multiple files · ZIP archives
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div
                  style={{
                    marginTop: "16px",
                    color: "#60a5fa",
                    fontSize: "0.82rem",
                    pointerEvents: "none",
                  }}
                >
                  {selectedFiles.length === 1
                    ? selectedFiles[0].name
                    : `${selectedFiles.length} files selected`}
                </div>
              )}
            </div>

            {/* Folder browse button */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "12px",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                style={{
                  padding: "7px 16px",
                  borderRadius: "8px",
                  border: "1px solid #1a1a1a",
                  background: "#0a0a0a",
                  color: "#555",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Browse Files
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
                style={{
                  padding: "7px 16px",
                  borderRadius: "8px",
                  border: "1px solid #1a1a1a",
                  background: "#0a0a0a",
                  color: "#555",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Browse Folder
              </button>
              {selectedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetSelection();
                  }}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "8px",
                    border: "1px solid #1a1a1a",
                    background: "#0a0a0a",
                    color: "#ef4444",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </>
        )}

        <ProgressBar stage={stage} />

        <button
          onClick={submitAnalysis}
          disabled={loading}
          style={{
            marginTop: "18px",
            width: "100%",
            padding: "13px",
            borderRadius: "10px",
            border: "none",
            background: loading ? "#1a1a1a" : "#3b82f6",
            color: loading ? "#333" : "#fff",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s ease",
          }}
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>

        {message && (
          <p
            style={{
              marginTop: "10px",
              fontSize: "0.8rem",
              color: stage === "complete" ? "#22c55e" : "#555",
              textAlign: "center",
            }}
          >
            {message}
          </p>
        )}
      </div>

      {/* Analysis results */}
      {analysis && (
        <div
          style={{
            marginTop: "24px",
            background: "#0d0d0d",
            border: "1px solid #1a1a1a",
            borderRadius: "14px",
            padding: "24px",
            display: "grid",
            gap: "4px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div>
              <h2
                style={{
                  margin: "0 0 4px",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#e2e8f0",
                }}
              >
                Analysis Diagnostic Result
              </h2>
              <p style={{ color: "#444", fontSize: "0.78rem", margin: "0" }}>
                Report saved · ID: {typeof analysis.reportId === "object" && analysis.reportId !== null ? (analysis.reportId.$oid || String(analysis.reportId)) : (analysis.reportId || "—")}
              </p>
            </div>
            {analysis.ai?.available && (
              <span style={{ fontSize: "0.75rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b", padding: "4px 10px", borderRadius: "999px", fontWeight: 700 }}>
                ✨ AI ENRICHED ({typeof analysis.ai?.provider === "object" && analysis.ai?.provider !== null ? (analysis.ai.provider.name || "AI Engine") : (analysis.ai?.provider || "AI Engine")})
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            <div style={{ padding: "14px", borderRadius: "10px", background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p style={{ margin: 0, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#555" }}>Severity</p>
              <h4 style={{ margin: "4px 0 0", color: analysis.severity === "CRITICAL" || analysis.severity === "HIGH" ? "#ef4444" : "#22c55e", fontSize: "1rem", fontWeight: 700 }}>{typeof analysis.severity === "object" && analysis.severity !== null ? (analysis.severity.level || analysis.severity.name || "MEDIUM") : (analysis.severity || "MEDIUM")}</h4>
            </div>
            <div style={{ padding: "14px", borderRadius: "10px", background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p style={{ margin: 0, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#555" }}>Resolution Priority</p>
              <h4 style={{ margin: "4px 0 0", color: "#60a5fa", fontSize: "1rem", fontWeight: 700 }}>{typeof analysis.resolutionPriority === "object" && analysis.resolutionPriority !== null ? (analysis.resolutionPriority.level || analysis.resolutionPriority.name || "P3") : (analysis.resolutionPriority || "P3")}</h4>
            </div>
            <div style={{ padding: "14px", borderRadius: "10px", background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p style={{ margin: 0, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#555" }}>Confidence</p>
              <h4 style={{ margin: "4px 0 0", color: "#facc15", fontSize: "1rem", fontWeight: 700 }}>{Math.round((typeof analysis.confidence === "number" ? analysis.confidence : Number(analysis.confidence) || 0) * 100)}%</h4>
            </div>
            <div style={{ padding: "14px", borderRadius: "10px", background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p style={{ margin: 0, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#555" }}>Occurrences</p>
              <h4 style={{ margin: "4px 0 0", color: "#e2e8f0", fontSize: "1rem", fontWeight: 700 }}>{typeof analysis.historicalFrequency === "number" ? analysis.historicalFrequency : (Number(analysis.historicalFrequency) || 1)}</h4>
            </div>
          </div>

          <SectionCard title="Executive & Plain-English Summaries">
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#e2e8f0", lineHeight: 1.6, fontWeight: 500 }}>
              <strong>Executive Summary:</strong> <ValueText value={analysis.executiveSummary || analysis.errorSummary} fallback="Unavailable" />
            </p>
            <p style={{ margin: "12px 0 0", fontSize: "0.88rem", color: "#a0aec0", lineHeight: 1.6 }}>
              <strong>Human-Friendly Explanation:</strong> <ValueText value={analysis.humanExplanation} fallback="Unavailable" />
            </p>
          </SectionCard>

          <SectionCard title="Technical & Root Cause Analysis">
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#a0aec0", lineHeight: 1.6 }}>
              <strong>Technical Explanation:</strong> <ValueText value={analysis.technicalExplanation} fallback="Unavailable" />
            </p>
            <p style={{ margin: "12px 0 0", fontSize: "0.85rem", color: "#a0aec0", lineHeight: 1.6 }}>
              <strong>Root Cause:</strong> <ValueText value={analysis.rootCause} fallback="Unavailable" />
            </p>
          </SectionCard>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <SectionCard title="Immediate Fix">
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.6 }}>
                <ValueText value={analysis.immediateFix} fallback="Review logs and code block." />
              </p>
              <CodeSnippet code={analysis.codeExamples || analysis.suggestedCode} />
            </SectionCard>
            <SectionCard title="Permanent Fix & Prevention">
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.6 }}>
                <strong>Permanent Fix:</strong> <ValueText value={analysis.permanentFix} fallback="Review system logic." />
              </p>
              <p style={{ margin: "12px 0 0", fontSize: "0.85rem", color: "#a0aec0", lineHeight: 1.6 }}>
                <strong>Prevention Strategy:</strong> <ValueText value={analysis.prevention} fallback="Add guard conditions." />
              </p>
            </SectionCard>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <SectionCard title="Risk Assessment">
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#a0aec0", lineHeight: 1.6 }}>
                <ValueText value={analysis.riskAssessment} fallback="Moderate operational impact." />
              </p>
            </SectionCard>
            <SectionCard title="Production Impact">
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#a0aec0", lineHeight: 1.6 }}>
                <ValueText value={analysis.productionImpact} fallback="No direct downtime." />
              </p>
            </SectionCard>
            <SectionCard title="Business Impact">
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#a0aec0", lineHeight: 1.6 }}>
                <ValueText value={analysis.businessImpact} fallback="Localized functional degradation." />
              </p>
            </SectionCard>
          </div>

          {analysis.personas && (
            <SectionCard title="Role-Based Views">
              <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
                {ROLE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveRoleTab(tab.key)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      border: activeRoleTab === tab.key ? "1px solid #3b82f6" : "1px solid #1a1a1a",
                      background: activeRoleTab === tab.key ? "rgba(59,130,246,0.15)" : "#080808",
                      color: activeRoleTab === tab.key ? "#60a5fa" : "#555",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: "8px",
                  background: "#080808",
                  border: "1px solid #141414",
                  minHeight: "80px",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.88rem", color: "#d2d8e0", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                  {(() => {
                    const val = analysis.personas[activeRoleTab];
                    if (!val) return "Role analysis details are not loaded for this persona.";
                    if (typeof val === "object" && val !== null) {
                      const lines = [
                        val.rootCause && `Root Cause: ${val.rootCause}`,
                        val.fix && `Fix: ${val.fix}`,
                        val.prevention && `Prevention: ${val.prevention}`,
                        val.debugSteps && Array.isArray(val.debugSteps) && `Debug Steps:\n${val.debugSteps.map(s => `• ${s}`).join("\n")}`,
                        val.summary && `Summary: ${val.summary}`,
                        val.description && `Description: ${val.description}`,
                        val.message && `Message: ${val.message}`,
                        val.explanation && `Explanation: ${val.explanation}`,
                      ].filter(Boolean);
                      if (lines.length > 0) return lines.join("\n\n");
                      return val.text || val.content || "Role analysis details are not loaded for this persona.";
                    }
                    return String(val);
                  })()}
                </p>
              </div>
            </SectionCard>
          )}

          {/* Seniority-Based Role Explanations */}
          {analysis.roleExplanations && (
            <SectionCard title="Seniority-Based Analysis">
              <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
                {SENIORITY_ROLE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveSeniorityRoleTab(tab.key)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      border: activeSeniorityRoleTab === tab.key ? "1px solid #7c3aed" : "1px solid #1a1a1a",
                      background: activeSeniorityRoleTab === tab.key ? "rgba(124,58,237,0.15)" : "#080808",
                      color: activeSeniorityRoleTab === tab.key ? "#c4b5fd" : "#555",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: "8px",
                  background: "#080808",
                  border: "1px solid #141414",
                  minHeight: "80px",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.88rem", color: "#d2d8e0", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                  {(() => {
                    const val = analysis.roleExplanations[activeSeniorityRoleTab];
                    if (!val) return "Seniority-based explanation not available.";
                    if (typeof val === "object" && val !== null) {
                      return val.explanation || val.summary || val.fix || val.description || val.message || val.text || "Seniority-based explanation not available.";
                    }
                    return String(val);
                  })()}
                </p>
              </div>
            </SectionCard>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <SectionCard title="Code Quality & Best Practices">
              <BulletList items={analysis.bestPractices} />
              {analysis.codeImprovementSuggestions && (
                <p style={{ marginTop: "12px", fontSize: "0.82rem", color: "#a0aec0", borderTop: "1px solid #1e1e1e", paddingTop: "12px" }}>
                  <strong>Refactoring Suggestion:</strong> <ValueText value={analysis.codeImprovementSuggestions} fallback="Follow component modularity guidelines." />
                </p>
              )}
            </SectionCard>
            <SectionCard title="Security & Performance Insights">
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#a0aec0" }}>
                <strong>Security:</strong> <ValueText value={analysis.securityRecommendations} fallback="Apply global validation sanitization." />
              </p>
              <p style={{ marginTop: "12px", fontSize: "0.82rem", color: "#a0aec0", borderTop: "1px solid #1e1e1e", paddingTop: "12px" }}>
                <strong>Performance:</strong> <ValueText value={analysis.performanceRecommendations} fallback="Verify socket leakages are resolved." />
              </p>
            </SectionCard>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <SectionCard title="Affected Surface & Tech Stack">
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Related Technologies</p>
              <div style={{ marginTop: "6px", marginBottom: "14px" }}>
                <BadgeList items={analysis.relatedTechnologies || [analysis.technology, analysis.framework, analysis.language]} />
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Affected Files</p>
              <div style={{ marginTop: "6px" }}>
                <BadgeList items={analysis.affectedFiles} />
              </div>
            </SectionCard>
            <SectionCard title="Debugging Steps">
              <BulletList items={analysis.technicalBreakdown || analysis.debugSteps} />
            </SectionCard>
          </div>

          {analysis.timeline && analysis.timeline.length > 0 && (
            <SectionCard title="Incident Timeline">
              <TimelineList timeline={analysis.timeline} />
            </SectionCard>
          )}

          <SectionCard title="Similar & Related Incident Reports">
            <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#555", textTransform: "uppercase" }}>
              <strong>Similar Incidents</strong>
            </p>
            <ReportList reports={analysis.similarErrors} />
            <p style={{ margin: "20px 0 10px", fontSize: "0.82rem", color: "#555", textTransform: "uppercase" }}>
              <strong>Related Incident Snapshots</strong>
            </p>
            <ReportList reports={analysis.relatedReports} />
          </SectionCard>

          {recentReports.length > 0 && (
            <SectionCard title="Recent History Log">
              <ReportList reports={recentReports} />
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}

export default ErrorAnalysis;
