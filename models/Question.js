const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  questionType: {
    type: String,
    default: 'multiple_choice',
  },
  options: {
    type: [String],
    default: [],
  },
  correctAnswer: {
    type: String,
    required: true,
  },
  points: {
    type: Number,
    default: 1,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
