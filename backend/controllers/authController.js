const User = require("../models/User");
const LoginLog = require("../models/LoginLog");
const Session = require("../models/Session");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateAIExplanation } = require("../services/aiExplanationService");

// REGISTER
exports.register = async (req, res) => {
  console.log(`[ROUTE HIT] POST /api/auth/register | Mongoose ReadyState: ${require("mongoose").connection.readyState}`);
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      message: "Account created successfully",
      userId: user._id
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  console.log(`[ROUTE HIT] POST /api/auth/login | Email: ${req.body?.email} | Mongoose ReadyState: ${require("mongoose").connection.readyState}`);
  try {
    const { email, password, fingerprint } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Log failed attempt
      await LoginLog.create({
        userId: user._id,
        ipAddress: req.ip || req.connection.remoteAddress,
        loginStatus: "failed",
        browser: fingerprint?.browser,
        os: fingerprint?.os,
        fingerprintHash: fingerprint?.hash
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate Token (1h expiry)
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Create Login Log
    await LoginLog.create({
      userId: user._id,
      ipAddress: req.ip || req.connection.remoteAddress,
      browser: fingerprint?.browser,
      os: fingerprint?.os,
      platform: fingerprint?.platform,
      fingerprintHash: fingerprint?.hash,
      timezone: fingerprint?.timezone,
      loginStatus: "success"
    });

    // Create Active Session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await Session.create({
      userId: user._id,
      token: token,
      device: {
        browser: fingerprint?.browser,
        os: fingerprint?.os,
        platform: fingerprint?.platform,
        fingerprintHash: fingerprint?.hash
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      expiresAt: expiresAt
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// VERIFY TOKEN
exports.verify = async (req, res) => {
  console.log(`[ROUTE HIT] GET /api/auth/verify | User ID: ${req.user?.id} | Mongoose ReadyState: ${require("mongoose").connection.readyState}`);
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ valid: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGOUT
exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      await Session.findOneAndUpdate({ token }, { active: false });
    }
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ACTIVE SESSIONS
exports.getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      userId: req.user.id,
      active: true,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// REVOKE SESSION
exports.revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOneAndUpdate(
      { _id: sessionId, userId: req.user.id },
      { active: false },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found or already revoked" });
    }

    res.json({ message: "Session revoked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const crypto = require("crypto");

exports.getSettings = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.user.id
      ).select(
        "name email settings"
      );

    res.json({
      name: user?.name || "",
      email: user?.email || "",
      settings:
        user?.settings || {}
    });
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};

exports.saveSettings = async (
  req,
  res
) => {
  try {
    const {
      theme,
      notifications,
      aiProvider,
      hfApiKey,
      name,
      email,
      password
    } = req.body;

    const user =
      await User.findById(
        req.user.id
      );

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && String(existingUser._id) !== String(user._id)) {
        return res.status(409).json({
          message: "Email is already in use by another account"
        });
      }
      user.email = email;
    }

    if (typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    if (typeof password === "string" && password.trim()) {
      const bcrypt = require("bcryptjs");
      user.password = await bcrypt.hash(password, 12);
    }

    if (!user.settings) {
      user.settings = {};
    }

    if (theme) {
      user.settings.theme =
        theme;
    }

    if (
      typeof notifications ===
      "boolean"
    ) {
      user.settings.notifications =
        notifications;
    }

    if (aiProvider) {
      user.settings.aiProvider =
        aiProvider;
    }

    if (typeof hfApiKey === "string") {
      user.settings.hfApiKey =
        hfApiKey;
    }

    await user.save();

    res.json({
      success: true,
      settings:
        user.settings
    });
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};

exports.generateApiKey =
  async (req, res) => {
    try {
      const {
        name =
        "Default Key"
      } = req.body;

      const apiKey =
        crypto.randomBytes(32)
          .toString("hex");

      const user =
        await User.findById(
          req.user.id
        );

      user.settings.apiKeys.push(
        {
          name,
          key: apiKey
        }
      );

      await user.save();

      res.json({
        success: true,
        apiKey
      });
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };

exports.revokeApiKey =
  async (req, res) => {
    try {
      const { key } =
        req.params;

      const user =
        await User.findById(
          req.user.id
        );

      user.settings.apiKeys =
        user.settings.apiKeys.filter(
          k =>
            k.key !== key
        );

      await user.save();

      res.json({
        success: true
      });
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };

exports.addTeamMember =
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user.id
        );

      user.settings.teamMembers.push(
        req.body
      );

      await user.save();

      res.json({
        success: true
      });
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };

exports.removeTeamMember =
  async (req, res) => {
    try {
      const {
        email
      } = req.params;

      const user =
        await User.findById(
          req.user.id
        );

      user.settings.teamMembers =
        user.settings.teamMembers.filter(
          m =>
            m.email !== email
        );

      await user.save();

      res.json({
        success: true
      });
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };

exports.testAiConnection = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("settings");
    const apiKey = user?.settings?.hfApiKey || process.env.HF_API_KEY || "";

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        connected: false,
        provider: user?.settings?.aiProvider || "huggingface",
        message: "No Hugging Face API key configured"
      });
    }

    const result = await generateAIExplanation(
      "TraceKey AI connection test.",
      "UNKNOWN_ERROR",
      apiKey
    );

    const connected = result?.provider === "Hugging Face";

    res.json({
      success: true,
      connected,
      provider: result?.provider || "explainService (Offline Fallback)",
      message: connected
        ? "Hugging Face connection verified"
        : "Hugging Face unavailable, offline fallback in use"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      connected: false,
      message: error.message
    });
  }
};