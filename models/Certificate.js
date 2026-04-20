const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certId:      { type: String, required: true, unique: true },  // e.g. "KH-2024-ABCD1234"
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attemptId:   { type: mongoose.Schema.Types.ObjectId },
  studentName: { type: String, required: true },
  subject:     { type: String, required: true },
  score:       { type: Number, required: true },
  total:       { type: Number, required: true },
  percentage:  { type: Number, required: true },
  issuedAt:    { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);
