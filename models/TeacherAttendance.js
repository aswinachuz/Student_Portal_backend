const mongoose = require("mongoose");

const teacherAttendanceSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Present", "Absent", "Half Day", "On Leave"],
      default: "Present",
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
    },

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

teacherAttendanceSchema.index(
  { teacher: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("TeacherAttendance", teacherAttendanceSchema);
