const express = require("express");
const router = express.Router();
const { register, login, verify, logout, getSessions, revokeSession } = require("../controllers/authController");
const auth = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/verify", auth, verify);
router.post("/logout", auth, logout);
router.get("/sessions", auth, getSessions);
router.delete("/sessions/:sessionId", auth, revokeSession);

module.exports = router;
