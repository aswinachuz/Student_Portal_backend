const mongoose = require("mongoose");

const markSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },

    examType: {
      type: String,
      enum: ["first_term", "Midterm", "Final", "Assignment"],
      required: true,
    },

    marksObtained: {
  type: Number,
  required: true,
  min: 0,
  validate: {
    validator: function (value) {
      return value <= this.maxMarks;
    },
    message: "Marks obtained cannot be greater than maximum marks.",
  },
},
    maxMarks: {
      type: Number,
      required: true,
      min: 1,
    },

    grade: {
      type: String,
      required: true,
    },

    remarks: {
      type: String,
      default: "",
    },

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);


// Automatically calculate grade
markSchema.pre("validate", function () {
  if (
    this.marksObtained !== undefined &&
    this.maxMarks !== undefined &&
    this.maxMarks > 0
  ) {
    const percentage =
      (this.marksObtained / this.maxMarks) * 100;

    if (percentage >= 90) {
      this.grade = "A+";
    } else if (percentage >= 80) {
      this.grade = "A";
    } else if (percentage >= 70) {
      this.grade = "B";
    } else if (percentage >= 60) {
      this.grade = "C";
    } else if (percentage >= 50) {
      this.grade = "D";
    } else {
      this.grade = "F";
    }
  }
});


markSchema.index({ classroom: 1, subject: 1, examType: 1 });
markSchema.index({ student: 1, examType: 1 });

module.exports = mongoose.model("Mark", markSchema);