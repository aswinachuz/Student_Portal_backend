const express = require("express");

const {
  getSchoolSettings,
  uploadSchoolLogo,
  removeSchoolLogo,
} = require("../controllers/schoolSettingsController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const { imageUpload } = require("../middleware/uploadMiddleware");

const router = express.Router();


// ==========================================
// GET SCHOOL SETTINGS
// Everyone can view
// ==========================================

router.get(
  "/",
  getSchoolSettings
);


// ==========================================
// UPLOAD / CHANGE SCHOOL LOGO
// ADMIN ONLY
// ==========================================

router.put(
  "/logo",
  protect,
  authorize("admin"),
  imageUpload.single("logo"),
  uploadSchoolLogo
);


// ==========================================
// REMOVE SCHOOL LOGO
// ADMIN ONLY
// ==========================================

router.delete(
  "/logo",
  protect,
  authorize("admin"),
  removeSchoolLogo
);


module.exports = router;