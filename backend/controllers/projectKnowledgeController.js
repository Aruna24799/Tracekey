const {
    getLatestProjectKnowledge
} = require("../services/projectKnowledgeService");

exports.getCurrentProjectKnowledge = async (req, res) => {
    try {
        const knowledge = await getLatestProjectKnowledge(req.user.id);

        res.json({
            success: true,
            knowledge: knowledge || null
        });
    } catch (error) {
        console.error("Project knowledge lookup failed:", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};