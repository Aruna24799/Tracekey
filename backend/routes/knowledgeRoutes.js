const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const {
    getCurrentProjectKnowledge
} = require("../controllers/projectKnowledgeController");

router.get("/current", auth, getCurrentProjectKnowledge);

module.exports = router;