
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { analyzeError, fetchErrorReports, fetchProjectKnowledge } from "../api.js";

function Badge({ children }) {
  return (
    <span style={{ padding: "6px 10px", borderRadius: "999px", background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", color: "#67e8f9", fontSize: "12px" }}>
      {children}
    </span>
  );
}

function ReportSection({ title, children }) {
  return (
    <div style={{ marginTop: "18px", padding: "16px", borderRadius: "12px", background: "rgba(15,23,42,0.55)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <h3 style={{ marginTop: 0, marginBottom: "12px" }}>{title}</h3>
      {children}
    </div>
  );
}

function Reports() {
  const [reports, setReports] = useState([]);
  const [projectKnowledge, setProjectKnowledge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("createdAt-desc");

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const [reportData, knowledgeData] = await Promise.all([fetchErrorReports(), fetchProjectKnowledge()]);
      setReports(Array.isArray(reportData?.reports) ? reportData.reports : Array.isArray(reportData) ? reportData : []);
      setProjectKnowledge(knowledgeData?.knowledge || null);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const severityWeights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

    return [...reports]
      .filter((report) => {
        const searchable = [
          report.title,
          report.category,
          report.rootCause,
          report.fix,
          report.prevention,
          report.technicalExplanation,
          report.humanExplanation,
          report.errorSummary,
          report.suggestedCode,
          report.rawError,
          report.metadata?.filename,
          report.metadata?.projectName,
          report.metadata?.technology,
          report.metadata?.framework,
          report.metadata?.language,
          report.metadata?.runtime,
          report.fingerprint?.code,
        ];
        const matchesQuery = !normalizedQuery || searchable.some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
        const matchesSeverity = severityFilter === "ALL" || (report.severity || "MEDIUM") === severityFilter;
        const matchesSource = sourceFilter === "ALL" || (report.source || "manual") === sourceFilter;
        return matchesQuery && matchesSeverity && matchesSource;
      })
      .sort((left, right) => {
        const leftTime = new Date(left.createdAt || 0).getTime();
        const rightTime = new Date(right.createdAt || 0).getTime();

        if (sortBy === "createdAt-asc") return leftTime - rightTime;
        if (sortBy === "severity-desc") {
          return (severityWeights[right.severity || "MEDIUM"] || 0) - (severityWeights[left.severity || "MEDIUM"] || 0);
        }
        if (sortBy === "confidence-desc") {
          return (right.confidence || 0) - (left.confidence || 0);
        }
        return rightTime - leftTime;
      });
  }, [reports, query, severityFilter, sourceFilter, sortBy]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filteredReports, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tracekey-reports-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReports = () => window.print();

  const copyAnalysis = async (report) => {
    const text = [
      `Title: ${report.title || report.category || "UNKNOWN_ERROR"}`,
      `Severity: ${report.severity || "MEDIUM"}`,
      `Framework: ${report.framework || report.metadata?.framework || "Unknown"}`,
      `Runtime: ${report.runtime || report.metadata?.runtime || "Unknown"}`,
      `Root Cause: ${report.rootCause || "N/A"}`,
      `Immediate Fix: ${report.fix || report.immediateFix || "N/A"}`,
      `Prevention: ${report.prevention || "N/A"}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
  };

  const reanalyze = async (report) => {
    if (!report.rawError) {
      return;
    }

    await analyzeError(report.rawError);
    await loadReports();
  };

  const severityOptions = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const sourceOptions = ["ALL", "manual", "ocr", "sdk", "file", "project", "telemetry"];

  return (
    <div className="page-content">
      <div className="card">
        <h1>Engineering Reports</h1>
        <p style={{ marginTop: "10px", color: "#94A3B8" }}>Search, filter, export, and reanalyze real backend engineering reports.</p>
      </div>

      <div className="grid-4">
        <div className="card"><p style={{ color: "#94A3B8", margin: 0 }}>Connected Project</p><h3 style={{ marginBottom: 0 }}>{projectKnowledge?.projectName || "No project snapshot available"}</h3></div>
        <div className="card"><p style={{ color: "#94A3B8", margin: 0 }}>Framework</p><h3 style={{ marginBottom: 0 }}>{projectKnowledge?.framework || "Unknown"}</h3></div>
        <div className="card"><p style={{ color: "#94A3B8", margin: 0 }}>Languages</p><h3 style={{ marginBottom: 0 }}>{Array.isArray(projectKnowledge?.language) && projectKnowledge.language.length ? projectKnowledge.language.join(", ") : "Unknown"}</h3></div>
        <div className="card"><p style={{ color: "#94A3B8", margin: 0 }}>Reports</p><h3 style={{ marginBottom: 0 }}>{filteredReports.length}</h3></div>
      </div>

      <div className="card" style={{ display: "grid", gap: "12px" }}>
        <div className="grid-4">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, root cause, fix, file, framework" />
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>{severityOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>{sourceOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="createdAt-desc">Newest first</option>
            <option value="createdAt-asc">Oldest first</option>
            <option value="severity-desc">Highest severity</option>
            <option value="confidence-desc">Highest confidence</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={loadReports}>Refresh</button>
          <button className="btn-primary" onClick={exportJson}>Export JSON</button>
          <button className="btn-primary" onClick={printReports}>Print</button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading reports...</p>
        ) : error ? (
          <p style={{ color: "#F87171" }}>{error}</p>
        ) : filteredReports.length === 0 ? (
          <p>No reports matched the current filters.</p>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {filteredReports.map((report) => (
              <div key={report._id} style={{ padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                  <div>
                    <strong>{report.title || report.category || "UNKNOWN_ERROR"}</strong>
                    <p style={{ marginTop: "6px", color: "#94A3B8" }}>
                      {report.metadata?.projectName || report.metadata?.filename || projectKnowledge?.projectName || report.source || "Backend report"}
                    </p>
                  </div>
                  <Badge>{report.severity || "MEDIUM"}</Badge>
                </div>

                <div className="grid-2" style={{ marginTop: "14px" }}>
                  <div>
                    <p><strong>Technology:</strong> {report.technology || report.metadata?.technology || projectKnowledge?.framework || "Unknown"}</p>
                    <p><strong>Framework:</strong> {report.framework || projectKnowledge?.framework || report.metadata?.framework || "Unknown"}</p>
                    <p><strong>Language:</strong> {report.language || (Array.isArray(projectKnowledge?.language) ? projectKnowledge.language.join(", ") : "Unknown")}</p>
                    <p><strong>Runtime:</strong> {report.runtime || projectKnowledge?.runtime || "Unknown"}</p>
                    <p><strong>Confidence:</strong> {Math.round((report.confidence || 0) * 100)}%</p>
                    <p><strong>AI Confidence:</strong> {Math.round((report.aiConfidence || 0) * 100)}%</p>
                  </div>
                  <div>
                    <p><strong>Fingerprint:</strong> {report.fingerprint?.code || report.fingerprint || "UNKNOWN_PATTERN"}</p>
                    <p><strong>Source:</strong> {report.source || "manual"}</p>
                    <p><strong>Created:</strong> {report.createdAt || "Unknown"}</p>
                    <p><strong>Historical Frequency:</strong> {report.historicalFrequency ?? 0}</p>
                    <p><strong>Last Occurrence:</strong> {report.lastOccurrenceAt || "No prior occurrence"}</p>
                  </div>
                </div>

                <ReportSection title="Summary">
                  <p><strong>Executive Summary:</strong> {report.summary || report.errorSummary || report.humanExplanation || "Not available from this analysis."}</p>
                  <p><strong>Root Cause:</strong> {report.rootCause || "Not available from this report."}</p>
                  <p><strong>Failure Chain:</strong> {Array.isArray(report.failureChain) && report.failureChain.length ? report.failureChain.join(" • ") : "Not available from this report."}</p>
                </ReportSection>

                <ReportSection title="Fix Guidance">
                  <p><strong>Immediate Fix:</strong> {report.immediateFix || report.fix || "Not available from this report."}</p>
                  <p><strong>Long-Term Prevention:</strong> {report.prevention || "Not available from this report."}</p>
                  <p><strong>Suggested Code:</strong> {report.suggestedCode || "Not available from this report."}</p>
                  <p><strong>Monitoring Recommendations:</strong> {Array.isArray(report.monitoringRecommendations) && report.monitoringRecommendations.length ? report.monitoringRecommendations.join(" • ") : "Not available from this report."}</p>
                </ReportSection>

                <ReportSection title="Impact and Scope">
                  <p><strong>Business Impact:</strong> {report.businessImpact || "Not available from this report."}</p>
                  <p><strong>Technical Impact:</strong> {report.technicalImpact || report.productionImpact || "Not available from this report."}</p>
                  <p><strong>Performance Impact:</strong> {report.performanceImpact || "Not available from this report."}</p>
                  <p><strong>Security Impact:</strong> {Array.isArray(report.securityImpact) && report.securityImpact.length ? report.securityImpact.join(" • ") : "No security impact detected."}</p>
                </ReportSection>

                <ReportSection title="Affected Surface">
                  <p><strong>Affected Files:</strong></p>
                  <p>{Array.isArray(report.affectedFiles) && report.affectedFiles.length ? report.affectedFiles.join(" • ") : "Not available from this report."}</p>
                  <p style={{ marginTop: "12px" }}><strong>Affected Modules:</strong></p>
                  <p>{Array.isArray(report.affectedModules) && report.affectedModules.length ? report.affectedModules.join(" • ") : "Not available from this report."}</p>
                  <p style={{ marginTop: "12px" }}><strong>Debug Steps:</strong></p>
                  <p>{Array.isArray(report.debugSteps) && report.debugSteps.length ? report.debugSteps.join(" • ") : "Not available from this report."}</p>
                </ReportSection>

                <ReportSection title="Timeline and Context">
                  <p><strong>Timeline:</strong></p>
                  {Array.isArray(report.timeline) && report.timeline.length ? (
                    <div style={{ display: "grid", gap: "10px" }}>
                      {report.timeline.slice(0, 6).map((item, index) => (
                        <div key={`${item.at || index}`} style={{ padding: "10px", borderRadius: "10px", background: "rgba(2,6,23,0.7)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <strong>{item.label || item.category || "Event"}</strong>
                          <p style={{ margin: "6px 0 0", color: "#CBD5E1" }}>{item.category || "UNKNOWN_ERROR"} · {item.severity || "MEDIUM"} · {item.source || "manual"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Not available from this report.</p>
                  )}
                </ReportSection>

                <ReportSection title="Seniority-Based Explanations">
                  {report.roleExplanations ? (
                    <div style={{ display: "grid", gap: "8px" }}>
                      <p><strong>🌱 Beginner:</strong> {report.roleExplanations.beginner}</p>
                      <p><strong>👶 Junior Dev:</strong> {report.roleExplanations.junior}</p>
                      <p><strong>🧑‍💻 Mid-Level:</strong> {report.roleExplanations.midLevel}</p>
                      <p><strong>🎯 Senior Dev:</strong> {report.roleExplanations.senior}</p>
                      <p><strong>🏗 Tech Lead:</strong> {report.roleExplanations.techLead}</p>
                    </div>
                  ) : (
                    <p>Not available from this report.</p>
                  )}
                </ReportSection>

                <ReportSection title="Related Analysis">
                  <p><strong>Similar Errors:</strong></p>
                  <p>{Array.isArray(report.similarErrors) && report.similarErrors.length ? report.similarErrors.slice(0, 3).map((item) => item.rawError || item.category || "Similar issue").join(" • ") : "Not available from this report."}</p>
                  <p style={{ marginTop: "12px" }}><strong>Related Reports:</strong></p>
                  <p>{Array.isArray(report.relatedReports) && report.relatedReports.length ? report.relatedReports.slice(0, 3).map((item) => item.category || item.fingerprint || "Related report").join(" • ") : "Not available from this report."}</p>
                </ReportSection>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
                  <button className="btn-primary" onClick={() => copyAnalysis(report)}>Copy Analysis</button>
                  <button className="btn-primary" onClick={() => reanalyze(report)}>Reanalyze</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
