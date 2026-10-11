const mongoose = require("mongoose");

const projectKnowledgeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    projectName: {
        type: String,
        default: ""
    },
    projectType: {
        type: String,
        default: ""
    },
    totalFiles: {
        type: Number,
        default: 0
    },
    sourceFiles: {
        type: Number,
        default: 0
    },
    configFiles: {
        type: Number,
        default: 0
    },
    sdkDetails: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    repository: {
        type: String,
        default: ""
    },
    framework: {
        type: String,
        default: "Unknown"
    },
    language: {
        type: [String],
        default: []
    },
    runtime: {
        type: String,
        default: "Unknown"
    },
    packageManager: {
        type: String,
        default: "Unknown"
    },
    dependencies: {
        type: [String],
        default: []
    },
    routes: {
        type: [String],
        default: []
    },
    controllers: {
        type: [String],
        default: []
    },
    services: {
        type: [String],
        default: []
    },
    models: {
        type: [String],
        default: []
    },
    components: {
        type: [String],
        default: []
    },
    architecture: {
        type: String,
        default: ""
    },
    dependencyGraph: {
        type: [String],
        default: []
    },
    callGraph: {
        type: [String],
        default: []
    },
    routeGraph: {
        type: [String],
        default: []
    },
    controllerGraph: {
        type: [String],
        default: []
    },
    serviceGraph: {
        type: [String],
        default: []
    },
    modelGraph: {
        type: [String],
        default: []
    },
    componentGraph: {
        type: [String],
        default: []
    },
    configuration: {
        type: [String],
        default: []
    },
    configurationSummary: {
        type: String,
        default: ""
    },
    environment: {
        type: [String],
        default: []
    },
    environmentSummary: {
        type: String,
        default: ""
    },
    database: {
        type: [String],
        default: []
    },
    schemaSummary: {
        type: String,
        default: ""
    },
    authentication: {
        type: [String],
        default: []
    },
    authenticationSummary: {
        type: String,
        default: ""
    },
    docker: {
        type: Boolean,
        default: false
    },
    cicd: {
        type: [String],
        default: []
    },
    buildTools: {
        type: [String],
        default: []
    },
    technologyStack: {
        type: [String],
        default: []
    },
    cloudProvider: {
        type: String,
        default: "Unknown"
    },
    apiEndpoints: {
        type: [String],
        default: []
    },
    folderStructure: {
        type: [String],
        default: []
    },
    historicalReports: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    summary: {
        type: String,
        default: ""
    },
    sdkSummary: {
        type: String,
        default: ""
    },
    projectComplexity: {
        type: String,
        default: "Unknown"
    },
    technicalDebt: {
        type: String,
        default: "Unknown"
    },
    securityScore: {
        type: Number,
        default: null
    },
    performanceScore: {
        type: Number,
        default: null
    },
    source: {
        type: String,
        enum: ["project", "sdk", "ocr", "telemetry"],
        default: "project"
    },
    lastAnalysisReportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ErrorReport"
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

projectKnowledgeSchema.index({ userId: 1, projectName: 1 }, { unique: false });

module.exports = mongoose.model("ProjectKnowledge", projectKnowledgeSchema);