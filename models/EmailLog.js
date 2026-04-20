const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipientEmail:  { type: String, required: true },
  emailType:       { type: String, enum: ['RESULT', 'CERTIFICATE', 'WELCOME', 'REMINDER'], required: true },
  subject:         { type: String },
  status:          { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
  errorMessage:    { type: String },
  sentAt:          { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('EmailLog', emailLogSchema);
