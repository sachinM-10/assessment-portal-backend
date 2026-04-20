const express = require('express');
const router = express.Router();
const SubjectQuestion = require('../models/SubjectQuestion');
const SubjectAttempt = require('../models/SubjectAttempt');
const { auth, admin, student } = require('../middleware/auth');

// Seed example questions if none exist
router.post('/seed', async (req, res) => {
    try {
        const count = await SubjectQuestion.countDocuments();
        if (count > 0) return res.json({ message: 'Questions already seeded' });

        const seedData = [
            { subject: 'C', bank: 1, question: 'Which operator is used to allocate memory dynamically in C?', options: ['malloc', 'alloc', 'new', 'create'], correctAnswer: 'malloc' },
            { subject: 'C', bank: 2, question: 'What is the size of an int data type in C (typically on 32-bit system)?', options: ['2 bytes', '4 bytes', '8 bytes', '1 byte'], correctAnswer: '4 bytes' },
            { subject: 'C', bank: 3, question: 'Which header file is used for input and output operations in C?', options: ['<stdio.h>', '<stdlib.h>', '<conio.h>', '<math.h>'], correctAnswer: '<stdio.h>' },
            { subject: 'Python', bank: 1, question: 'Which keyword is used to define a function in Python?', options: ['function', 'def', 'fun', 'define'], correctAnswer: 'def' },
            { subject: 'Python', bank: 2, question: 'What is the output of 2 ** 3 in Python?', options: ['6', '8', '9', '5'], correctAnswer: '8' },
            { subject: 'Python', bank: 3, question: 'Which collection is ordered, changeable, and allows duplicate members in Python?', options: ['List', 'Tuple', 'Set', 'Dictionary'], correctAnswer: 'List' },
            { subject: 'Java', bank: 1, question: 'Which of the following is not a primitive data type in Java?', options: ['int', 'float', 'String', 'boolean'], correctAnswer: 'String' },
            { subject: 'Java', bank: 2, question: 'What is the root class of all classes in Java?', options: ['Object', 'Class', 'Main', 'Root'], correctAnswer: 'Object' },
            { subject: 'Java', bank: 3, question: 'Which keyword is used to inherit a class in Java?', options: ['implement', 'extends', 'inherit', 'super'], correctAnswer: 'extends' },
        ];
        
        await SubjectQuestion.insertMany(seedData);
        res.json({ message: 'Seed questions added successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// POST /student/start-attempt → register that user has entered the quiz (IN_PROGRESS)
router.post('/student/start-attempt', [auth, student], async (req, res) => {
  try {
    const { subject, bank } = req.body;
    const attempt = new SubjectAttempt({
      userId:    req.user._id,
      subject,
      bank,
      score:     0,
      total:     0,
      status:    'IN_PROGRESS',
      startTime: new Date(),
    });
    await attempt.save();
    res.json({ attemptId: attempt._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /student/auto-submit → beacon-compatible, saves answers on exit
// Accepts both JSON (fetch) and text/plain (sendBeacon)
router.post('/student/auto-submit', [auth, student], async (req, res) => {
  try {
    let payload = req.body;
    // sendBeacon sends as text/plain — parse manually
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { payload = {}; }
    }

    const { subject, answers = {}, attemptId, reason = 'EXITED_WITHOUT_SUBMIT' } = payload;

    let attempt;
    if (attemptId) {
      attempt = await SubjectAttempt.findById(attemptId);
    }

    let total = attempt ? attempt.total : Object.keys(answers).length;
    let correctCount = 0;
    let wrongCount = 0;
    const results = [];

    if (Object.keys(answers).length > 0) {
      const questionIds = Object.keys(answers);
      const questions = await SubjectQuestion.find({ _id: { $in: questionIds } });
      questions.forEach(q => {
        const userAnswer = answers[q._id.toString()];
        const isCorrect  = userAnswer === q.correctAnswer;
        if (isCorrect) correctCount++;
        else wrongCount++;
        results.push({ questionId: q._id, userAnswer, correctAnswer: q.correctAnswer, isCorrect });
      });
    }

    total = Math.max(total, correctCount + wrongCount);
    let unattemptedCount = total - correctCount - wrongCount;
    let rawScore = correctCount - (wrongCount * 1.25) - unattemptedCount;
    let score = Math.max(0, rawScore);

    // Update existing IN_PROGRESS attempt OR create a new one
    if (attempt) {
      attempt.score = score;
      attempt.correctCount = correctCount;
      attempt.wrongCount = wrongCount;
      attempt.unattemptedCount = unattemptedCount;
      attempt.status = 'AUTO_SUBMITTED';
      attempt.reason = reason;
      attempt.completedAt = new Date();
      await attempt.save();
    } else if (subject) {
      // Fallback — create a fresh attempt record
      const attemptsCount = await SubjectAttempt.countDocuments({ userId: req.user._id, subject });
      const currentBank   = attemptsCount + 1;
      if (attemptsCount < 4) {
        attempt = new SubjectAttempt({
          userId:      req.user._id,
          subject,
          bank:        currentBank,
          score,
          total,
          correctCount,
          wrongCount,
          unattemptedCount,
          status:      'AUTO_SUBMITTED',
          reason,
          completedAt: new Date(),
        });
        await attempt.save();
      }
    }

    res.status(200).json({ message: 'Auto-submitted', score, total, correctCount, wrongCount, unattemptedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /student/quizzes/:subject → fetch questions for a subject (Randomized, limit 30)
router.get('/student/quizzes/:subject', [auth, student], async (req, res) => {
  try {
    const { subject } = req.params;

    // Count only COMPLETED attempts (SUBMITTED or AUTO_SUBMITTED) to determine the bank
    const attemptsCount = await SubjectAttempt.countDocuments({
      userId: req.user._id,
      subject,
      status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] }
    });
    console.log(`User ${req.user._id} attempting ${subject}, completed attempts: ${attemptsCount}`);

    if (attemptsCount >= 4) {
      return res.status(403).json({ error: 'Maximum attempts reached. You have completed all 4 banks for this subject.' });
    }

    const currentBank = attemptsCount + 1;

    // If currentBank is 1, also include legacy questions with no bank assigned
    const matchQuery = { subject };
    if (currentBank === 1) {
      matchQuery.$or = [
        { bank: 1 },
        { bank: { $exists: false } },
        { bank: null }
      ];
    } else {
      matchQuery.bank = currentBank;
    }

    // Get up to 30 random questions for the subject & correct bank
    const questions = await SubjectQuestion.aggregate([
      { $match: matchQuery },
      { $sample: { size: 30 } }
    ]);

    // Strip correct answers before sending to client
    const safeQuestions = questions.map(q => ({
      _id:     q._id,
      subject: q.subject,
      question: q.question,
      options:  q.options
    }));

    // ── Create IN_PROGRESS attempt immediately so we always have an ID ──
    const attempt = new SubjectAttempt({
      userId:    req.user._id,
      subject,
      bank:      currentBank,
      score:     0,
      total:     safeQuestions.length,
      status:    'IN_PROGRESS',
      startTime: new Date(),
    });
    await attempt.save();

    res.json({ questions: safeQuestions, attemptId: attempt._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /student/submit → submit answers and calculate score
router.post('/student/submit', [auth, student], async (req, res) => {
    try {
        // req.body looks like: { subject: 'C', answers: { questionId: 'answer', ... }, attemptId: '...' }
        const { subject, answers, attemptId } = req.body;
        
        let attempt;
        if (attemptId) {
            attempt = await SubjectAttempt.findById(attemptId);
        }

        let total = attempt ? attempt.total : Object.keys(answers).length;
        let correctCount = 0;
        let wrongCount = 0;
        
        const questionIds = Object.keys(answers);
        const questions = await SubjectQuestion.find({ _id: { $in: questionIds } });

        const results = [];

        questions.forEach(q => {
            const userAnswer = answers[q._id.toString()];
            const isCorrect = userAnswer === q.correctAnswer;
            if (isCorrect) correctCount++;
            else wrongCount++;
            
            results.push({
                questionId: q._id,
                question: q.question,
                userAnswer: userAnswer,
                correctAnswer: q.correctAnswer,
                isCorrect
            });
        });

        total = Math.max(total, correctCount + wrongCount);
        let unattemptedCount = total - correctCount - wrongCount;
        let rawScore = correctCount - (wrongCount * 1.25) - unattemptedCount;
        let score = Math.max(0, rawScore);

        if (attempt) {
            attempt.score            = score;
            attempt.correctCount     = correctCount;
            attempt.wrongCount       = wrongCount;
            attempt.unattemptedCount = unattemptedCount;
            attempt.total            = total;
            attempt.status           = 'SUBMITTED';
            attempt.completedAt      = new Date();
            await attempt.save();
        } else {
            attempt = new SubjectAttempt({
                userId:      req.user._id,
                subject,
                score,
                correctCount,
                wrongCount,
                unattemptedCount,
                total,
                status:      'SUBMITTED',
                completedAt: new Date(),
            });
            await attempt.save();
        }

        res.json({
            subject,
            score,
            total,
            correctCount,
            wrongCount,
            unattemptedCount,
            results,
            attemptId: attempt._id
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------- ADMIN ROUTES -------------

// GET all questions (Admin)
router.get('/admin/questions', [auth, admin], async (req, res) => {
    try {
        const { subject, bank } = req.query;
        const filter = {};
        if (subject) filter.subject = subject;
        if (bank) filter.bank = bank;
        const questions = await SubjectQuestion.find(filter).sort({ subject: 1, bank: 1, createdAt: -1 });
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add new question (Admin)
router.post('/admin/question', [auth, admin], async (req, res) => {
    try {
        const newQuestion = new SubjectQuestion(req.body);
        await newQuestion.save();
        res.json(newQuestion);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update question (Admin)
router.put('/admin/question/:id', [auth, admin], async (req, res) => {
    try {
        const updated = await SubjectQuestion.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE question (Admin)
router.delete('/admin/question/:id', [auth, admin], async (req, res) => {
    try {
        await SubjectQuestion.findByIdAndDelete(req.params.id);
        res.json({ message: 'Question eliminated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
