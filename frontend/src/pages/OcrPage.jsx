import React, { useState, useRef, useCallback } from "react";

// ─── API helper ────────────────────────────────────────────────────────────────
async function apiOcrUpload(file) {
  const token = localStorage.getItem("tk_token");
  const form = new FormData();
  form.append("image", file);

  const res = await fetch("/api/ocr/extract", {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `OCR request failed (${res.status})`);
  }
  return res.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SEVERITY_META = {
  CRITICAL: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: "🔴" },
  HIGH: { color: "#f97316", bg: "rgba(249,115,22,0.12)", icon: "🟠" },
  MEDIUM: { color: "#eab308", bg: "rgba(234,179,8,0.12)", icon: "🟡" },
  LOW: { color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: "🟢" },
};

const ROLE_TABS = [
  { key: "developer", label: "👨‍💻 Developer" },
  { key: "qa", label: "🧪 QA" },
  { key: "devops", label: "🛠 DevOps" },
  { key: "security", label: "🔒 Security" },
  { key: "manager", label: "📊 Manager" },
];

// Seniority-based role tabs using the roleExplanations field
const SENIORITY_ROLE_TABS = [
  { key: "beginner", label: "🌱 Beginner" },
  { key: "junior", label: "👶 Junior Dev" },
  { key: "midLevel", label: "🧑‍💻 Mid-Level" },
  { key: "senior", label: "🎯 Senior Dev" },
  { key: "techLead", label: "🏗 Tech Lead" },
];

const PERSONA_MAP = {
  developer: "developer",
  qa: "qa",
  devops: "ops",
  security: "security",
  manager: "beginner",
};

