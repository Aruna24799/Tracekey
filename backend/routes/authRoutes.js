const express = require("express");
const router = express.Router();

const {
  register,
  login,
  verify,
  logout,
  getSessions,
  revokeSession,

  getSettings,
  saveSettings,
  generateApiKey,
  revokeApiKey,
  addTeamMember,
  removeTeamMember,
  testAiConnection
} = require("../controllers/authController");

const auth =
  require("../middleware/authMiddleware");

router.post("/register", register);

router.post("/login", login);

router.get(
  "/verify",
  auth,
  verify
);

router.post(
  "/logout",
  auth,
  logout
);

router.get(
  "/sessions",
  auth,
  getSessions
);

router.delete(
  "/sessions/:sessionId",
  auth,
  revokeSession
);

router.get(
  "/settings",
  auth,
  getSettings
);

router.post(
  "/settings",
  auth,
  saveSettings
);

router.post(
  "/settings/apikey",
  auth,
  generateApiKey
);

router.delete(
  "/settings/apikey/:key",
  auth,
  revokeApiKey
);

router.post(
  "/settings/team",
  auth,
  addTeamMember
);

router.delete(
  "/settings/team/:email",
  auth,
  removeTeamMember
);

router.post(
  "/settings/ai/test",
  auth,
  testAiConnection
);

module.exports = router;