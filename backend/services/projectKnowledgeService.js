const ProjectKnowledge = require("../models/ProjectKnowledge");

function compactList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return Array.from(
        new Set(
            value
                .map((item) => String(item || "").trim())
                .filter(Boolean)
        )
    ).slice(0, 100);
}

function compactMixedList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => {
            if (item === null || item === undefined || item === "") {
                return null;
            }

            if (typeof item === "string") {
                return item.trim();
            }

            return JSON.stringify(item);
        })
        .filter(Boolean)
        .slice(0, 100);
}

function toNumber(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeKnowledge(payload = {}) {
    const languages = Array.isArray(payload.language)
        ? payload.language
        : payload.language
            ? [payload.language]
            : [];

    return {
        projectName: String(payload.projectName || payload.name || "").trim(),
        projectType: String(payload.projectType || "").trim(),
        repository: String(payload.repository || "").trim(),
        framework: String(payload.framework || "Unknown").trim() || "Unknown",
        language: compactList(languages),
        runtime: String(payload.runtime || "Unknown").trim() || "Unknown",
        packageManager: String(payload.packageManager || "Unknown").trim() || "Unknown",
        dependencies: compactList(payload.dependencies),
        routes: compactList(payload.routes),
        controllers: compactList(payload.controllers),
        services: compactList(payload.services),
        models: compactList(payload.models),
        components: compactList(payload.components),
        architecture: String(payload.architecture || "").trim(),
        dependencyGraph: compactList(payload.dependencyGraph),
        callGraph: compactList(payload.callGraph),
        routeGraph: compactList(payload.routeGraph),
        controllerGraph: compactList(payload.controllerGraph),
        serviceGraph: compactList(payload.serviceGraph),
        modelGraph: compactList(payload.modelGraph),
        componentGraph: compactList(payload.componentGraph),
        configuration: compactList(payload.configuration),
        configurationSummary: String(payload.configurationSummary || "").trim(),
        environment: compactList(payload.environment),
        environmentSummary: String(payload.environmentSummary || "").trim(),
        database: compactList(payload.database),
        schemaSummary: String(payload.schemaSummary || "").trim(),
        authentication: compactList(payload.authentication),
        authenticationSummary: String(payload.authenticationSummary || "").trim(),
        cicd: compactList(payload.cicd),
        buildTools: compactList(payload.buildTools),
        technologyStack: compactList(payload.technologyStack),
        apiEndpoints: compactList(payload.apiEndpoints),
        folderStructure: compactList(payload.folderStructure),
        historicalReports: compactMixedList(payload.historicalReports),
        sdkSummary: String(payload.sdkSummary || "").trim(),
        sdkDetails: payload.sdkDetails || null,
        totalFiles: toNumber(payload.totalFiles),
        sourceFiles: toNumber(payload.sourceFiles),
        configFiles: toNumber(payload.configFiles),
        projectComplexity: String(payload.projectComplexity || "Unknown").trim() || "Unknown",
        technicalDebt: String(payload.technicalDebt || "Unknown").trim() || "Unknown",
        securityScore: toNumber(payload.securityScore),
        performanceScore: toNumber(payload.performanceScore),
        docker: Boolean(payload.docker),
        cloudProvider: String(payload.cloudProvider || "Unknown").trim() || "Unknown",
        summary: String(payload.summary || "").trim(),
        source: payload.source || "project",
        lastAnalysisReportId: payload.lastAnalysisReportId || undefined,
        updatedAt: new Date()
    };
}

async function upsertProjectKnowledge(userId, payload = {}) {
    if (!userId) {
        return null;
    }

    const knowledge = normalizeKnowledge(payload);
    const current = await ProjectKnowledge.findOneAndUpdate(
        { userId, projectName: knowledge.projectName || "" },
        {
            $set: {
                ...knowledge,
                userId
            },
            $setOnInsert: {
                createdAt: new Date()
            }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return current;
}

async function getLatestProjectKnowledge(userId) {
    if (!userId) {
        return null;
    }

    return ProjectKnowledge.findOne({ userId })
        .sort({ updatedAt: -1 })
        .lean();
}

// ============================================================
// PROJECT INTELLIGENCE ENGINE
// Small reusable functions for analyzing project folders/ZIPs
// ============================================================

// --- Framework Detection Signatures ---
const FRAMEWORK_SIGNATURES = [
  { name: "React",         files: ["package.json"], deps: ["react", "react-dom"] },
  { name: "Next.js",       files: ["package.json", "next.config.js", "next.config.mjs"], deps: ["next"] },
  { name: "Vue",           files: ["package.json"], deps: ["vue"] },
  { name: "Angular",       files: ["angular.json", "package.json"], deps: ["@angular/core"] },
  { name: "Node.js",       files: ["package.json"] },
  { name: "Express",       files: ["package.json"], deps: ["express"] },
  { name: "NestJS",        files: ["package.json", "nest-cli.json"], deps: ["@nestjs/core"] },
  { name: "Django",        files: ["requirements.txt", "manage.py", "Pipfile"], depsPattern: /django/i },
  { name: "Flask",         files: ["requirements.txt", "Pipfile"], depsPattern: /flask/i },
  { name: "FastAPI",       files: ["requirements.txt", "Pipfile"], depsPattern: /fastapi/i },
  { name: "Spring Boot",   files: ["pom.xml", "build.gradle"], depsPattern: /spring-boot/i },
  { name: "ASP.NET",       files: ["*.csproj", "*.sln", "Startup.cs", "Program.cs"] },
  { name: "Laravel",       files: ["composer.json", "artisan"], depsPattern: /laravel/i },
  { name: "Rails",         files: ["Gemfile", "Rakefile"], depsPattern: /rails/i },
  { name: "Go",            files: ["go.mod"] },
  { name: "Rust",          files: ["Cargo.toml"] },
  { name: "Electron",      files: ["package.json", "main.js"], deps: ["electron"] },
];

// --- Structure Patterns ---
const STRUCTURE_PATTERNS = {
  sourceFolders:  [/(?:^|\/)(?:src|source|app)(?:\/|$)/i],
  components:     [/(?:^|\/)components?(?:\/|$)/i],
  pages:          [/(?:^|\/)pages?(?:\/|$)/i],
  routes:         [/(?:^|\/)routes?(?:\/|$)|(?:^|\/)routers?(?:\/|$)/i],
  services:       [/(?:^|\/)services?(?:\/|$)/i],
  apis:           [/(?:^|\/)api(?:\/|$)|(?:^|\/)graphql(?:\/|$)/i],
  models:         [/(?:^|\/)models?(?:\/|$)|(?:^|\/)entities(?:\/|$)/i],
  controllers:    [/(?:^|\/)controllers?(?:\/|$)/i],
  middleware:     [/(?:^|\/)middlewares?(?:\/|$)/i],
  utilities:      [/(?:^|\/)utils?(?:\/|$)|(?:^|\/)helpers?(?:\/|$)|(?:^|\/)lib(?:\/|$)/i],
  assets:         [/(?:^|\/)assets(?:\/|$)|(?:^|\/)public(?:\/|$)|(?:^|\/)static(?:\/|$)|(?:^|\/)images(?:\/|$)|(?:^|\/)icons(?:\/|$)/i],
  tests:          [/(?:^|\/)tests?(?:\/|$)|(?:^|\/)__tests__(?:\/|$)|(?:\.test\.|\.spec\.)|\/cypress\//i],
  config:         [/(?:^|\/)configs?(?:\/|$)|(?:\.config\.)/i],
  hooks:          [/(?:^|\/)hooks?(?:\/|$)/i],
  store:          [/(?:^|\/)store(?:\/|$)|(?:^|\/)redux(?:\/|$)|(?:^|\/)state(?:\/|$)/i],
  types:          [/(?:^|\/)types?(?:\/|$)|(?:^|\/)interfaces?(?:\/|$)/i],
  styles:         [/\.(?:css|scss|less|sass)$/i, /(?:^|\/)styles?(?:\/|$)|(?:^|\/)css(?:\/|$)/i],
};

// --- Config File Patterns ---
const CONFIG_FILE_PATTERNS = [
  { name: "Environment Variables",          pattern: /\.env(?:\.[a-zA-Z0-9_-]+)?$/i },
  { name: "TypeScript Config",              pattern: /(?:tsconfig|jsconfig)\.json$/i },
  { name: "Vite Config",                    pattern: /vite\.config\.[cm]?[jt]s$/i },
  { name: "Webpack Config",                 pattern: /webpack\.config\.[cm]?[jt]s$/i },
  { name: "Next.js Config",                 pattern: /next\.config\.[cm]?[jt]s$/i },
  { name: "Angular Config",                 pattern: /angular\.json$/i },
  { name: "Docker Config",                  pattern: /(?:Dockerfile|docker-compose\.ya?ml)$/i },
  { name: "Nginx Config",                   pattern: /nginx\.conf$/i },
  { name: "Vercel Config",                  pattern: /vercel\.json$/i },
  { name: "Netlify Config",                 pattern: /netlify\.toml$/i },
  { name: "CI/CD Config",                   pattern: /\.github\/workflows\//i },
  { name: "Git Config",                     pattern: /(?:\.gitignore|\.gitattributes)$/i },
  { name: "ESLint Config",                  pattern: /(?:\.eslintrc|eslint\.config)/i },
  { name: "Prettier Config",                pattern: /(?:\.prettierrc|prettier\.config)/i },
  { name: "Babel Config",                   pattern: /(?:babel\.config\.[cm]?[jt]s|\.babelrc)$/i },
  { name: "PostCSS Config",                 pattern: /(?:postcss\.config\.|\.postcssrc)/i },
  { name: "Tailwind Config",                pattern: /tailwind\.config\./i },
  { name: "Package.json",                   pattern: /package\.json$/i },
  { name: "README",                         pattern: /readme\.md$/i },
  { name: "Maven POM",                      pattern: /pom\.xml$/i },
  { name: "Gradle Build",                   pattern: /build\.gradle(?:\.kts)?$/i },
  { name: "Cargo Config",                   pattern: /Cargo\.toml$/i },
  { name: "Go Module",                      pattern: /go\.mod$/i },
  { name: "Composer Config",                pattern: /composer\.json$/i },
  { name: "NuGet Config",                   pattern: /\.(?:csproj|sln)$/i },
  { name: "Dependabot Config",              pattern: /dependabot\.ya?ml$/i },
];

// --- Entry Point Patterns ---
const ENTRY_POINT_PATTERNS = [
  /(?:^|\/)server\.(?:js|ts|mjs)$/i, /(?:^|\/)index\.(?:js|ts|jsx|tsx|mjs)$/i,
  /(?:^|\/)app\.(?:js|ts|jsx|tsx)$/i, /(?:^|\/)main\.(?:js|ts|jsx|tsx)$/i,
  /(?:^|\/)main\.py$/i, /(?:^|\/)manage\.py$/i, /(?:^|\/)app\.py$/i, /(?:^|\/)application\.py$/i,
  /(?:^|\/)index\.html$/i, /(?:^|\/)Program\.cs$/i,
  /(?:^|\/)routes?\.(?:js|ts)$/i, /(?:^|\/)router\.(?:js|ts)$/i, /(?:^|\/)middleware\.(?:js|ts)$/i,
  /(?:^|\/)cli\.(?:js|ts|py|go)$/i, /^cmd\//i,
];

// --- Dependency File Parsers (HashMap) ---
const DEPENDENCY_PARSERS = new Map([
  ["package.json", (content) => {
    try { const p = JSON.parse(content); return { dependencies: {...p.dependencies||{},...p.devDependencies||{}}, scripts: p.scripts||{}, packageManager: p.packageManager||"npm" }; } catch { return null; }
  }],
  ["package-lock.json", (content) => {
    try { const l = JSON.parse(content); const d={}; if(l.packages) for(const[p,i] of Object.entries(l.packages)) if(p&&i.version) d[p.replace(/^node_modules\//,"")]=i.version; return {dependencies:d}; } catch { return null; }
  }],
  ["yarn.lock", (content) => {
    const d={}; let cur=null; content.split("\n").forEach(l=>{ const n=l.match(/^"?([^"@\s]+@[^"]+)"?:$/); if(n) cur=n[1]; const v=l.match(/^\s+version\s+"?([^"]+)"?$/); if(cur&&v){ d[cur]=v[1]; cur=null; }}); return {dependencies:d};
  }],
  ["requirements.txt", (content) => {
    const d={}; content.split("\n").forEach(l=>{ const t=l.trim(); if(t&&!t.startsWith("#")&&!t.startsWith("-")){ const p=t.split(/[=<>!~]/); d[p[0].trim()]=p[1]||"latest"; }}); return {dependencies:d};
  }],
  ["Pipfile", (content) => {
    const d={}; content.split("\n").forEach(l=>{ const m=l.match(/^\s*"?([^"=\s]+)"?\s*=\s*"?([^"]*)"?$/); if(m&&m[1]&&!m[1].startsWith("[")) d[m[1].trim()]=m[2].trim()||"latest"; }); return {dependencies:d};
  }],
  ["go.mod", (content) => {
    const d={}; content.split("\n").forEach(l=>{ const m=l.trim().match(/^require\s+(\S+)\s+(\S+)/); if(m) d[m[1]]=m[2]; }); return {dependencies:d};
  }],
  ["Cargo.toml", (content) => {
    const d={}; let inDeps=false; content.split("\n").forEach(l=>{ if(/^\[dependencies\]/i.test(l.trim())) inDeps=true; else if(/^\[.*\]/.test(l.trim())) inDeps=false; else if(inDeps){ const m=l.trim().match(/^"?([^"=\s]+)"?\s*=\s*"([^"]+)"/); if(m) d[m[1]]=m[2]; }}); return {dependencies:d};
  }],
  ["composer.json", (content) => {
    try { const p=JSON.parse(content); return {dependencies:{...p.require||{},...p["require-dev"]||{}}}; } catch { return null; }
  }],
  ["pom.xml", (content) => {
    const d={}; (content.match(/<dependency>[\s\S]*?<\/dependency>/g)||[]).forEach(b=>{ const g=b.match(/<groupId>([^<]+)<\/groupId>/); const a=b.match(/<artifactId>([^<]+)<\/artifactId>/); const v=b.match(/<version>([^<]+)<\/version>/); if(g&&a) d[`${g[1]}:${a[1]}`]=v?.[1]||"latest"; }); return {dependencies:d};
  }],
  ["build.gradle", (content) => {
    const d={}; let m; const re=/(?:implementation|api|compile)\s+['"]([^:]+):([^:]+):([^'"]+)['"]/g; while((m=re.exec(content))!==null) d[`${m[1]}:${m[2]}`]=m[3]; return {dependencies:d};
  }],
]);

function _getExt(filename) {
  const p = (filename || "").split("."); return p.length > 1 ? p.pop().toLowerCase() : "";
}

function _getLangFromExt(ext) {
  const m = { js:"JavaScript",jsx:"JavaScript (React)",ts:"TypeScript",tsx:"TypeScript (React)",py:"Python",go:"Go",java:"Java",rb:"Ruby",php:"PHP",cs:"C#",rs:"Rust",swift:"Swift",kt:"Kotlin",vue:"Vue",svelte:"Svelte",html:"HTML",css:"CSS",scss:"SCSS",less:"Less",sass:"Sass",yml:"YAML",yaml:"YAML",json:"JSON",xml:"XML",md:"Markdown",sh:"Shell",bash:"Bash",sql:"SQL",tf:"Terraform",toml:"TOML",c:"C",cpp:"C++",h:"C/C++ Header" };
  return m[ext] || "Other";
}

/**
 * detectProject() — Identify project type from ZIP entries.
 * Returns { name, confidence }.
 */
function detectProject(zipEntries) {
  const fileNames = new Set(zipEntries.filter(e => !e.isDirectory).map(e => (e.name || "").toLowerCase()));
  const filePaths = new Set(zipEntries.filter(e => !e.isDirectory).map(e => (e.entryName || "").replace(/\\/g, "/").toLowerCase()));
  let best = { name: "Unknown", confidence: 0 };

  for (const fw of FRAMEWORK_SIGNATURES) {
    let score = 0;
    for (const f of fw.files) {
      if (f.includes("*")) {
        const clean = f.replace(/\*/g, "").toLowerCase();
        if (Array.from(fileNames).some(name => name.includes(clean))) score += 1;
      } else {
        const target = f.toLowerCase();
        if (fileNames.has(target) || Array.from(filePaths).some(p => p.endsWith(target) || p.endsWith("/" + target))) {
          score += 2;
        }
      }
    }
    if (fw.deps) {
      const pkgEntry = zipEntries.find(e => {
        if (e.isDirectory) return false;
        const norm = (e.entryName || "").replace(/\\/g, "/").toLowerCase();
        return norm === "package.json" || norm.endsWith("/package.json") || (e.name && e.name.toLowerCase() === "package.json");
      });
      if (pkgEntry) {
        try {
          const pkg = JSON.parse(pkgEntry.getData().toString("utf8"));
          const allDeps = { ...pkg.dependencies || {}, ...pkg.devDependencies || {} };
          for (const dep of fw.deps) {
            if (allDeps[dep]) score += 3;
          }
        } catch (_) {}
      }
    }
    if (fw.depsPattern) {
      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;
        try {
          if (fw.depsPattern.test(entry.getData().toString("utf8"))) {
            score += 3;
            break;
          }
        } catch (_) {}
      }
    }
    if (score > best.confidence) best = { name: fw.name, confidence: score };
  }

  if (best.name === "Unknown") {
    if (fileNames.has("requirements.txt") || fileNames.has("manage.py") || Array.from(filePaths).some(p => p.endsWith("requirements.txt") || p.endsWith("manage.py"))) best = { name: "Python Project", confidence: 0.5 };
    else if (fileNames.has("go.mod") || Array.from(filePaths).some(p => p.endsWith("go.mod"))) best = { name: "Go Project", confidence: 0.5 };
    else if (fileNames.has("pom.xml") || fileNames.has("build.gradle") || Array.from(filePaths).some(p => p.endsWith("pom.xml") || p.endsWith("build.gradle"))) best = { name: "Java Project", confidence: 0.5 };
    else if (Array.from(fileNames).some(n => n.endsWith(".js") || n.endsWith(".ts") || n.endsWith(".jsx") || n.endsWith(".tsx"))) best = { name: "Node.js Application", confidence: 0.4 };
  }
  return best;
}

/**
 * detectFramework() — Alias for detectProject, returns framework name string.
 */
function detectFramework(zipEntries) {
  return detectProject(zipEntries).name;
}

/**
 * detectLanguage() — Detect languages used in the project.
 * Returns { languageMap: {lang: count}, primaryLanguage: string, languageList: [string] }.
 */
function detectLanguage(zipEntries) {
  const langMap = {};
  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;
    const lang = _getLangFromExt(_getExt(entry.name));
    if (lang !== "Other") langMap[lang] = (langMap[lang] || 0) + 1;
  }
  const sorted = Object.entries(langMap).sort((a, b) => b[1] - a[1]);
  return {
    languageMap: langMap,
    primaryLanguage: sorted.length > 0 ? sorted[0][0] : "JavaScript",
    languageList: sorted.length > 0 ? sorted.map(e => e[0]) : ["JavaScript"],
  };
}

/**
 * detectBuildTool() — Detect build tool / package manager.
 * Returns string (npm, yarn, pnpm, pip, maven, gradle, cargo, go, etc.).
 */
function detectBuildTool(zipEntries) {
  const fileNames = new Set(zipEntries.filter(e => !e.isDirectory).map(e => (e.name || "").toLowerCase()));
  const filePaths = new Set(zipEntries.filter(e => !e.isDirectory).map(e => (e.entryName || "").replace(/\\/g, "/").toLowerCase()));
  const has = (fn) => fileNames.has(fn) || Array.from(filePaths).some(p => p.endsWith(fn) || p.endsWith("/" + fn));

  if (has("pnpm-lock.yaml")) return "pnpm";
  if (has("yarn.lock")) return "yarn";
  if (has("package-lock.json")) return "npm";
  if (has("package.json")) return "npm";
  if (has("Pipfile") || has("Pipfile.lock")) return "pipenv";
  if (has("requirements.txt")) return "pip";
  if (has("pom.xml")) return "maven";
  if (has("build.gradle") || has("build.gradle.kts")) return "gradle";
  if (has("Cargo.toml")) return "cargo";
  if (has("go.mod")) return "go";
  if (has("composer.json")) return "composer";
  if (has("Gemfile")) return "bundler";
  return "npm";
}

/**
 * detectDependencies() — Parse all dependency files and return structured list.
 * Returns { dependencies: [{name, version, source}], dependencyFiles: [string], scripts: {} }.
 */
function detectDependencies(zipEntries) {
  const results = { dependencies: [], dependencyFiles: [], scripts: {} };
  const processed = new Set();
  for (const [filename, parser] of DEPENDENCY_PARSERS) {
    const entry = zipEntries.find(e => {
      if (e.isDirectory) return false;
      const norm = (e.entryName || "").replace(/\\/g, "/");
      const name = norm.split("/").pop() || e.name || "";
      return name.toLowerCase() === filename.toLowerCase();
    });
    if (!entry || processed.has(filename)) continue;
    processed.add(filename);
    try {
      const content = entry.getData().toString("utf8");
      const parsed = parser(content);
      if (!parsed) continue;
      results.dependencyFiles.push((entry.entryName || "").replace(/\\/g, "/"));
      if (parsed.dependencies) {
        for (const [name, version] of Object.entries(parsed.dependencies)) {
          if (!results.dependencies.some(d => d.name === name)) {
            results.dependencies.push({ name, version: String(version), source: filename });
          }
        }
      }
      if (parsed.scripts) Object.assign(results.scripts, parsed.scripts);
    } catch (_) {}
  }
  results.dependencies.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

/**
 * detectConfigurations() — Detect configuration files in the project.
 * Returns [{ name: string, path: string }].
 */
function detectConfigurations(zipEntries) {
  const configs = [];
  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;
    const norm = (entry.entryName || "").replace(/\\/g, "/");
    const name = norm.split("/").pop() || entry.name || "";
    for (const cfg of CONFIG_FILE_PATTERNS) {
      if (cfg.pattern.test(norm) || cfg.pattern.test(name)) {
        configs.push({ name: cfg.name, path: norm });
        break;
      }
    }
  }
  const seen = new Set();
  return configs.filter(c => { if (seen.has(c.name)) return false; seen.add(c.name); return true; });
}

/**
 * detectEntryPoints() — Detect application entry points.
 * Returns [{ path: string, type: string }].
 */
function detectEntryPoints(zipEntries) {
  const entries = [];
  for (const entry of zipEntries) {
    const norm = (entry.entryName || "").replace(/\\/g, "/");
    if (entry.isDirectory) {
      if (/(?:^|\/)cmd\//i.test(norm)) entries.push({ path: norm, type: "Command Entry" });
      continue;
    }
    for (const pattern of ENTRY_POINT_PATTERNS) {
      if (pattern.test(norm)) { entries.push({ path: norm, type: "Application Entry" }); break; }
    }
  }
  return entries.slice(0, 10);
}

/**
 * detectProjectStructure() — Categorize files into architectural roles.
 * Returns { components:[], pages:[], routes:[], services:[], apis:[], models:[],
 *   controllers:[], middleware:[], utilities:[], assets:[], tests:[], config:[],
 *   hooks:[], store:[], types:[], styles:[], totalFiles, totalDirectories,
 *   sourceFileCount, testFileCount }.
 */
function detectProjectStructure(zipEntries) {
  const s = { sourceFolders:[], components:[], pages:[], routes:[], services:[], apis:[],
    models:[], controllers:[], middleware:[], utilities:[], assets:[], tests:[], config:[],
    hooks:[], store:[], types:[], styles:[], totalFiles:0, totalDirectories:0, sourceFileCount:0, testFileCount:0 };
  const categorized = new Set();
  for (const entry of zipEntries) {
    if (entry.isDirectory) { s.totalDirectories++; continue; }
    s.totalFiles++;
    const path = (entry.entryName || "").replace(/\\/g, "/");
    for (const [category, patterns] of Object.entries(STRUCTURE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(path) && !categorized.has(path)) {
          s[category].push(path);
          categorized.add(path);
          if (category === "tests") s.testFileCount++;
          else s.sourceFileCount++;
          break;
        }
      }
    }
    if (!categorized.has(path)) {
      const codeExts = new Set(["js","jsx","ts","tsx","py","go","java","rb","php","cs","rs","swift","kt","vue","svelte","c","cpp","h"]);
      if (codeExts.has(_getExt(entry.name))) s.sourceFileCount++;
    }
  }
  for (const key of Object.keys(s)) { if (Array.isArray(s[key])) s[key].sort(); }
  return s;
}

/**
 * buildDependencyGraph() — Build internal dependency graph using HashMap + BFS.
 * Returns { nodes: [string], edges: [{from, to, type}], nodeCount, edgeCount }.
 */
function buildDependencyGraph(dependencies, structure) {
  const graph = new Map();
  const edges = [];
  for (const dep of dependencies) { if (!graph.has(dep.name)) graph.set(dep.name, new Set()); }
  const structNodes = [...structure.components, ...structure.services, ...structure.apis,
    ...structure.models, ...structure.controllers, ...structure.routes,
    ...structure.middleware, ...structure.utilities, ...structure.hooks, ...structure.store, ...structure.pages];
  for (const node of structNodes) {
    const key = node.split("/").pop().replace(/\.[^/.]+$/, "");
    if (!graph.has(key)) graph.set(key, new Set());
  }
  for (const dep of dependencies) {
    const dn = dep.name.toLowerCase();
    for (const sf of structNodes) {
      const fk = sf.split("/").pop().replace(/\.[^/.]+$/, "");
      if ((dn.includes("react") && (sf.includes(".jsx") || sf.includes(".tsx"))) ||
          (dn.includes("express") && sf.includes("route"))) {
        if (!graph.has(fk)) graph.set(fk, new Set());
        graph.get(fk).add(dep.name);
        edges.push({ from: fk, to: dep.name, type: "import" });
      }
    }
  }
  return { nodes: Array.from(graph.keys()).slice(0, 50), edges: edges.slice(0, 100), nodeCount: graph.size, edgeCount: edges.length };
}

/**
 * calculateHealthScore() — Calculate project health score (0-100).
 */
function calculateHealthScore(structure, dependencies, configs, securityFindings) {
  let score = 100;
  if (structure.totalFiles === 0) score -= 20;
  if (structure.totalFiles < 5) score -= 10;
  if (structure.testFileCount === 0) score -= 10;
  if (configs.length === 0) score -= 5;
  if (securityFindings.length > 0) score -= Math.min(30, securityFindings.length * 10);
  if (dependencies.length === 0) score -= 15;
  if (dependencies.length < 3) score -= 5;
  if (structure.components.length > 0) score += 5;
  if (structure.services.length > 0) score += 5;
  if (structure.tests.length > 0) score += 5;
  if (structure.sourceFileCount > 100) score -= 10;
  return Math.max(10, Math.min(100, score));
}

/**
 * detectProjectRisks() — Generate potential risks from project analysis.
 * Returns [{ type: string, severity: string, description: string }].
 */
function detectProjectRisks(structure, configs, securityFindings) {
  const risks = [];
  if (structure.testFileCount === 0) risks.push({ type: "TESTING", severity: "MEDIUM", description: "No test files detected. Consider adding unit and integration tests." });
  const hasEnv = configs.some(c => c.name === "Environment Variables" || c.name === "Git Config");
  if (!hasEnv) risks.push({ type: "SECURITY", severity: "MEDIUM", description: "No .env or .gitignore file detected. Sensitive data may be exposed." });
  const hasCI = configs.some(c => c.name === "CI/CD Config");
  if (!hasCI) risks.push({ type: "PROCESS", severity: "LOW", description: "No CI/CD pipeline detected. Consider adding GitHub Actions or similar." });
  for (const f of securityFindings) risks.push({ type: "SECURITY", severity: f.type || "HIGH", description: f.description || f.message || "Security vulnerability detected." });
  return risks;
}

/**
 * generateTechnologyStack() — Generate technology stack summary.
 * Returns [{ category: string, name: string }].
 */
function generateTechnologyStack(framework, dependencies) {
  const stack = [{ category: "Framework", name: framework }];
  const categories = {
    Database: ["mongodb","mongoose","postgres","mysql","sqlite","prisma","redis","pg","typeorm","sequelize","sqlalchemy"],
    Authentication: ["passport","jsonwebtoken","jwt","bcrypt","auth0","next-auth","helmet","cors","session"],
    Testing: ["jest","mocha","chai","cypress","playwright","vitest","pytest","jasmine","karma"],
    "Build Tooling": ["webpack","vite","babel","typescript","esbuild","rollup","parcel","sass","less","postcss","tailwindcss","gulp","grunt"],
    "Cloud/Deployment": ["aws-sdk","@aws","azure","@google-cloud","firebase","vercel","netlify","docker","kubernetes","terraform"],
  };
  for (const [cat, keywords] of Object.entries(categories)) {
    for (const dep of dependencies) {
      if (keywords.some(kw => dep.name.toLowerCase().includes(kw))) {
        stack.push({ category: cat, name: dep.name });
        break;
      }
    }
  }
  return stack;
}

/**
 * analyzeProjectIntelligence() — Main entry point for project intelligence.
 * Runs all detection functions and returns a unified result object.
 * This enriches the analyzerService pipeline with project metadata.
 *
 * @param {Array} zipEntries - adm-zip entries array
 * @param {string} projectName
 * @returns {object} Project intelligence result
 */
function analyzeProjectIntelligence(zipEntries, projectName) {
  const fileEntries = zipEntries.filter(e => !e.isDirectory);
  const project = detectProject(zipEntries);
  const framework = project.name;
  const langResult = detectLanguage(zipEntries);
  const buildTool = detectBuildTool(zipEntries);
  const depResults = detectDependencies(zipEntries);
  const allDeps = depResults.dependencies;
  const structure = detectProjectStructure(zipEntries);
  const configs = detectConfigurations(zipEntries);
  const entryPoints = detectEntryPoints(zipEntries);
  const techStack = generateTechnologyStack(framework, allDeps);
  const depGraph = buildDependencyGraph(allDeps, structure);
  const healthScore = calculateHealthScore(structure, allDeps, configs, []);
  const risks = detectProjectRisks(structure, configs, []);

  return {
    projectName,
    framework,
    frameworkConfidence: project.confidence,
    technologyStack: techStack.map(t => `${t.category}: ${t.name}`),
    technologyStackDetailed: techStack,
    languages: langResult.languageMap,
    primaryLanguage: langResult.primaryLanguage,
    languageList: langResult.languageList,
    buildTool,
    dependencies: allDeps.map(d => d.name),
    dependencyDetails: allDeps,
    dependencyFiles: depResults.dependencyFiles,
    scripts: depResults.scripts,
    configuration: configs,
    configurationSummary: configs.map(c => c.name).join(", "),
    structure,
    architecture: `Source: ${structure.sourceFileCount} files | Components: ${structure.components.length} | Pages: ${structure.pages.length} | Routes: ${structure.routes.length} | Services: ${structure.services.length} | Tests: ${structure.testFileCount}`,
    totalFiles: structure.totalFiles,
    sourceFileCount: structure.sourceFileCount,
    testFileCount: structure.testFileCount,
    entryPoints: entryPoints.map(e => e.path),
    dependencyGraph: depGraph,
    healthScore,
    risks,
    riskSummary: risks.map(r => `[${r.severity}] ${r.description}`),
    summary: `Project: ${projectName} | Framework: ${framework} | Dependencies: ${allDeps.length} | Source: ${structure.sourceFileCount} files | Health: ${healthScore}/100`,
    folderStructure: fileEntries.map(e => e.entryName).slice(0, 100),
  };
}

module.exports = {
    upsertProjectKnowledge,
    getLatestProjectKnowledge,
    // Project Intelligence exports
    detectProject,
    detectFramework,
    detectLanguage,
    detectBuildTool,
    detectDependencies,
    detectConfigurations,
    detectEntryPoints,
    detectProjectStructure,
    buildDependencyGraph,
    calculateHealthScore,
    detectProjectRisks,
    generateTechnologyStack,
    analyzeProjectIntelligence,
};
