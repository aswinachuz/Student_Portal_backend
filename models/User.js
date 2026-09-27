const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // ==========================================
    // NAME
    // ==========================================

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    // ==========================================
    // EMAIL
    // ==========================================

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [150, "Email cannot exceed 150 characters"],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },

    // ==========================================
    // PASSWORD
    // ==========================================

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    // ==========================================
    // ROLE
    // ==========================================

    role: {
      type: String,
      enum: {
        values: ["admin", "teacher", "student"],
        message: "Invalid user role",
      },
      default: "student",
    },

    // ==========================================
    // STUDENT ROLL NUMBER
    // ==========================================

    rollNumber: {
      type: String,
      sparse: true,
      trim: true,
      maxlength: [30, "Roll number cannot exceed 30 characters"],
    },

    // ==========================================
    // TEACHER ID
    // ==========================================

    teacherId: {
      type: String,
      sparse: true,
      trim: true,
      maxlength: [30, "Teacher ID cannot exceed 30 characters"],
    },

    // ==========================================
    // CLASSROOM
    // ==========================================

    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
    },

    // ==========================================
    // SUBJECTS
    // ==========================================

    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],

    // ==========================================
    // PHONE
    // ==========================================

    phone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number cannot exceed 20 characters"],
      match: [
        /^[0-9+\-\s()]*$/,
        "Please enter a valid phone number",
      ],
    },

    // ==========================================
    // DATE OF BIRTH
    // ==========================================

    dateOfBirth: {
      type: Date,
    },

    // ==========================================
    // GENDER
    // ==========================================

    gender: {
      type: String,
      enum: ["Male", "Female"],
    },

    // ==========================================
    // ADDRESS
    // ==========================================

    address: {
      type: String,
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters"],
    },

    // ==========================================
    // PROFILE PHOTO
    // ==========================================

    avatar: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// HASH PASSWORD
// ==========================================

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(
    this.password,
    salt
  );
});

// ==========================================
// CHECK PASSWORD
// ==========================================

userSchema.methods.matchPassword = async function (
  enteredPassword
) {
  return await bcrypt.compare(
    enteredPassword,
    this.password
  );
};

module.exports = mongoose.model(
  "User",
  userSchema
);