const LoginLog = require("../models/LoginLog");

exports.getRecentLogs = async (req, res) => {
  try {
    const logs = await LoginLog.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
