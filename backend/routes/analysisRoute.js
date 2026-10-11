const express = require("express");
const router = express.Router();
const multer = require("multer");

const auth = require("../middleware/authMiddleware");
const {
  analyzeFile,
  analyzeProject
} = require("../controllers/analysisController");
const {
  analyzeError
} = require("../controllers/errorController");

// Configure Multer for in-memory uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  }
});

// Route for file analysis - accepts either 'codefile' multipart file upload OR body payload
router.post(
  "/file",
  auth,
  upload.single("codefile"),
  analyzeFile
);

// Route for project analysis - accepts 'projectfile' ZIP archive upload OR body payload
router.post(
  "/project",
  auth,
  upload.single("projectfile"),
  analyzeProject
);

router.post(
  "/root-cause",
  auth,
  (req, res, next) => {
    if (!req.body.error) {
      req.body.error = req.body.rawError || req.body.text || req.body.message || "";
    }

    if (!req.body.source) {
      req.body.source = "manual";
    }

    next();
  },
  analyzeError
);

module.exports = router;