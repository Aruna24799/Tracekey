const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ MongoDB Error: MONGO_URI is not defined in the environment variables.");
      return;
    }
    
    // Set global bufferCommands to false to fail fast globally
    mongoose.set("bufferCommands", false);
    console.log("📡 [DB Connect] Mongoose bufferCommands set to false. Initiating connection...");

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of default 30s
      bufferCommands: false // Disable buffering globally on this connection
    });
    console.log(`✅ MongoDB Connected. ReadyState: ${mongoose.connection.readyState}`);
  } catch (error) {
    console.error("❌ MongoDB Error:", error.message);
    console.log(`ℹ️ Server running with fallback. ReadyState: ${mongoose.connection.readyState}`);
    // Propagate the error to allow the caller to handle failure
    throw error;
  }
};

module.exports = connectDB;
