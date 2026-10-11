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

const acceptOcrUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "screenshot", maxCount: 1 }
]);

const normalizeOcrFile = (req, res, next) => {
  const uploadedFiles = req.files || {};

  req.file =
    (uploadedFiles.image && uploadedFiles.image[0]) ||
    (uploadedFiles.screenshot && uploadedFiles.screenshot[0]) ||
    req.file ||
    null;

  next();
};

// Support both the current React contract and the legacy dashboard contract.
router.post("/extract", auth, acceptOcrUpload, normalizeOcrFile, analyzeFromImage);
router.post("/analyze", auth, acceptOcrUpload, normalizeOcrFile, analyzeFromImage);

module.exports = router;
