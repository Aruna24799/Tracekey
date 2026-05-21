const { createWorker } = require("tesseract.js");
const analyzerService = require("../services/analyzerService");
const ErrorReport = require("../models/ErrorReport");

exports.analyzeFromImage = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file uploaded" });
  }

  let worker;
  try {
    // Initialize Tesseract worker
    worker = await createWorker("eng");

    // OCR — recognise text from the uploaded buffer
    const { data: { text } } = await worker.recognize(req.file.buffer);
    await worker.terminate();

    const extracted = text.trim();
    if (!extracted || extracted.length < 5) {
      return res.status(422).json({
        message: "Could not extract readable text from image. Try a clearer screenshot."
      });
    }

    // Pipe extracted text through the existing analyzer pipeline
    const result = await analyzerService(extracted);

    // Persist to ErrorReport (same schema as manual analysis)
    const report = await ErrorReport.create({
      userId: req.user.id,
      rawError: extracted,
      category: result.category,
      fingerprint: result.fingerprint.code,
      security: result.security.threats.map(t => t.message),
      rootCause: result.rootCause,
      fix: result.fix,
      prevention: result.prevention,
      debugSteps: result.debugSteps,
      severity: result.severity,
      source: "ocr"
    });

    res.json({
      extractedText: extracted,
      ...result,
      reportId: report._id
    });

  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch (_) {}
    }
    next(err); // Passes to global error handler in server.js
  }
};
