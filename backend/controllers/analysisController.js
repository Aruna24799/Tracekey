const AdmZip = require("adm-zip");
const analyzerService = require("../services/analyzerService");
const securityService = require("../services/securityService");
const ErrorReport = require("../models/ErrorReport");
const {
  upsertProjectKnowledge,
  analyzeProjectIntelligence
} = require("../services/projectKnowledgeService");

// Helper to detect language by file extension
function getLanguageFromExtension(ext) {
  const mapping = {
    js: "JavaScript",
    jsx: "JavaScript (React)",
    ts: "TypeScript",
    tsx: "TypeScript (React)",
    py: "Python",
    go: "Go",
    java: "Java",
    cpp: "C++",
    c: "C",
    h: "C/C++ Header",
    cs: "C#",
    rb: "Ruby",
    php: "PHP",
    html: "HTML",
    css: "CSS",
    sh: "Shell Script",
    yml: "YAML",
    yaml: "YAML",
    json: "JSON"
  };
  return mapping[ext.toLowerCase()] || "Other";
}

// POST /api/analysis/file - Analyze a single file (uploaded via Multer or pasted)
exports.analyzeFile = async (req, res) => {
  try {
    let filename = req.body.filename || "pasted_code.txt";
    let content = req.body.content;

    // Handle Multer upload
    if (req.file) {
      filename = req.file.originalname;
      content = req.file.buffer.toString("utf-8");
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "File content or file upload is required"
      });
    }

    const ext = filename.split(".").pop();
    const language = getLanguageFromExtension(ext);

    // Scan for secrets in the file content
    const securityResult = await securityService(content);

    // Scan for potential code quality / syntax issues
    const errorIssues = [];
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      // Simple regex checks for common errors
      if (line.includes("console.log") && !line.includes("//")) {
        errorIssues.push({ line: lineNum, type: "BEST_PRACTICE", message: "Production code contains console.log" });
      }
      if (line.match(/eval\s*\(/)) {
        errorIssues.push({ line: lineNum, type: "SECURITY", message: "Use of dangerous eval() function" });
      }
      if (line.match(/localStorage\.getItem/) && !line.includes("try")) {
        errorIssues.push({ line: lineNum, type: "ROBUSTNESS", message: "localStorage access not guarded by try-catch" });
      }
    });

    // Run core AnalyzerService to classify code and fetch AI explanations
    const analysis = await analyzerService(content, {
      userId: req.user.id,
      source: "file"
    });

    // Save error report to DB
    const report = await ErrorReport.create({
      userId: req.user.id,
      rawError: content,
      title: analysis.errorTitle,
      errorTitle: analysis.errorTitle,
      category: analysis.category || "FILE_ANALYSIS",
      fingerprint: analysis.fingerprint,
      security: [
        ...(analysis?.security?.threats?.map(t => t.message) || []),
        ...(securityResult?.threats?.map(t => t.message) || [])
      ],
      rootCause: analysis.rootCause || `Code analysis of ${filename}`,
      fix: analysis.immediateFix,
      prevention: analysis.prevention,
      debugSteps: analysis.debugSteps || analysis.technicalBreakdown || [],
      severity: analysis.severity || (securityResult?.hasThreats ? "CRITICAL" : "MEDIUM"),
      source: "file",
      // Rich AI analysis fields
      executiveSummary: analysis.executiveSummary,
      humanExplanation: analysis.humanExplanation,
      technicalExplanation: analysis.technicalExplanation,
      immediateFix: analysis.immediateFix,
      permanentFix: analysis.permanentFix,
      productionImpact: analysis.productionImpact,
      businessImpact: analysis.businessImpact,
      riskAssessment: analysis.riskAssessment,
      codeExamples: analysis.codeExamples,
      suggestedCode: analysis.suggestedCode,
      bestPractices: analysis.bestPractices || [],
      codeImprovementSuggestions: analysis.codeImprovementSuggestions,
      securityRecommendations: analysis.securityRecommendations,
      performanceRecommendations: analysis.performanceRecommendations,
      performanceImpact: analysis.performanceImpact,
      securityImpact: analysis.securityImpact || [],
      relatedTechnologies: analysis.relatedTechnologies || [],
      confidence: analysis.confidence,
      aiConfidence: analysis.aiConfidence,
      resolutionPriority: analysis.resolutionPriority,
      historicalFrequency: analysis.historicalFrequency,
      lastOccurrenceAt: analysis.lastOccurrenceAt,
      failureChain: analysis.failureChain || [],
      affectedFiles: analysis.affectedFiles || [],
      affectedModules: analysis.affectedModules || [],
      monitoringRecommendations: analysis.monitoringRecommendations || [],
      personas: analysis.personas,
      roleExplanations: analysis.roleExplanations,
      timeline: analysis.timeline,
      similarErrors: analysis.similarErrors,
      metadata: {
        filename,
        technology: language,
        ...analysis.metadata
      }
    });

    res.json({
      success: true,
      reportId: report._id,
      filename,
      language,
      sizeBytes: Buffer.byteLength(content),
      securityIssues: securityResult?.threats || [],
      errorIssues,
      debugSteps: analysis.debugSteps || analysis.technicalBreakdown || [],
      ...analysis,
      analysis: {
        ...analysis,
        debugSteps: analysis.debugSteps || analysis.technicalBreakdown || [],
      }
    });
  } catch (error) {
    console.error("analyzeFile Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST /api/analysis/project - Analyze a project folder (uploaded as ZIP) or via paste metadata
exports.analyzeProject = async (req, res, next) => {
  try {
    let zipBuffer = null;
    let projectName = req.body.projectName || "Analyzed Project";

    // Handle Multer upload (projectfile)
    if (req.file) {
      zipBuffer = req.file.buffer;
      if (req.file.originalname) {
        projectName = req.file.originalname.replace(/\.zip$/i, "");
      }
    } else if (req.body.content) {
      // Pasted / Mock ZIP representation for fallback/testing
      zipBuffer = Buffer.from(req.body.content, "base64");
    }

    if (!zipBuffer) {
      return res.status(400).json({
        success: false,
        message: "Project ZIP file upload is required"
      });
    }

    // Extract ZIP in-memory using adm-zip
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    // Leverage projectKnowledgeService's intelligence engine
    const intel = analyzeProjectIntelligence(zipEntries, projectName);

    let filesAnalyzedCount = 0;
    const languages = intel.languages || {};
    const dependencies = intel.dependencies || [];
    const securityIssues = [...(intel.risks || []).filter(r => r.type === "SECURITY")];
    const errors = [];
    const performanceRisks = [];
    const bestPractices = [];
    let framework = intel.framework || "Unknown";
    let aggregatedContentSample = "";

    // Granular SDK detection & metadata extraction
    let sdkDetected = false;
    let sdkInitFile = "";
    let sdkVersion = "";
    const sdkFiles = [];
    let sdkInitMethod = "Not Initialized";

    // Environment files found in the project
    const envFiles = [];

    // Parse ZIP entries for code inspection, security scan, and SDK analysis
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const path = (entry.entryName || "").replace(/\\/g, "/");
      const filename = entry.name || path.split("/").pop() || "";
      const ext = filename.split(".").pop().toLowerCase();

      // Detect environment files (.env, .env.local, etc.)
      if (/^\.env(\..*)?$/.test(filename)) {
        if (!envFiles.includes(path)) envFiles.push(path);
      }

      // Check package.json for SDK version
      if (filename === "package.json") {
        try {
          const pkg = JSON.parse(entry.getData().toString("utf8"));
          const allDeps = { ...pkg.dependencies || {}, ...pkg.devDependencies || {} };
          if (allDeps["@tracekey/sdk"]) {
            sdkVersion = allDeps["@tracekey/sdk"];
          }
        } catch (_) {}
      }

      // Inspect code files (up to 40 files)
      const isCodeFile = ["js", "jsx", "ts", "tsx", "py", "go", "java", "cs", "php", "rb"].includes(ext);
      if (isCodeFile && filesAnalyzedCount < 40) {
        try {
          const code = entry.getData().toString("utf8");
          filesAnalyzedCount++;

          if (aggregatedContentSample.length < 6000) {
            aggregatedContentSample += `\n// File: ${path}\n${code.slice(0, 1200)}\n`;
          }

          // Granular TraceKey SDK detection
          if (code.includes("@tracekey/sdk") || code.includes("initTraceKey") || code.includes("tracekey-sdk")) {
            sdkDetected = true;
            if (!sdkFiles.includes(path)) sdkFiles.push(path);
            if (!sdkInitFile && (code.includes("initTraceKey") || code.includes("init("))) {
              sdkInitFile = path;
              if (code.includes("initTraceKey")) sdkInitMethod = "initTraceKey()";
              else if (code.includes("expressMiddleware")) sdkInitMethod = "Express Middleware";
              else sdkInitMethod = "Custom SDK Initialization";
            }
          }

          // Scan for secrets with securityService
          try {
            const secScan = await securityService(code);
            if (secScan && secScan.hasThreats) {
              secScan.threats.forEach(sec => {
                securityIssues.push({
                  file: path,
                  severity: "HIGH",
                  type: "Hardcoded Credential",
                  description: sec.message || "Security pattern matched"
                });
              });
            }
          } catch (_) {}

          // Scan for generic code & performance issues
          const codeLines = code.split("\n");
          codeLines.forEach((line, idx) => {
            const lineNum = idx + 1;
            if (line.match(/eval\s*\(/)) {
              securityIssues.push({
                file: path,
                severity: "HIGH",
                type: "Security Vulnerability",
                description: `line ${lineNum}: Avoid eval() functions in ${path}`
              });
            }
            if (line.match(/sync/i) && line.match(/fs\./) && (framework.includes("Node") || framework.includes("Express"))) {
              performanceRisks.push({
                file: path,
                type: "Synchronous I/O Block",
                description: `line ${lineNum}: Avoid synchronous fs calls in production (${path})`
              });
            }
            if (line.match(/todo/i)) {
              bestPractices.push(`File ${path} contains unfinished work (TODO on line ${lineNum})`);
            }
          });
        } catch (_) {}
      }
    }

    if (!sdkInitFile && sdkFiles.length > 0) {
      sdkInitFile = sdkFiles[0];
      sdkInitMethod = "SDK Import Detected";
    }

    // Determine Project Type
    let projectType = "Node.js Application";
    if (framework.includes("React") && (framework.includes("Express") || intel.structure.routes.length > 0)) {
      projectType = "Full Stack Application (React + Node API)";
    } else if (framework.includes("React")) {
      projectType = "React Single Page Application";
    } else if (framework.includes("Next")) {
      projectType = "Next.js Web Application";
    } else if (framework.includes("Express")) {
      projectType = "Node.js REST API (Express)";
    } else if (framework.includes("Python") || framework.includes("Django") || framework.includes("Flask") || framework.includes("FastAPI")) {
      projectType = "Python Service";
    } else if (framework.includes("Go")) {
      projectType = "Go Microservice";
    }

    // Determine Database Technology
    const databaseTech = [];
    if (zipEntries.some(e => /mongo|mongoose/i.test(e.entryName))) databaseTech.push("MongoDB (Mongoose)");
    if (zipEntries.some(e => /postgres|pg/i.test(e.entryName))) databaseTech.push("PostgreSQL");
    if (zipEntries.some(e => /mysql/i.test(e.entryName))) databaseTech.push("MySQL");
    if (zipEntries.some(e => /sqlite/i.test(e.entryName))) databaseTech.push("SQLite");
    if (zipEntries.some(e => /prisma/i.test(e.entryName))) databaseTech.push("Prisma ORM");
    if (zipEntries.some(e => /redis/i.test(e.entryName))) databaseTech.push("Redis Cache");

    // Determine Authentication Method
    const authMethod = [];
    if (zipEntries.some(e => /jwt|jsonwebtoken/i.test(e.entryName))) authMethod.push("JWT Authentication");
    if (zipEntries.some(e => /passport/i.test(e.entryName))) authMethod.push("Passport.js");
    if (zipEntries.some(e => /session|cookie/i.test(e.entryName))) authMethod.push("Session-Based Auth");
    if (zipEntries.some(e => /oauth/i.test(e.entryName))) authMethod.push("OAuth 2.0");

    // Project Complexity
    let projectComplexity = "Medium";
    if (intel.totalFiles > 50 || intel.sourceFileCount > 30) projectComplexity = "High";
    else if (intel.totalFiles < 15) projectComplexity = "Low";

    // Format fallback content sample with rich intelligence context
    if (!aggregatedContentSample) {
      aggregatedContentSample = `Analyzed project ${projectName} containing ${intel.totalFiles} files. Project Type: ${projectType}. Framework: ${framework}.`;
    }

    // Run core AnalyzerService to aggregate findings and get AI explanations
    const analysis = await analyzerService(aggregatedContentSample, {
      userId: req.user.id,
      source: "project"
    });

    // Score calculations based on empirical findings
    const totalIssues = securityIssues.length + errors.length + performanceRisks.length;
    const healthScore = Math.max(10, 100 - (totalIssues * 5) - (securityIssues.length * 10));
    const riskScore = Math.min(100, (securityIssues.length * 20) + (performanceRisks.length * 10));

    // Save report to DB
    const report = await ErrorReport.create({
      userId: req.user.id,
      rawError: aggregatedContentSample,
      title: analysis.errorTitle || `${projectName} Analysis`,
      errorTitle: analysis.errorTitle || `${projectName} Analysis`,
      category: "PROJECT_ANALYSIS",
      technology: framework,
      framework,
      language: intel.primaryLanguage || "JavaScript",
      runtime: framework.toLowerCase().includes("python") ? "Python" : "Node.js",
      platform: "Server / Application",
      severity: securityIssues.length > 0 ? "HIGH" : (performanceRisks.length > 0 ? "MEDIUM" : "LOW"),
      confidence: analysis.confidence,
      aiConfidence: analysis.aiConfidence,
      fingerprint: analysis.fingerprint,
      historicalFrequency: analysis.historicalFrequency || 1,
      lastOccurrenceAt: analysis.lastOccurrenceAt,
      rootCause: `Project-wide intelligence summary for ${projectName} (${projectType})`,
      executiveSummary: analysis.executiveSummary || `Project ${projectName} analyzed. Framework: ${framework}. Total files: ${intel.totalFiles}.`,
      humanExplanation: analysis.humanExplanation,
      technicalExplanation: analysis.technicalExplanation,
      immediateFix: analysis.immediateFix,
      permanentFix: analysis.permanentFix,
      debugSteps: analysis.debugSteps || analysis.technicalBreakdown || [],
      productionImpact: analysis.productionImpact,
      businessImpact: analysis.businessImpact,
      riskAssessment: analysis.riskAssessment,
      codeExamples: analysis.codeExamples,
      suggestedCode: analysis.suggestedCode,
      bestPractices: analysis.bestPractices || [],
      codeImprovementSuggestions: analysis.codeImprovementSuggestions,
      securityRecommendations: analysis.securityRecommendations,
      performanceRecommendations: analysis.performanceRecommendations,
      performanceImpact: analysis.performanceImpact,
      securityImpact: analysis.securityImpact || [],
      relatedTechnologies: analysis.relatedTechnologies || [],
      affectedFiles: intel.structure.routes.concat(intel.structure.controllers).slice(0, 10),
      affectedModules: intel.structure.services.concat(intel.structure.models).slice(0, 10),
      similarErrors: analysis.similarErrors || [],
      timeline: analysis.timeline || [],
      personas: analysis.personas,
      roleExplanations: analysis.roleExplanations,
      metadata: {
        projectName,
        projectType,
        framework,
        healthScore,
        riskScore,
        totalFiles: intel.totalFiles,
        sourceFiles: intel.sourceFileCount,
        configFiles: intel.configuration.length,
        envFilesCount: envFiles.length
      }
    });

    const detectedLanguages = intel.languageList || Object.keys(languages);
    const packageManager = intel.buildTool || "npm";

    const sdkDetails = {
      sdkDetected,
      sdkInitFile: sdkInitFile || (sdkFiles[0] || ""),
      sdkVersion: sdkVersion || (sdkDetected ? "1.0.0" : "Not Installed"),
      sdkFiles,
      sdkInitMethod: sdkInitMethod || (sdkDetected ? "initTraceKey()" : "None"),
      telemetryStatus: sdkDetected ? "Active" : "Pending Setup"
    };

    // Store in MongoDB via projectKnowledgeService
    await upsertProjectKnowledge(req.user.id, {
      projectName,
      framework,
      language: detectedLanguages,
      runtime: framework.toLowerCase().includes("python") ? "Python" : "Node.js",
      packageManager,
      dependencies,
      database: databaseTech.length > 0 ? databaseTech : ["None Detected"],
      authentication: authMethod.length > 0 ? authMethod : ["Standard API Authentication"],
      docker: zipEntries.some((entry) => /dockerfile|docker-compose/i.test(entry.entryName)),
      cicd: zipEntries.some((entry) => /github\/workflows|gitlab-ci|azure-pipelines|circleci/i.test(entry.entryName)) ? ["CI/CD Pipeline Configured"] : [],
      configuration: intel.configuration.map(c => c.path),
      configurationSummary: intel.configurationSummary,
      folderStructure: intel.folderStructure,
      routes: intel.structure.routes,
      apiEndpoints: intel.structure.apis.concat(intel.structure.routes),
      controllers: intel.structure.controllers,
      services: intel.structure.services,
      models: intel.structure.models,
      components: intel.structure.components,
      architecture: intel.architecture,
      environment: envFiles,
      projectComplexity,
      sdkSummary: sdkDetected
        ? `TraceKey SDK active in ${projectName}. Init File: ${sdkDetails.sdkInitFile || "Detected"}. Version: ${sdkDetails.sdkVersion}.`
        : "",
      sdkDetails,
      summary: `Project: ${projectName} (${projectType}) | Framework: ${framework} | ${intel.totalFiles} Total Files (${intel.sourceFileCount} Source, ${intel.configuration.length} Config, ${envFiles.length} Env) | Health Score: ${healthScore}/100`,
      source: "project",
      lastAnalysisReportId: report._id
    });

    res.json({
      success: true,
      reportId: report._id,
      projectName,
      projectType,
      framework,
      runtime: framework.toLowerCase().includes("python") ? "Python" : "Node.js",
      packageManager,
      languages,
      languageList: detectedLanguages,
      dependencies,
      // Clear file count metrics (PART 3)
      totalFiles: intel.totalFiles,
      sourceFiles: intel.sourceFileCount,
      configFiles: intel.configuration.length,
      envFiles,
      envFilesCount: envFiles.length,
      filesAnalyzedCount: intel.sourceFileCount || filesAnalyzedCount,
      architecture: intel.architecture,
      projectComplexity,
      routes: intel.structure.routes,
      controllers: intel.structure.controllers,
      services: intel.structure.services,
      models: intel.structure.models,
      components: intel.structure.components,
      database: databaseTech,
      authentication: authMethod,
      sdkDetails,
      securityIssues,
      performanceRisks,
      bestPractices,
      healthScore,
      riskScore,
      knowledge: {
        projectName,
        projectType,
        framework,
        language: detectedLanguages,
        runtime: framework.toLowerCase().includes("python") ? "Python" : "Node.js",
        packageManager,
        dependencies,
        folderStructure: intel.folderStructure,
        totalFiles: intel.totalFiles,
        sourceFiles: intel.sourceFileCount,
        configFiles: intel.configuration.length,
        envFiles,
        sdkDetails
      },
      ...analysis,
      analysis
    });
  } catch (error) {
    console.error("analyzeProject Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};