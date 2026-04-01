const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const { auth, admin } = require('../middleware/auth');

// Get all published quizzes
router.get('/', auth, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { isPublished: true };
    const quizzes = await Quiz.find(filter).populate('createdBy', 'displayName');
    res.json(quizzes);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Admin: Create quiz
router.post('/', [auth, admin], async (req, res) => {
  try {
    const quiz = new Quiz({
      ...req.body,
      createdBy: req.user._id,
    });
    await quiz.save();
    res.json(quiz);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Admin: Update quiz
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(quiz);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Admin: Delete quiz
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    await Quiz.findByIdAndDelete(req.params.id);
    await Question.deleteMany({ quizId: req.params.id });
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Admin: Get specific quiz (even unpublished)
router.get('/:id', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).send('Quiz not found');
    if (req.user.role !== 'admin' && !quiz.isPublished) return res.status(403).send('Forbidden');
    res.json(quiz);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Get questions for a quiz
router.get('/:id/questions', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).send('Quiz not found');
    if (req.user.role !== 'admin' && !quiz.isPublished) return res.status(403).send('Forbidden');

    const questions = await Question.find({ quizId: req.params.id }).sort('sortOrder');
    res.json(questions);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Admin: Create question
router.post('/:id/questions', [auth, admin], async (req, res) => {
  try {
    const question = new Question({
      ...req.body,
      quizId: req.params.id,
    });
    await question.save();
    res.json(question);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Admin: Update question
router.put('/:id/questions/:questionId', [auth, admin], async (req, res) => {
    try {
        const question = await Question.findOneAndUpdate(
            { _id: req.params.questionId, quizId: req.params.id },
            req.body,
            { new: true }
        );
        res.json(question);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Admin: Delete question
router.delete('/:id/questions/:questionId', [auth, admin], async (req, res) => {
    try {
        await Question.findOneAndDelete({ _id: req.params.questionId, quizId: req.params.id });
        res.json({ message: "Question deleted" });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;
