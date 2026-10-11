
import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Layout from "./components/Layout.jsx";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Health from "./pages/Health.jsx";
import Reports from "./pages/Reports.jsx";
import OcrPage from "./pages/OcrPage.jsx";
import Telemetry from "./pages/Telemetry.jsx";
import ErrorAnalysis from "./pages/ErrorAnalysis.jsx";
import Insights from "./pages/Insights.jsx";
import SDK from "./pages/SDK.jsx";
import Security from "./pages/Security.jsx";
import Settings from "./pages/Settings.jsx";

function App() {
  const [token, setToken] = useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    try {
      const savedToken =
        localStorage.getItem("tk_token");

      if (savedToken) {
        setToken(savedToken);
      }
    } catch (err) {
      console.error(
        "Session restore failed:",
        err
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (
    newToken
  ) => {
    try {
      localStorage.setItem(
        "tk_token",
        newToken
      );

      setToken(newToken);
    } catch (err) {
      console.error(
        "Login save failed:",
        err
      );
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(
        "tk_token"
      );

      localStorage.removeItem(
        "tk_username"
      );

      localStorage.removeItem(
        "tk_email"
      );

      setToken(null);
    } catch (err) {
      console.error(
        "Logout failed:",
        err
      );
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050505",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#E2E8F0",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              marginBottom: "18px",
            }}
          >
            ⬡
          </div>

          <h2>
            Loading TraceKey...
          </h2>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <Login
        onLoginSuccess={
          handleLoginSuccess
        }
      />
    );
  }

  return (
    <Layout
      onLogout={handleLogout}
    >
      <Routes>
        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/health"
          element={<Health />}
        />

        <Route
          path="/reports"
          element={<Reports />}
        />

        <Route
          path="/ocr"
          element={<OcrPage />}
        />

        <Route
          path="/telemetry"
          element={<Telemetry />}
        />

        <Route
          path="/error"
          element={
            <ErrorAnalysis />
          }
        />

        <Route
          path="/insights"
          element={<Insights />}
        />

        <Route
          path="/sdk"
          element={<SDK />}
        />

        <Route
          path="/security"
          element={<Security />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;
