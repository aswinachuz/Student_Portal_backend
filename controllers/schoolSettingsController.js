const SchoolSettings = require("../models/SchoolSettings");
const fs = require("fs");
const path = require("path");


// ==========================================
// GET SCHOOL SETTINGS
// ==========================================
exports.getSchoolSettings = async (req, res) => {
  try {
    let settings = await SchoolSettings.findOne();

    // Create settings if not available
    if (!settings) {
      settings = await SchoolSettings.create({
        schoolName: "Aswin's Public School",
        logo: "",
      });
    }

    res.status(200).json({
      data: settings,
    });

  } catch (error) {
    console.error("GET SCHOOL SETTINGS ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};


// ==========================================
// UPLOAD / CHANGE SCHOOL LOGO
// ==========================================
exports.uploadSchoolLogo = async (req, res) => {
  try {
    // Admin must upload a file
    if (!req.file) {
      return res.status(400).json({
        message: "Please select a logo image",
      });
    }

    // Only images
    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        message: "Only image files are allowed",
      });
    }

    let settings = await SchoolSettings.findOne();

    // Create settings if not available
    if (!settings) {
      settings = new SchoolSettings({
        schoolName: "Aswin's Public School",
      });
    }

    // Delete old logo
    if (settings.logo) {
      const oldLogoPath = path.join(
        __dirname,
        "..",
        settings.logo
      );

      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Save new logo path
    settings.logo = `/uploads/${req.file.filename}`;

    await settings.save();

    res.status(200).json({
      message: "School logo uploaded successfully",
      data: settings,
    });

  } catch (error) {
    console.error("UPLOAD SCHOOL LOGO ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};


// ==========================================
// REMOVE SCHOOL LOGO
// ==========================================
exports.removeSchoolLogo = async (req, res) => {
  try {
    const settings = await SchoolSettings.findOne();

    if (!settings) {
      return res.status(404).json({
        message: "School settings not found",
      });
    }

    // Delete logo file
    if (settings.logo) {
      const logoPath = path.join(
        __dirname,
        "..",
        settings.logo
      );

      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    settings.logo = "";

    await settings.save();

    res.status(200).json({
      message: "School logo removed successfully",
      data: settings,
    });

  } catch (error) {
    console.error("REMOVE SCHOOL LOGO ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};