// tracekey2/backend/controllers/predictiveController.js
const generatePredictions = require("../services/predictiveEngine");

/**
 * GET /api/predictive/analysis
 * Generates structured, deterministic, and explainable predictions for the logged-in user.
 */
exports.getAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is missing from active request headers."
      });
    }

    const result = await generatePredictions(userId);

    res.json({
      success: true,
      analysis: result
    });
  } catch (error) {
    console.error("🚨 [Predictive Controller Exception]:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal prediction analytics failure. Engine remains offline.",
      error: error.message
    });
  }
};