function Badge({ text, color, bg }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
      color, background: bg, border: `1px solid ${color}40`,
    }}>
      {text}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: "22px 26px", ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
      color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
      marginBottom: 8, marginTop: 0
    }}>
      {children}
    </p>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function OcrPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("developer");
  const [activeSeniorityTab, setActiveSeniorityTab] = useState("beginner");
  const inputRef = useRef();

  const processFile = useCallback((f) => {
    if (!f || !f.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, WEBP).");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  }, [processFile]);

  const handleUploadAndAnalyze = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiOcrUpload(file);
      setResult(data);
      setActiveTab("developer");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [file]);

  const sevMeta = result ? (SEVERITY_META[result.severity] || SEVERITY_META.MEDIUM) : null;

  const getRoleContent = (roleKey) => {
    // 1. Try HF AI roles first (strings)
    if (result?.ai?.available && result.ai.roles?.[roleKey]) {
      return result.ai.roles[roleKey];
    }
    // 2. Try personas from analyzerService (also strings in HF mode)
    if (result?.personas?.[roleKey] && typeof result.personas[roleKey] === "string") {
      return result.personas[roleKey];
    }
    // 3. Fallback to explainService persona object — read the correct fields
    const personaKey = PERSONA_MAP[roleKey] || roleKey;
    const p = result?.personas?.[personaKey];
    if (p && typeof p === "object") {
      // explainService returns { rootCause, fix, prevention, debugSteps }
      return [
        p.rootCause && `Cause: ${p.rootCause}`,
        p.fix && `Fix: ${p.fix}`,
        p.prevention && `Prevention: ${p.prevention}`,
      ].filter(Boolean).join(" | ") || null;
    }
    return null;
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)",
      padding: "40px 32px",
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: "#e8eaf0",
    }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>📷</div>
          <div>
            <h1 style={{
              margin: 0, fontSize: 26, fontWeight: 700,
              background: "linear-gradient(90deg, #e8eaf0, #67e8f9)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>
              OCR Error Analyzer
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              Upload a screenshot of any error — TraceKey will extract and diagnose it
            </p>
          </div>
        </div>
      </div>

      {/* Upload area */}
      <Card style={{ marginBottom: 24 }}>
        <div
          id="ocr-drop-zone"
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "#06b6d4" : "rgba(255,255,255,0.12)"}`,
            borderRadius: 12,
            padding: "40px 24px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            background: dragging ? "rgba(6,182,212,0.06)" : "transparent",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            id="ocr-file-input"
            accept="image/*"
            style={{ display: "none" }}
            onChange={e => processFile(e.target.files[0])}
          />
          {preview ? (
            <div>
              <img
                src={preview}
                alt="Preview"
                style={{
                  maxWidth: "100%", maxHeight: 200, borderRadius: 8,
                  objectFit: "contain", marginBottom: 12
                }}
              />
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#06b6d4" }}>
                Click to change image
              </p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🖼</div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                Drop a screenshot here
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                or click to browse · PNG, JPG, WEBP
              </p>
            </>
          )}
        </div>

        {file && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button
              id="ocr-analyze-btn"
              onClick={handleUploadAndAnalyze}
              disabled={loading}
              style={{
                padding: "10px 28px", borderRadius: 10, border: "none",
                background: loading
                  ? "rgba(6,182,212,0.3)"
                  : "linear-gradient(135deg, #06b6d4, #3b82f6)",
                color: "#fff", fontWeight: 700, fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                  Extracting & Analyzing…
                </>
              ) : "Extract & Analyze"}
            </button>
          </div>
        )}
      </Card>

      {/* Error state */}
      {error && (
        <Card style={{
          marginBottom: 24, borderColor: "rgba(239,68,68,0.3)",
          background: "rgba(239,68,68,0.07)"
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: "#ef4444" }}>Analysis Failed</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* OCR confidence + Extracted text */}
          <Card>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 12
            }}>
              <SectionLabel>Extracted Text</SectionLabel>
              <Badge
                text={`OCR Confidence: ${result.ocrConfidence ?? "?"}%`}
                color={result.ocrConfidence >= 80 ? "#22c55e" : "#eab308"}
                bg={result.ocrConfidence >= 80 ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)"}
              />
            </div>
            <pre style={{
              margin: 0, padding: "12px 14px",
              background: "rgba(0,0,0,0.3)", borderRadius: 8,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
              color: "rgba(255,255,255,0.7)", whiteSpace: "pre-wrap",
              wordBreak: "break-word", maxHeight: 180, overflowY: "auto",
            }}>
              {result.extractedText}
            </pre>
          </Card>

          {/* Summary badges */}
          <Card>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Badge
                  text={result.category?.replace(/_/g, " ") || "UNKNOWN"}
                  color="#a5b4fc"
                  bg="rgba(165,180,252,0.1)"
                />
                {result.fingerprint?.code && result.fingerprint.code !== "UNKNOWN_PATTERN" && (
                  <Badge
                    text={`🔏 ${result.fingerprint.code}`}
                    color="#34d399"
                    bg="rgba(52,211,153,0.1)"
                  />
                )}
                <Badge
                  text={`${sevMeta.icon} ${result.severity} Severity`}
                  color={sevMeta.color}
                  bg={sevMeta.bg}
                />
                <Badge
                  text={`${Math.round((result.confidence || 0) * 100)}% Confidence`}
                  color="#94a3b8"
                  bg="rgba(148,163,184,0.1)"
                />
                {result.ai?.available && (
                  <Badge text="✨ AI Enhanced" color="#f59e0b" bg="rgba(245,158,11,0.1)" />
                )}
              </div>
            </div>

            {/* Security threats */}
            {result.security?.hasThreats && (
              <div style={{
                marginTop: 14, padding: "10px 14px", borderRadius: 8,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)"
              }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
                  🚨 Security Threats Detected
                </p>
                {result.security.threats?.map((t, i) => (
                  <p key={i} style={{
                    margin: "4px 0 0", fontSize: 12,
                    color: "rgba(255,255,255,0.6)"
                  }}>• {t.message || t}</p>
                ))}
              </div>
            )}
          </Card>

          {/* Root cause + Fix */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <SectionLabel>Root Cause</SectionLabel>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}>
                {result.ai?.available && result.ai.rootCause
                  ? result.ai.rootCause : result.rootCause || "—"}
              </p>
            </Card>
            <Card>
              <SectionLabel>Immediate Fix</SectionLabel>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}>
                {result.ai?.available && result.ai.fix
                  ? result.ai.fix : result.fix || "—"}
              </p>
            </Card>
          </div>

          {/* AI Explanation */}
          {result.ai?.available && result.ai.explanation && (
            <Card style={{
              borderColor: "rgba(245,158,11,0.2)",
              background: "rgba(245,158,11,0.04)"
            }}>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 22 }}>✨</span>
                <div>
                  <SectionLabel>AI Plain-English Explanation</SectionLabel>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.8)" }}>
                    {result.ai.explanation}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Role-based tabs */}
          <Card>
            <SectionLabel>Role-Based Analysis</SectionLabel>
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {ROLE_TABS.map(tab => (
                <button
                  key={tab.key}
                  id={`ocr-role-tab-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "7px 16px", borderRadius: 8,
                    border: activeTab === tab.key
                      ? "1px solid rgba(6,182,212,0.5)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: activeTab === tab.key ? "rgba(6,182,212,0.15)" : "transparent",
                    color: activeTab === tab.key ? "#67e8f9" : "rgba(255,255,255,0.5)",
                    fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ minHeight: 80 }}>
              {ROLE_TABS.map(tab => (
                activeTab === tab.key && (
                  <div key={tab.key}
                    style={{
                      fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.75)",
                      animation: "fadeIn 0.2s ease"
                    }}>
                    {getRoleContent(tab.key) || (
                      <span style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
                        No analysis available for this role.
                      </span>
                    )}
                  </div>
                )
              ))}
            </div>
          </Card>

          {/* Seniority-Based Role Explanations */}
          {result.roleExplanations && (
            <Card>
              <SectionLabel>Seniority-Based Explanation</SectionLabel>
              <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                {SENIORITY_ROLE_TABS.map(tab => (
                  <button
                    key={tab.key}
                    id={`ocr-seniority-tab-${tab.key}`}
                    onClick={() => setActiveSeniorityTab(tab.key)}
                    style={{
                      padding: "7px 16px", borderRadius: 8,
                      border: activeSeniorityTab === tab.key
                        ? "1px solid rgba(167,139,250,0.5)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: activeSeniorityTab === tab.key ? "rgba(167,139,250,0.15)" : "transparent",
                      color: activeSeniorityTab === tab.key ? "#c4b5fd" : "rgba(255,255,255,0.5)",
                      fontSize: 13, fontWeight: activeSeniorityTab === tab.key ? 600 : 400,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div style={{ minHeight: 80 }}>
                {SENIORITY_ROLE_TABS.map(tab => (
                  activeSeniorityTab === tab.key && (
                    <div key={tab.key}
                      style={{
                        fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.75)",
                        animation: "fadeIn 0.2s ease"
                      }}>
                      {result.roleExplanations[tab.key] || (
                        <span style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
                          No explanation available for this seniority level.
                        </span>
                      )}
                    </div>
                  )
                ))}
              </div>
            </Card>
          )}

          {/* Prevention + Debug Steps */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <SectionLabel>Prevention Strategy</SectionLabel>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}>
                {result.ai?.available && result.ai.prevention
                  ? result.ai.prevention : result.prevention || "—"}
              </p>
            </Card>
            <Card>
              <SectionLabel>Debug Steps</SectionLabel>
              {(() => {
                const steps = (result.debugSteps?.length > 0 ? result.debugSteps : null) ||
                  (result.analysis?.debugSteps?.length > 0 ? result.analysis.debugSteps : null) ||
                  (result.technicalBreakdown?.length > 0 ? result.technicalBreakdown : null) ||
                  (result.analysis?.technicalBreakdown?.length > 0 ? result.analysis.technicalBreakdown : null) ||
                  (typeof result.debuggingSteps === "string" && result.debuggingSteps ? result.debuggingSteps.split("\n").filter(Boolean) : []);
                return steps.length > 0 ? (
                  <ol style={{ margin: 0, paddingLeft: 18 }}>
                    {steps.map((step, i) => (
                      <li key={i} style={{
                        fontSize: 13, lineHeight: 1.7,
                        color: "rgba(255,255,255,0.7)", marginBottom: 4
                      }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p style={{
                    margin: 0, fontSize: 13, color: "rgba(255,255,255,0.35)",
                    fontStyle: "italic"
                  }}>No debug steps available.</p>
                );
              })()}
            </Card>
          </div>

          {/* Stack trace preview */}
          {result.structuredTrace?.length > 0 && (
            <Card>
              <SectionLabel>Parsed Stack Frames ({result.structuredTrace.length})</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.structuredTrace.slice(0, 8).map((frame, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 12, alignItems: "center",
                    padding: "7px 12px", borderRadius: 7,
                    background: "rgba(255,255,255,0.03)",
                  }}>
                    <span style={{
                      fontSize: 11, color: "rgba(255,255,255,0.25)",
                      minWidth: 20, textAlign: "right"
                    }}>{i + 1}</span>
                    <span style={{
                      fontFamily: "monospace", fontSize: 12, color: "#67e8f9",
                      fontWeight: 600
                    }}>{frame.method}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                      {frame.file}:{frame.line}
                    </span>
                  </div>
                ))}
                {result.structuredTrace.length > 8 && (
                  <p style={{
                    margin: 0, fontSize: 12, color: "rgba(255,255,255,0.3)",
                    textAlign: "center"
                  }}>
                    +{result.structuredTrace.length - 8} more frames
                  </p>
                )}
              </div>
            </Card>
          )}

          {result.reportId && (
            <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0 }}>
              Report saved · ID: {String(result.reportId)}
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        pre::-webkit-scrollbar { width: 5px; }
        pre::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
    </div>
  );
}
