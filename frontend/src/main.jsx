
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ProjectProvider } from "./context/ProjectContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

import "./styles/global.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ProjectProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ProjectProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
