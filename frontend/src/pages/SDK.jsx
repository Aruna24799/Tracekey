
import React, { useEffect, useState, useCallback } from "react";
import { fetchProjectKnowledge, fetchTelemetry } from "../api.js";

function SDK() {
  const [knowledge, setKnowledge] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSDK = useCallback(async () => {
    try {
      setLoading(true);
      const [knowledgeData, telemetryData] = await Promise.all([
        fetchProjectKnowledge(),
        fetchTelemetry(),
      ]);
      setKnowledge(knowledgeData?.knowledge || null);
      setTelemetry(Array.isArray(telemetryData?.events) ? telemetryData.events : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSDK();
  }, [loadSDK]);

  const projectConnected = knowledge !== null;
  const sdkDetails = knowledge?.sdkDetails || {};

  // SDK was explicitly detected in the project source files
  const sdkIntegrated = Boolean(knowledge?.sdkSummary || sdkDetails.sdkDetected);
  const sdkInitFile = sdkDetails.sdkInitFile || "Not Detected";
  const sdkVersion = sdkDetails.sdkVersion || (sdkIntegrated ? "1.0.0" : "Not Installed");
  const sdkFiles = Array.isArray(sdkDetails.sdkFiles) && sdkDetails.sdkFiles.length > 0 ? sdkDetails.sdkFiles : (sdkIntegrated ? [sdkInitFile] : []);
  const sdkInitMethod = sdkDetails.sdkInitMethod || (sdkIntegrated ? "initTraceKey()" : "Not Initialized");
  const telemetryStatus = telemetry.length > 0 ? "Active (Receiving Events)" : (sdkIntegrated ? "Standby (Integrated)" : "Pending Setup");

  return (
    <div className="page-content">
      <div className="card">
        <h1>TraceKey SDK</h1>
        <p style={{ marginTop: "10px", color: "var(--text-secondary)" }}>
          Project intelligence, SDK integration status, and live runtime telemetry.
        </p>
      </div>

      {loading ? (
        <div className="card"><p>Loading SDK status…</p></div>
      ) : !projectConnected ? (
        /* ── No project analyzed yet: show installation guide ── */
        <>
          <div className="card">
            <h2>No Project Connected</h2>
            <p style={{ marginTop: "8px", color: "var(--text-secondary)" }}>
              Upload and analyze a project ZIP from the Dashboard to activate project intelligence.
              Once analyzed, this page will display real project metadata, SDK integration status,
              and runtime telemetry.
            </p>
          </div>

          <div className="card">
            <h2>Installation Guide</h2>
            <pre style={{ marginTop: "16px", background: "var(--bg-secondary)", color: "var(--text-primary)", padding: "16px", borderRadius: "12px", overflow: "auto" }}>
              {`npm install @tracekey/sdk`}
            </pre>
            <p style={{ color: "var(--text-secondary)", marginTop: "12px" }}>
              Generate an API key from Settings, then initialize the SDK with your project name and key.
            </p>
          </div>

          <div className="card">
            <h2>Initialization</h2>
            <pre style={{ marginTop: "16px", background: "var(--bg-secondary)", color: "var(--text-primary)", padding: "16px", borderRadius: "12px", overflow: "auto" }}>
              {`import { initTraceKey } from "@tracekey/sdk";

initTraceKey({
  apiKey: "YOUR_API_KEY",
  project: "your-project",
});`}
            </pre>
          </div>
        </>
      ) : (
        /* ── Project analyzed: show real project intelligence ── */
        <>
          {/* ── Stat row ── */}
          <div className="grid-4">
            <div className="card">
              <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.75rem", textTransform: "uppercase" }}>Project</p>
              <h3 style={{ marginBottom: 0, color: "var(--text-primary)" }}>{knowledge.projectName || "Unknown"}</h3>
            </div>
            <div className="card">
              <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.75rem", textTransform: "uppercase" }}>Framework</p>
              <h3 style={{ marginBottom: 0, color: "var(--text-primary)" }}>{knowledge.framework || "Unknown"}</h3>
            </div>
            <div className="card">
              <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.75rem", textTransform: "uppercase" }}>Languages</p>
              <h3 style={{ marginBottom: 0, color: "var(--text-primary)" }}>
                {Array.isArray(knowledge.language) && knowledge.language.length
                  ? knowledge.language.join(", ")
                  : "Unknown"}
              </h3>
            </div>
            <div className="card">
              <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.75rem", textTransform: "uppercase" }}>SDK Status</p>
              <h3
                style={{
                  marginBottom: 0,
                  color: sdkIntegrated ? "var(--green)" : "var(--orange)",
                }}
              >
                {sdkIntegrated ? "Integrated" : "Not Detected"}
              </h3>
            </div>
          </div>

          {/* ── SDK Integration Details ── */}
          <div className="card">
            <h2>SDK Integration Details</h2>
            {sdkIntegrated ? (
              <div
                style={{
                  marginTop: "14px",
                  padding: "16px 18px",
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: "10px",
                  display: "grid",
                  gap: "12px",
                }}
              >
                <p style={{ color: "var(--green)", fontWeight: 700, margin: 0, fontSize: "0.95rem" }}>
                  ✓ TraceKey SDK active in {knowledge.projectName}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginTop: "4px" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>SDK Version</p>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: "var(--text-primary)", fontSize: "0.88rem" }}>{sdkVersion}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Telemetry Status</p>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: "var(--green)", fontSize: "0.88rem" }}>{telemetryStatus}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>SDK Initialization File</p>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem", fontFamily: "monospace" }}>{sdkInitFile}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Initialization Method</p>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem" }}>{sdkInitMethod}</p>
                  </div>
                </div>

                {sdkFiles.length > 0 && (
                  <div style={{ marginTop: "6px", paddingTop: "10px", borderTop: "1px solid var(--border-sub)" }}>
                    <p style={{ margin: "0 0 6px", fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Files importing SDK</p>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {sdkFiles.map((f, i) => (
                        <span key={i} style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: "6px", fontSize: "0.78rem", fontFamily: "monospace", color: "var(--text-primary)" }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
                  TraceKey SDK was not detected in the uploaded project&apos;s source files.
                  Add the SDK to start receiving live runtime telemetry.
                </p>
                <pre
                  style={{
                    marginTop: "16px",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    padding: "16px",
                    borderRadius: "12px",
                    overflow: "auto",
                  }}
                >
                  {`import { initTraceKey } from "@tracekey/sdk";

initTraceKey({
  apiKey: "YOUR_API_KEY",
  project: "${knowledge.projectName || "your-project"}",
});`}
                </pre>
              </>
            )}
          </div>

          {/* ── Project Intelligence ── */}
          <div className="card">
            <h2>Project Intelligence</h2>
            <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
              <p style={{ color: "var(--text-primary)", margin: 0 }}>
                <strong>Runtime:</strong> {knowledge.runtime || "Unknown"}
              </p>
              <p style={{ color: "var(--text-primary)", margin: 0 }}>
                <strong>Package Manager:</strong> {knowledge.packageManager || "Unknown"}
              </p>
              <p style={{ color: "var(--text-primary)", margin: 0 }}>
                <strong>Dependencies ({Array.isArray(knowledge.dependencies) ? knowledge.dependencies.length : 0}):</strong>{" "}
                {Array.isArray(knowledge.dependencies) && knowledge.dependencies.length
                  ? knowledge.dependencies.join(" • ")
                  : "No dependencies detected in project files."}
              </p>
              {knowledge.environment?.length > 0 && (
                <p style={{ color: "var(--text-primary)", margin: 0 }}>
                  <strong>Environment Files:</strong> {knowledge.environment.join(", ")}
                </p>
              )}
              {knowledge.routes?.length > 0 && (
                <p style={{ color: "var(--text-primary)", margin: 0 }}>
                  <strong>Routes ({knowledge.routes.length}):</strong> {knowledge.routes.join(" • ")}
                </p>
              )}
              {knowledge.controllers?.length > 0 && (
                <p style={{ color: "var(--text-primary)", margin: 0 }}>
                  <strong>Controllers ({knowledge.controllers.length}):</strong> {knowledge.controllers.join(" • ")}
                </p>
              )}
              {knowledge.services?.length > 0 && (
                <p style={{ color: "var(--text-primary)", margin: 0 }}>
                  <strong>Services ({knowledge.services.length}):</strong> {knowledge.services.join(" • ")}
                </p>
              )}
              {knowledge.models?.length > 0 && (
                <p style={{ color: "var(--text-primary)", margin: 0 }}>
                  <strong>Models ({knowledge.models.length}):</strong> {knowledge.models.join(" • ")}
                </p>
              )}
              {knowledge.database?.length > 0 && (
                <p style={{ color: "var(--text-primary)", margin: 0 }}>
                  <strong>Database Technology:</strong> {knowledge.database.join(", ")}
                </p>
              )}
              {knowledge.authentication?.length > 0 && (
                <p style={{ color: "var(--text-primary)", margin: 0 }}>
                  <strong>Authentication Method:</strong> {knowledge.authentication.join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* ── Runtime Telemetry Events (separate from project knowledge) ── */}
          <div className="card">
            <h2>Runtime Telemetry Events</h2>
            {telemetry.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
                No runtime telemetry events received yet.{" "}
                {sdkIntegrated
                  ? "The SDK is integrated — events will appear here once the application runs."
                  : "Install and initialize the TraceKey SDK in your project to start receiving events."}
              </p>
            ) : (
              <div style={{ marginTop: "10px" }}>
                <p style={{ color: "var(--text-primary)", margin: "0 0 10px" }}>
                  <strong>Recent Telemetry Events ({telemetry.length}):</strong>
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {telemetry.slice(0, 8).map((event, idx) => (
                    <span key={idx} style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: "8px", fontSize: "0.8rem", color: "var(--text-primary)" }}>
                      ⚡ {event.category || event.type || "Telemetry"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default SDK;
