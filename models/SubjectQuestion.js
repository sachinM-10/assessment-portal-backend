const mongoose = require('mongoose');

const subjectQuestionSchema = new mongoose.Schema({
  subject: {
    type: String,
    enum: ['C', 'Python', 'Java'],
    required: true,
  },
  bank: {
    type: Number,
    enum: [1, 2, 3, 4],
    default: 1,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 4;
      },
      message: 'Options array must contain exactly 4 items.',
    },
  },
  correctAnswer: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('SubjectQuestion', subjectQuestionSchema);
