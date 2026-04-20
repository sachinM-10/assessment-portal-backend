const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubjectAttempt',
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  ratingDifficulty: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  ratingQuality: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  suggestionText: {
    type: String,
  },
  reportedQuestionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubjectQuestion',
    default: null,
  },
  reportText: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
