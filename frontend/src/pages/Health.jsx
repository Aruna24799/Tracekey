
import React, { useCallback, useEffect, useState } from "react";
import { fetchHealth, fetchProjectKnowledge } from "../api.js";

function StatCard({ title, value, detail }) {
  return (
    <div className="card" style={{ minHeight: "120px" }}>
      <p style={{ color: "#94A3B8", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.78rem" }}>{title}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
      {detail ? <p style={{ marginTop: "10px", color: "#CBD5E1" }}>{detail}</p> : null}
    </div>
  );
}

function Health() {
  const [health, setHealth] = useState(null);
  const [knowledge, setKnowledge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHealth = useCallback(async () => {
    try {
      setLoading(true);
      const [healthData, knowledgeData] = await Promise.all([fetchHealth(), fetchProjectKnowledge()]);
      setHealth(healthData?.health || null);
      setKnowledge(knowledgeData?.knowledge || null);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Health data unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const sdkConnected = Boolean(knowledge?.sdkSummary || knowledge?.source === "sdk");

  return (
    <div className="page-content">
      <div className="card">
        <h1>System Health</h1>
        <p style={{ marginTop: "10px", color: "#94A3B8" }}>Measured backend health, database readiness, and runtime stability only.</p>
      </div>

      {error ? <div className="card"><p style={{ color: "#F87171" }}>{error}</p></div> : null}

      {loading ? (
        <div className="card"><p>Loading health metrics...</p></div>
      ) : (
        <>
          <div className="grid-4">
            <StatCard title="Runtime Status" value={health?.status || "UNKNOWN"} detail={health?.timestamp ? `Measured at ${health.timestamp}` : "No runtime measurement returned."} />
            <StatCard title="Database" value={health?.db?.status || "UNKNOWN"} detail={health?.db?.pingMs != null ? `Ping ${health.db.pingMs} ms` : "MongoDB ping unavailable."} />
            <StatCard title="Health Score" value={`${health?.stabilityIndex ?? 0}%`} detail={sdkConnected ? "Includes SDK-backed runtime signals." : "Runtime metrics require SDK connectivity."} />
            <StatCard title="SDK Status" value={sdkConnected ? "CONNECTED" : "DISCONNECTED"} detail={sdkConnected ? "SDK telemetry is contributing to the knowledge layer." : "Connect the SDK to enable live runtime monitoring."} />
          </div>

          <div className="grid-2">
            <div className="card">
              <h2>Memory</h2>
              <p><strong>RSS:</strong> {health?.memory?.rss ?? "Unavailable"} MB</p>
              <p><strong>Heap Used:</strong> {health?.memory?.heapUsed ?? "Unavailable"} MB</p>
              <p><strong>Heap Total:</strong> {health?.memory?.heapTotal ?? "Unavailable"} MB</p>
              <p><strong>External:</strong> {health?.memory?.external ?? "Unavailable"} MB</p>
            </div>
            <div className="card">
              <h2>System</h2>
              <p><strong>Platform:</strong> {health?.system?.platform || "Unavailable"}</p>
              <p><strong>Architecture:</strong> {health?.system?.arch || "Unavailable"}</p>
              <p><strong>Node Version:</strong> {health?.system?.nodeVersion || "Unavailable"}</p>
              <p><strong>Uptime:</strong> {health?.system?.uptime != null ? `${health.system.uptime}s` : "Unavailable"}</p>
            </div>
          </div>

          <div className="card">
            <h2>Telemetry Summary</h2>
            <p><strong>Total Reports:</strong> {health?.telemetrySummary?.totalReports ?? 0}</p>
            <p><strong>Critical Findings:</strong> {health?.telemetrySummary?.criticalCount ?? 0}</p>
            <p><strong>Authentication Events:</strong> {health?.authMetrics?.totalLogins ?? 0}</p>
            <p><strong>Connected Project:</strong> {knowledge?.projectName || "No project snapshot available"}</p>
          </div>
        </>
      )}
    </div>
  );
}

export default Health;
