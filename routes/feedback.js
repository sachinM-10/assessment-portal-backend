const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { auth, student, admin } = require('../middleware/auth');

// POST /api/feedback - Submit feedback after exam
router.post('/', [auth, student], async (req, res) => {
    try {
        const { attemptId, subject, ratingDifficulty, ratingQuality, suggestionText, reportedQuestionId, reportText } = req.body;
        
        const feedback = new Feedback({
            userId: req.user._id,
            attemptId,
            subject,
            ratingDifficulty,
            ratingQuality,
            suggestionText,
            reportedQuestionId: reportedQuestionId || null,
            reportText
        });
        
        await feedback.save();
        res.status(201).json({ message: 'Feedback submitted successfully', feedback });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/feedback - Get all feedback for admin
router.get('/', [auth, admin], async (req, res) => {
    try {
        const feedbackList = await Feedback.find()
            .populate('userId', 'name email username')
            .populate('reportedQuestionId', 'question')
            .populate('attemptId')
            .sort({ createdAt: -1 });
        res.json(feedbackList);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
