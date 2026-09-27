// backend/models/Submission.js
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
 content: { type: String, default: "" },
  attachmentUrl: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  score: { type: Number },
  feedback: { type: String }
}, { timestamps: true });

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);