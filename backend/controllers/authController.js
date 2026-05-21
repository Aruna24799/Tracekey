const User = require("../models/User");
const LoginLog = require("../models/LoginLog");
const Session = require("../models/Session");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER
exports.register = async (req, res) => {
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
