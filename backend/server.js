const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const User = require("./models/User");

// Handle global exceptions and promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// Load and verify environment variables safely
const envPath = path.join(__dirname, "../.env");
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error) {
  console.warn("⚠️ Warning: Failed to load .env file from " + envPath + ". Using default environment values.", dotenvResult.error.message);
} else {
  if (!process.env.MONGO_URI) {
    console.warn("⚠️ Warning: MONGO_URI is missing in the loaded .env file.");
  }
  if (!process.env.PORT) {
    console.warn("⚠️ Warning: PORT is missing in the loaded .env file. Falling back to port 5000.");
  }
}

const app = express();

app.use(cors());
app.use(express.json());

// Database connection check middleware to fail fast with friendly message when offline
const mongoose = require("mongoose");
const dbCheckMiddleware = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Database connection is currently unavailable. One common reason is that your IP address is not whitelisted on MongoDB Atlas. Please ensure your current IP is whitelisted at https://cloud.mongodb.com."
    });
  }
  next();
};

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// Routes
app.use("/api", dbCheckMiddleware);
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/errors", require("./routes/errorRoutes"));
app.use("/api/logs", require("./routes/logRoutes"));
app.use("/api/security", require("./routes/securityRoutes"));
app.use("/api/ocr", require("./routes/ocrRoutes"));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// DB Test endpoint to verify model query execution
app.get("/db-test", async (req, res, next) => {
  try {
    console.log("🔍 [DB Test] Running active User.findOne query...");
    const user = await User.findOne({});
    console.log("✅ [DB Test] Query executed successfully. Result:", user ? "User found" : "No users in collection");
    res.json({
      success: true,
      message: "Database query executed successfully.",
      userFound: !!user,
      user: user ? { id: user._id, name: user.name, email: user.email } : null
    });
  } catch (error) {
    console.error("❌ [DB Test] Mongoose query failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Database query failed.",
      error: error.message
    });
  }
});

// Global error handler — must be last middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path} ->`, err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

// Sequentialize backend startup
const startServer = async () => {
  await connectDB();
  
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();
