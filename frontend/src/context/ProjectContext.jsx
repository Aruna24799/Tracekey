// frontend/src/context/ProjectContext.jsx
// Broadcasts a projectVersion counter after each successful project analysis.
// All pages that consume this context will re-fetch on version change.

import React, { createContext, useCallback, useContext, useState } from "react";
import { analyzeProject as apiAnalyzeProject } from "../api.js";

export const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  // Last successful analysis result from the backend
  const [projectData, setProjectData] = useState(null);
  // Incrementing version — pages use this as a useEffect dependency to
  // trigger re-fetch immediately after analysis without a page reload.
  const [projectVersion, setProjectVersion] = useState(0);
  // Upload / analysis loading flag
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Error from the last analysis attempt
  const [analysisError, setAnalysisError] = useState(null);

  /**
   * analyzeProjectFile(formData)
   * Calls POST /api/analysis/project (existing route, existing controller).
   * On success: stores result and increments projectVersion.
   * All subscribers receive the new version and re-fetch their own data.
   */
  const analyzeProjectFile = useCallback(async (formData) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await apiAnalyzeProject(formData);
      if (result && result.success) {
        setProjectData(result);
        setProjectVersion((v) => v + 1);
      } else {
        throw new Error(result?.message || "Analysis returned no data.");
      }
      return result;
    } catch (err) {
      setAnalysisError(err.message || "Project analysis failed.");
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projectData,
        projectVersion,
        isAnalyzing,
        analysisError,
        analyzeProjectFile,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

// Convenience hook — avoids repetitive useContext(ProjectContext) calls in pages
export function useProject() {
  return useContext(ProjectContext);
}
