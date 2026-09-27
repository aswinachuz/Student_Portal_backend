const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    content: {
      type: String,
      required: [true, "Announcement content is required"],
      trim: true,
      maxlength: [5000, "Announcement cannot exceed 5000 characters"],
    },

    // Who should receive the announcement
    audience: {
      type: String,
      enum: [
        "whole_school",
        "all_teachers",
        "classroom",
      ],
      required: true,
    },

    // Used only when audience = classroom
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      default: null,
    },

    // User who created the announcement
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Announcement",
  announcementSchema
);