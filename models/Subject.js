const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null,}
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);