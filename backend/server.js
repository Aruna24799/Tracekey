// backend/server.js

const path = require("path");
const dotenv = require("dotenv");

// Load .env from tracekey2 root (same level as backend/ and frontend/)
const envPath = path.join(__dirname, "..", ".env");
const dotenvResult = dotenv.config({ path: envPath });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const User = require("./models/User");

const app = express();

/*
|--------------------------------------------------------------------------
| PROCESS HANDLERS
|--------------------------------------------------------------------------
*/

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

/*
|--------------------------------------------------------------------------
| ENV VALIDATION
|--------------------------------------------------------------------------
*/

if (dotenvResult.error) {
  console.warn(
    `⚠️ Failed to load .env from ${envPath}`,
    dotenvResult.error.message
  );
}

if (!process.env.MONGO_URI) {
  console.warn("⚠️ MONGO_URI missing");
}

if (!process.env.PORT) {
  console.warn("⚠️ PORT missing, defaulting to 5000");
}

/*
|--------------------------------------------------------------------------
| MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.use(cors());

require("./config/security")(app);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

/*
|--------------------------------------------------------------------------
| STATIC FILES
|--------------------------------------------------------------------------
*/

app.use(express.static(path.join(__dirname, "../frontend")));

/*
|--------------------------------------------------------------------------
| DATABASE CHECK
|--------------------------------------------------------------------------
*/

const dbCheckMiddleware = (req, res, next) => {
  const state = mongoose.connection.readyState;

  if (state !== 1) {
    return res.status(503).json({
      success: false,
      message:
        "Database connection unavailable. Verify MongoDB connection and Atlas whitelist."
    });
  }

  next();
};

/*
|--------------------------------------------------------------------------
| CORE ROUTES
|--------------------------------------------------------------------------
*/

app.use("/api/auth", dbCheckMiddleware, require("./routes/authRoutes"));
app.use("/api/errors", dbCheckMiddleware, require("./routes/errorRoutes"));
app.use("/api/logs", dbCheckMiddleware, require("./routes/logRoutes"));
app.use("/api/security", dbCheckMiddleware, require("./routes/securityRoutes"));
app.use("/api/ocr", dbCheckMiddleware, require("./routes/ocrRoutes"));
app.use("/api/predictive", dbCheckMiddleware, require("./routes/predictiveRoutes"));
app.use("/api/knowledge", dbCheckMiddleware, require("./routes/knowledgeRoutes"));
app.use("/api/health", dbCheckMiddleware, require("./routes/healthRoutes"));
app.use("/api/sdk", dbCheckMiddleware, require("./routes/telemetryRoutes"));
app.use("/api/runtime", dbCheckMiddleware, require("./routes/telemetryRoutes"));
app.use("/api/forensics", dbCheckMiddleware, require("./routes/telemetryRoutes"));

/*
|--------------------------------------------------------------------------
| TELEMETRY ROUTES
|--------------------------------------------------------------------------
*/

try {
  app.use(
    "/api/telemetry",
    dbCheckMiddleware,
    require("./routes/telemetryRoutes")
  );

  console.log("✅ Telemetry routes loaded");
} catch (err) {
  console.error(
    "❌ Telemetry route load failed:",
    err.message
  );
}

/*
|--------------------------------------------------------------------------
| ANALYSIS ROUTES
|--------------------------------------------------------------------------
*/

try {
  app.use(
    "/api/analysis",
    dbCheckMiddleware,
    require("./routes/analysisRoute")
  );

  console.log("✅ Analysis routes loaded");
} catch (err) {
  console.error(
    "❌ Analysis route load failed:",
    err.message
  );
}

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected"
  });
});

/*
|--------------------------------------------------------------------------
| DATABASE TEST
|--------------------------------------------------------------------------
*/

app.get("/db-test", dbCheckMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({});

    res.json({
      success: true,
      message: "Database query successful",
      userFound: !!user,
      user: user
        ? {
          id: user._id,
          name: user.name,
          email: user.email
        }
        : null
    });
  } catch (error) {
    console.error("DB TEST ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Database query failed",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| API 404 HANDLER
|--------------------------------------------------------------------------
*/

app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api")) {
    return res.status(404).json({
      success: false,
      message: "API route not found",
      path: req.originalUrl,
      method: req.method
    });
  }

  next();
});

/*
|--------------------------------------------------------------------------
| GLOBAL ERROR HANDLER
|--------------------------------------------------------------------------
*/

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(
    `[ERROR] ${req.method} ${req.originalUrl}`,
    err
  );

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development"
      ? { stack: err.stack }
      : {})
  });
});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const startServer = async () => {
  try {
    console.log("🚀 Connecting MongoDB...");

    await connectDB();

    console.log(
      `✅ MongoDB ReadyState: ${mongoose.connection.readyState}`
    );
  } catch (error) {
    console.error(
      "⚠️ MongoDB connection warning:",
      error.message
    );
  }

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(
      `🚀 Server running on http://localhost:${PORT}`
    );
  });
};

startServer();