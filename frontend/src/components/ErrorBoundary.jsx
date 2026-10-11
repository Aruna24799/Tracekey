
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("TraceKey UI Error:", error, errorInfo);

    this.setState({
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#020617",
            color: "#E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "900px",
              background: "#0F172A",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              padding: "32px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "14px",
                  background: "rgba(239,68,68,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "26px",
                }}
              >
                ⚠
              </div>

              <div>
                <h1
                  style={{
                    fontSize: "2rem",
                    margin: 0,
                    fontWeight: 700,
                  }}
                >
                  TraceKey UI Failure
                </h1>

                <p
                  style={{
                    marginTop: "6px",
                    color: "#94A3B8",
                  }}
                >
                  A frontend rendering error occurred.
                </p>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: "14px",
                padding: "18px",
                marginBottom: "20px",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "12px",
                  color: "#FCA5A5",
                }}
              >
                Error Message
              </h3>

              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  margin: 0,
                  color: "#E2E8F0",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                }}
              >
                {this.state.error?.message || "Unknown error"}
              </pre>
            </div>

            {this.state.errorInfo?.componentStack && (
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "14px",
                  padding: "18px",
                  marginBottom: "20px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "12px",
                    color: "#93C5FD",
                  }}
                >
                  Component Stack
                </h3>

                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    margin: 0,
                    color: "#CBD5E1",
                    fontSize: "0.82rem",
                    lineHeight: 1.6,
                    maxHeight: "300px",
                    overflow: "auto",
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "14px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  background: "#2563EB",
                  border: "none",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Reload Application
              </button>

              <button
                onClick={() => window.history.back()}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#E2E8F0",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
