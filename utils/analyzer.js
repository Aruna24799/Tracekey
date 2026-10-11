function analyzeError(errorText) {

    errorText = errorText.toLowerCase();

    let result = {
        type: "Unknown",
        layer: "Unknown",
        explanation: "",
        fix: [],
        rootCauses: [],
        location: {},
    };

    // 🔴 403 ERROR
    if (errorText.includes("403") || errorText.includes("cors")) {

        result.type = "Forbidden / CORS Error";
        result.layer = "Backend / Network";

        result.explanation = "Request blocked due to CORS or authentication issue";

        result.fix = [
            "Enable CORS in backend",
            "Check API permissions",
            "Allow frontend origin"
        ];

        result.rootCauses = [
            "CORS not enabled",
            "Blocked origin",
            "Missing authentication"
        ];

        result.location = {
            file: "server.js",
            function: "app.use(cors())",
            line: "Middleware"
        };
    }

    // 🔴 500 ERROR
    else if (errorText.includes("500")) {

        result.type = "Internal Server Error";
        result.layer = "Backend";

        result.explanation = "Server crashed while processing request";

        result.fix = [
            "Check backend logs",
            "Fix server logic",
            "Check database connection"
        ];

        result.rootCauses = [
            "Unhandled exception",
            "Database failure",
            "Server crash"
        ];

        result.location = {
            file: "server.js",
            function: "API handler",
            line: "Unknown"
        };
    }

    // 🔴 404 ERROR
    else if (errorText.includes("404")) {

        result.type = "Not Found";
        result.layer = "Routing";

        result.explanation = "Requested resource not found";

        result.fix = [
            "Check URL",
            "Verify route exists"
        ];

        result.rootCauses = [
            "Wrong endpoint",
            "Route not defined"
        ];

        result.location = {
            file: "routes.js",
            function: "router.get()",
            line: "Unknown"
        };
    }

    return result;
}

module.exports = analyzeError;