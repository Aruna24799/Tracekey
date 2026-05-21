const mongoose = require("mongoose");

const loginLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  ipAddress: String,
  browser: String,
  os: String,
  platform: String,
  fingerprintHash: String,
  timezone: String,
  loginStatus: {
    type: String,
    enum: ["success", "failed"],
    default: "success"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("LoginLog", loginLogSchema);
