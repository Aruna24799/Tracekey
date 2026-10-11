
import React, { useEffect, useState } from "react";
import { fetchPredictions, fetchProjectKnowledge } from "../api.js";

// ─── Small inline components ──────────────────────────────────────────────────

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ minWidth: "160px", fontSize: "0.78rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: "2px" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.6 }}>{value}</span>
    </div>
  );
}

function TagList({ label, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <p style={{ fontSize: "0.72rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
        {label}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {items.slice(0, 20).map((item, i) => (
          <span
            key={i}
            style={{
              fontSize: "0.75rem",
              padding: "3px 10px",
              borderRadius: "999px",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.2)",
              color: "#60a5fa",
            }}
          >
            {item}
          </span>
        ))}
        {items.length > 20 && (
          <span style={{ fontSize: "0.75rem", color: "#555", padding: "3px 0" }}>
            +{items.length - 20} more
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Insights Page ─────────────────────────────────────────────────────────────

function Insights() {
  const [knowledge, setKnowledge] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [riskScore, setRiskScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        // Fetch both project knowledge and predictive analysis using existing APIs
        const [knowledgeResult, predictiveResult] = await Promise.all([
          fetchProjectKnowledge().catch(() => null),
          fetchPredictions().catch(() => null),
        ]);

        if (!mounted) return;

        // Project knowledge from /api/knowledge/current (existing endpoint)
        setKnowledge(knowledgeResult?.knowledge || null);

        // Predictive analysis from /api/predictive/analysis (existing endpoint)
        const analysis = predictiveResult?.analysis || predictiveResult;
        if (analysis) {
          setRiskScore(analysis.runtimeRiskScore ?? null);

          const warnings = Array.isArray(analysis.escalationWarnings)
            ? analysis.escalationWarnings.map((w) => ({
                title: w.level || "Runtime Warning",
                message: w.message || "No details",
                riskScore: analysis.runtimeRiskScore ?? 0,
              }))
            : [];

          const recommendations = Array.isArray(analysis.preventionRecommendations)
            ? analysis.preventionRecommendations.map((item) => ({
                title: item.title || "Prevention Recommendation",
                message: item.description || item.afterCode || item.beforeCode || "No details",
                riskScore: analysis.runtimeRiskScore ?? 0,
              }))
            : [];

          setPredictions([...warnings, ...recommendations]);
        }

        setError(null);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || "Insights load failed");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="page-content">
        <div className="card"><p>Loading insights…</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="card"><p style={{ color: "#f87171" }}>{error}</p></div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div className="card">
        <h1>Project Insights</h1>
        <p style={{ marginTop: "10px", color: "#94A3B8" }}>
          Architecture analysis, dependency graph, AI recommendations, and predictive runtime analytics.
        </p>
      </div>

      {/* ── Project Knowledge (from analyzeProject → projectKnowledgeService) ── */}
      {knowledge ? (
        <>
          {/* Project Overview */}
          <div className="card">
            <h2>Project Overview</h2>
            <div style={{ marginTop: "8px" }}>
              <InfoRow label="Project Name" value={knowledge.projectName} />
              <InfoRow label="Framework" value={knowledge.framework} />
              <InfoRow label="Runtime" value={knowledge.runtime} />
              <InfoRow label="Package Manager" value={knowledge.packageManager} />
              <InfoRow label="Complexity" value={knowledge.projectComplexity !== "Unknown" ? knowledge.projectComplexity : null} />
              <InfoRow label="Technical Debt" value={knowledge.technicalDebt !== "Unknown" ? knowledge.technicalDebt : null} />
              <InfoRow label="Cloud Provider" value={knowledge.cloudProvider !== "Unknown" ? knowledge.cloudProvider : null} />
              <InfoRow label="Docker" value={knowledge.docker ? "Yes — Dockerfile detected" : null} />
              {knowledge.summary && (
                <div style={{ padding: "12px 0" }}>
                  <p style={{ fontSize: "0.72rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                    AI Summary
                  </p>
                  <p style={{ fontSize: "0.88rem", color: "#e2e8f0", lineHeight: 1.7 }}>
                    {knowledge.summary}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Dependency & Structure */}
          <div className="grid-2">
            <div className="card">
              <h2>Detected Structure</h2>
              <div style={{ marginTop: "8px" }}>
                <TagList label="Languages" items={knowledge.language} />
                <TagList label="Dependencies" items={knowledge.dependencies} />
                <TagList label="CI / CD" items={knowledge.cicd} />
                <TagList label="Build Tools" items={knowledge.buildTools} />
                <TagList label="Technology Stack" items={knowledge.technologyStack} />
                {knowledge.language?.length === 0 &&
                 knowledge.dependencies?.length === 0 &&
                 knowledge.cicd?.length === 0 && (
                  <p style={{ color: "#555", fontSize: "0.85rem", marginTop: "8px" }}>
                    No structural data detected. Upload and analyze a project ZIP to populate this section.
                  </p>
                )}
              </div>
            </div>

            <div className="card">
              <h2>API & Architecture</h2>
              <div style={{ marginTop: "8px" }}>
                <TagList label="Routes / API Endpoints" items={knowledge.routes?.length ? knowledge.routes : knowledge.apiEndpoints} />
                <TagList label="Controllers" items={knowledge.controllers} />
                <TagList label="Services" items={knowledge.services} />
                <TagList label="Models" items={knowledge.models} />
                <TagList label="Components" items={knowledge.components} />
                <TagList label="Database" items={knowledge.database} />
                <TagList label="Authentication" items={knowledge.authentication} />
                {knowledge.architecture && (
                  <InfoRow label="Architecture" value={knowledge.architecture} />
                )}
                {!knowledge.routes?.length &&
                 !knowledge.controllers?.length &&
                 !knowledge.services?.length && (
                  <p style={{ color: "#555", fontSize: "0.85rem", marginTop: "8px" }}>
                    No API layer detected. Upload and analyze a project ZIP to populate this section.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Configuration files */}
          {(knowledge.configuration?.length > 0 || knowledge.environment?.length > 0) && (
            <div className="card">
              <h2>Configuration</h2>
              <div style={{ marginTop: "8px" }}>
                <TagList label="Config Files" items={knowledge.configuration} />
                <TagList label="Environment Files" items={knowledge.environment} />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <h2>Project Knowledge</h2>
          <p style={{ color: "#555", marginTop: "8px", fontSize: "0.88rem" }}>
            No project has been analyzed yet. Upload a project ZIP from the Dashboard to populate Insights with real architecture data.
          </p>
        </div>
      )}

      {/* ── Predictive Analysis (from /api/predictive/analysis — existing endpoint) ── */}
      <div className="card">
        <h2>Predictive Runtime Analysis</h2>
        <p style={{ color: "#94A3B8", marginTop: "4px", marginBottom: "18px", fontSize: "0.85rem" }}>
          AI-driven failure forecasting and prevention recommendations.
        </p>

        {riskScore !== null && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "18px",
              padding: "10px 16px",
              borderRadius: "10px",
              background: riskScore > 75 ? "rgba(239,68,68,0.08)" : riskScore > 45 ? "rgba(249,115,22,0.08)" : "rgba(34,197,94,0.08)",
              border: `1px solid ${riskScore > 75 ? "rgba(239,68,68,0.25)" : riskScore > 45 ? "rgba(249,115,22,0.25)" : "rgba(34,197,94,0.2)"}`,
            }}
          >
            <span style={{ fontSize: "0.78rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Runtime Risk Score
            </span>
            <strong style={{ fontSize: "1.2rem", color: riskScore > 75 ? "#ef4444" : riskScore > 45 ? "#f97316" : "#22c55e" }}>
              {riskScore}%
            </strong>
          </div>
        )}

        {predictions.length === 0 ? (
          <p style={{ color: "#555", fontSize: "0.85rem" }}>
            No predictive alerts or runtime anomalies detected. Analyze a project or submit error reports to generate predictions.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {predictions.map((prediction, index) => (
              <div
                key={index}
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <strong style={{ fontSize: "0.9rem", color: "#e2e8f0" }}>
                  {prediction.title || "Runtime Prediction"}
                </strong>
                <p style={{ marginTop: "10px", color: "#94a3b8", fontSize: "0.86rem", lineHeight: 1.65 }}>
                  {prediction.message || "No details"}
                </p>
                {prediction.riskScore != null && prediction.riskScore > 0 && (
                  <p style={{ marginTop: "8px", fontSize: "0.78rem", color: "#555" }}>
                    Risk Score: {prediction.riskScore}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Insights;
