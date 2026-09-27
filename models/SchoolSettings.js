const mongoose = require("mongoose");

const schoolSettingsSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      default: "Aswin's Public School",
    },

    logo: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "SchoolSettings",
  schoolSettingsSchema
);