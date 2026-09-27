const mongoose = require("mongoose");

const teachingAssignmentSchema = new mongoose.Schema(
  {
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Same subject cannot be assigned twice
// to two teachers in the same classroom.
teachingAssignmentSchema.index(
  {
    classroom: 1,
    subject: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "TeachingAssignment",
  teachingAssignmentSchema
);