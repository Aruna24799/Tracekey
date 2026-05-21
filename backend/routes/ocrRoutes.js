const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const { analyzeFromImage } = require("../controllers/ocrController");

// Memory storage — no disk writes, buffer passed directly to Tesseract
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are accepted"), false);
    }
    cb(null, true);
  }
});

// POST /api/ocr/analyze — upload screenshot → OCR → analysis
router.post("/analyze", auth, upload.single("image"), analyzeFromImage);

module.exports = router;
