import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext.jsx";

const navItems = [
  { name: "Dashboard",      path: "/" },
  { name: "Error Analysis", path: "/error" },
  { name: "OCR Analysis",   path: "/ocr" },
  { name: "Reports",        path: "/reports" },
  { name: "System Health",  path: "/health" },
  { name: "Telemetry",      path: "/telemetry" },
  { name: "Insights",       path: "/insights" },
  { name: "SDK",            path: "/sdk" },
  { name: "Security",       path: "/security" },
  { name: "Settings",       path: "/settings" },
];

function Sidebar({ onLogout }) {
  const username = localStorage.getItem("tk_username") || "Analyst";
  const email    = localStorage.getItem("tk_email") || "";
  const { theme, toggleTheme } = useContext(ThemeContext) || {};

  return (
    <aside
      style={{
        width: "220px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
        padding: "20px 14px",
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: "24px", paddingBottom: "18px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              background: "var(--blue)",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: 800,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            T
          </div>
          <span
            style={{
              fontSize: "1rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            TraceKey
          </span>
        </div>
        <p
          style={{
            fontSize: "0.68rem",
            color: "var(--text-muted)",
            marginTop: "6px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Error Intelligence
        </p>
      </div>

      {/* User */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "12px 14px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "var(--blue-dim)",
            border: "1px solid var(--blue)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "var(--blue)",
            marginBottom: "8px",
          }}
        >
          {username.charAt(0).toUpperCase()}
        </div>
        <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.82rem", margin: 0 }}>
          {username}
        </p>
        {email && (
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.68rem",
              margin: "2px 0 0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {email}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            style={({ isActive }) => ({
              display: "block",
              padding: "9px 12px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "var(--blue)" : "var(--text-secondary)",
              background: isActive ? "var(--blue-dim)" : "transparent",
              border: isActive ? "1px solid var(--blue)" : "1px solid transparent",
              textDecoration: "none",
              transition: "all 0.15s ease",
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.classList.contains("active-link")) {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--bg-raised)";
              }
            }}
            onMouseLeave={(e) => {
              const isActive = e.currentTarget.getAttribute("aria-current") === "page";
              if (!isActive) {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Theme Toggle */}
      {toggleTheme && (
        <button
          onClick={toggleTheme}
          style={{
            marginTop: "12px",
            width: "100%",
            padding: "9px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.15s ease",
          }}
        >
          <span>{theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}</span>
        </button>
      )}

      {/* Logout */}
      <button
        onClick={onLogout}
        style={{
          marginTop: "8px",
          width: "100%",
          padding: "9px 12px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text-muted)",
          fontSize: "0.78rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(239,68,68,0.1)";
          e.currentTarget.style.color = "var(--red)";
          e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        Sign Out
      </button>
    </aside>
  );
}

export default Sidebar;