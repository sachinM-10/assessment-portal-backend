const mongoose = require('mongoose');

const subjectAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    enum: ['C', 'Python', 'Java'],
    required: true,
  },
  score: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
  // ── New fields for attempt lifecycle tracking ──
  startTime: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED'],
    default: 'IN_PROGRESS',
  },
  reason: {
    type: String,
    default: null,
  },
  mode: {
    type: String,
    enum: ['PRACTICE', 'EXAM'],
    default: 'EXAM',
  },
  bank: {
    type: Number,
  },
}, { timestamps: true });

module.exports = mongoose.model('SubjectAttempt', subjectAttemptSchema);
