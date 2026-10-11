
import React, { useEffect, useState, useCallback } from "react";
import { fetchTelemetry } from "../api.js";

function Telemetry() {
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTelemetry = useCallback(async () => {
    try {
      setLoading(true);

      const data = await fetchTelemetry();

      setTelemetry(
        Array.isArray(data?.events)
          ? data.events
          : Array.isArray(data)
            ? data
            : []
      );
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Telemetry fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTelemetry();

    const interval = setInterval(loadTelemetry, 15000);

    return () => clearInterval(interval);
  }, [loadTelemetry]);

  return (
    <div className="page-content">
      <div className="card">
        <h1>Runtime Telemetry</h1>

        <p
          style={{
            marginTop: "12px",
            color: "#94A3B8",
          }}
        >
          Live runtime telemetry and observability metrics.
        </p>
      </div>

      {error && (
        <div className="card">
          <p style={{ color: "#F87171" }}>{error}</p>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: "18px" }}>
          Telemetry Events
        </h2>

        {loading ? (
          <p>Loading telemetry...</p>
        ) : telemetry.length === 0 ? (
          <p>No runtime telemetry has been received from this project yet.</p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {telemetry.map((item, index) => (
              <div
                key={item._id || index}
                style={{
                  padding: "14px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.03)",
                  border:
                    "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <strong>
                    {item.type || item.category || "UNKNOWN_EVENT"}
                  </strong>

                  <span
                    style={{
                      color: "#94A3B8",
                      fontSize: "0.8rem",
                    }}
                  >
                    {item.timestamp || item.createdAt || "—"}
                  </span>
                </div>

                <p
                  style={{
                    marginTop: "10px",
                    color: "#CBD5E1",
                  }}
                >
                  {item.message || item.rootCause || item.rawError || "No details"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Telemetry;
