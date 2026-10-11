const jwt = require("jsonwebtoken");
const Session = require("../models/Session");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    /*
     * API KEY AUTH
     */
    const apiKey =
      req.headers["x-api-key"] ||
      req.query.apiKey;

    if (apiKey) {
      const user = await User.findOne({
        "settings.apiKeys.key": apiKey
      });

      if (user) {
        req.user = {
          id: user._id,
          role: user.role,
          name: user.name,
          authType: "apikey"
        };

        return next();
      }
    }

    /*
     * JWT AUTH
     */
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message:
          "Access denied. No token provided."
      });
    }

    const token =
      authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const session =
      await Session.findOne({
        token,
        active: true,
        expiresAt: { $gt: new Date() }
      });

    if (!session) {
      return res.status(401).json({
        success: false,
        message:
          "Session expired or revoked."
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token."
    });
  }
};