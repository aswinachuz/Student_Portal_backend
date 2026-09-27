const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Grade 10"
  section: { type: String, required: true }, // e.g. "A"
  classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Classroom', classroomSchema);