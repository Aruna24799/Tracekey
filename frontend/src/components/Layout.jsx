import React from "react";
import Sidebar from "./Sidebar.jsx";

function Layout({ children, onLogout }) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        background: "#050505",
      }}
    >
      <Sidebar onLogout={onLogout} />

      <main
        style={{
          flex: 1,
          marginLeft: "220px",
          width: "calc(100% - 220px)",
          background: "#050505",
          minHeight: "100vh",
          overflowY: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}

export default Layout;
