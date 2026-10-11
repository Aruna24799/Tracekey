const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["developer", "ops", "admin"],
    default: "developer"
  },
  settings: {
    theme: {
      type: String,
      default: "dark"
    },
    notifications: {
      type: Boolean,
      default: true
    },
    aiProvider: {
      type: String,
      default: "huggingface"
    },
    hfApiKey: {
      type: String,
      default: ""
    },
    apiKeys: [{
      name: String,
      key: String,
      createdAt: { type: Date, default: Date.now }
    }],
    teamMembers: [{
      name: String,
      email: String,
      role: { type: String, enum: ["developer", "ops", "admin", "qa", "manager"], default: "developer" }
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);
