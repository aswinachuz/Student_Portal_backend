const express = require("express");

const router = express.Router();

const {
  getDashboardStats,
  getTeachers,
  addTeacher,
  updateTeacher,
  deleteTeacher,
  getStudents,
} = require("../controllers/adminController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const { upload, imageUpload } = require("../middleware/uploadMiddleware");

// ==========================================
// ADMIN DASHBOARD
// ==========================================

router.get(
  "/stats",
  protect,
  authorize("admin"),
  getDashboardStats
);

// ==========================================
// GET ALL TEACHERS
// ==========================================

router.get(
  "/teachers",
  protect,
  authorize("admin"),
  getTeachers
);

// ==========================================
// GET STUDENTS
// Used by Admin Attendance Correction
// ==========================================

router.get(
  "/students",
  protect,
  authorize("admin"),
  getStudents
);

// ==========================================
// ADD TEACHER
// ==========================================

router.post(
  "/teachers",
  protect,
  authorize("admin"),
  imageUpload.single("avatar"),
  addTeacher
);

// ==========================================
// UPDATE TEACHER
// ==========================================

router.put(
  "/teachers/:id",
  protect,
  authorize("admin"),
  imageUpload.single("avatar"),
  updateTeacher
);

// ==========================================
// DELETE TEACHER
// ==========================================

router.delete(
  "/teachers/:id",
  protect,
  authorize("admin"),
  deleteTeacher
);

module.exports = router;