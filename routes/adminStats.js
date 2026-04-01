const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SubjectQuestion = require('../models/SubjectQuestion');
const SubjectAttempt = require('../models/SubjectAttempt');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const { auth, admin } = require('../middleware/auth');

// GET /admin/dashboard/stats
router.get('/dashboard/stats', [auth, admin], async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalQuestions = await SubjectQuestion.countDocuments();
    const subjectAttemptsCount = await SubjectAttempt.countDocuments();
    const quizAttemptsCount = await QuizAttempt.countDocuments();
    const totalAttempts = subjectAttemptsCount + quizAttemptsCount;
    const totalQuizzes = await Quiz.countDocuments();

    res.json({
      totalStudents,
      totalQuestions,
      totalAttempts,
      totalQuizzes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/subjects/stats
router.get('/subjects/stats', [auth, admin], async (req, res) => {
  try {
    const subjects = ['C', 'Python', 'Java'];
    const stats = await Promise.all(subjects.map(async (subj) => {
      const qCount = await SubjectQuestion.countDocuments({ subject: subj });
      const banks = await SubjectQuestion.distinct('bank', { subject: subj });
      const attemptsCount = await SubjectAttempt.countDocuments({ subject: subj });
      
      return {
        subject: subj,
        totalQuestions: qCount,
        banksCount: banks.length,
        banks: banks,
        attemptsCount
      };
    }));
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/students/results
router.get('/students/results', [auth, admin], async (req, res) => {
  try {
    const attempts = await SubjectAttempt.find()
      .populate('userId', 'displayName email')
      .sort({ completedAt: 1 });

    const studentMap = {};

    for (const attempt of attempts) {
      if (!attempt.userId) continue;
      
      const studentId = attempt.userId._id.toString();
      const subject = attempt.subject;
      const key = `${studentId}_${subject}`;

      if (!studentMap[key]) {
        studentMap[key] = {
          studentName: attempt.userId.displayName,
          studentEmail: attempt.userId.email,
          subject: subject,
          numberOfAttempts: 0,
          highestScore: 0,
          latestScore: 0,
          latestTotal: 0,
          highestTotal: 0,
          lastAttemptDate: null
        };
      }

      const p = studentMap[key];
      p.numberOfAttempts += 1;
      p.latestScore = attempt.score;
      p.latestTotal = attempt.total;
      p.lastAttemptDate = attempt.completedAt;

      const currentScorePercentage = (attempt.score / attempt.total) * 100;
      const highestScorePercentage = p.highestTotal > 0 ? (p.highestScore / p.highestTotal) * 100 : -1;

      if (currentScorePercentage > highestScorePercentage) {
         p.highestScore = attempt.score;
         p.highestTotal = attempt.total;
      }
    }

    const results = Object.values(studentMap).sort((a, b) => new Date(b.lastAttemptDate) - new Date(a.lastAttemptDate));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
