const express = require("express");
const router = express.Router();

const {
  getTeacherAttendance,
  recordBatchTeacherAttendance,
  getTeacherAttendanceStats,
} = require("../controllers/teacherAttendanceController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// ==========================================
// GET TEACHER ATTENDANCE (ADMIN & TEACHER)
// ==========================================
router.get(
  "/",
  protect,
  authorize("admin", "teacher"),
  getTeacherAttendance
);

// ==========================================
// RECORD / EDIT TEACHER ATTENDANCE (ADMIN ONLY)
// ==========================================
router.post(
  "/",
  protect,
  authorize("admin"),
  recordBatchTeacherAttendance
);

// ==========================================
// GET TEACHER ATTENDANCE STATS
// ==========================================
router.get(
  "/stats",
  protect,
  authorize("admin", "teacher"),
  getTeacherAttendanceStats
);

module.exports = router;
