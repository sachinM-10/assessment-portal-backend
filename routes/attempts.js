const express = require('express');
const router = express.Router();
const QuizAttempt = require('../models/QuizAttempt');
const SubjectAttempt = require('../models/SubjectAttempt');
const { auth } = require('../middleware/auth');

// Make a new quiz attempt
router.post('/', auth, async (req, res) => {
  try {
    const attempt = new QuizAttempt({
      ...req.body,
      userId: req.user._id,
    });
    await attempt.save();
    res.json(attempt);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Update an attempt
router.put('/:id', auth, async (req, res) => {
  try {
    const attempt = await QuizAttempt.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    res.json(attempt);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Get all attempts for user
router.get('/', auth, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
    const quizAttempts = await QuizAttempt.find(filter)
        .populate('quizId', 'title category')
        .populate('userId', 'displayName email')
        .sort('-startedAt')
        .lean();

    const subjectAttempts = await SubjectAttempt.find(filter)
        .populate('userId', 'displayName email')
        .sort('-completedAt')
        .lean();

    const mappedSubjectAttempts = subjectAttempts.map(sa => ({
        ...sa,
        percentage: sa.total > 0 ? (sa.score / sa.total) * 100 : 0,
        totalPoints: sa.total,
        startedAt: sa.completedAt,
        quizId: { title: sa.subject + " Quiz", category: "Subject" }
    }));

    const allAttempts = [...quizAttempts, ...mappedSubjectAttempts].sort((a, b) => {
        const dateA = new Date(a.completedAt || a.startedAt || 0);
        const dateB = new Date(b.completedAt || b.startedAt || 0);
        return dateB - dateA;
    });

    res.json(allAttempts);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

module.exports = router;
