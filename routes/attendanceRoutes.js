const express = require("express");

const router = express.Router();

const {
  recordBatchAttendance,
  getAttendance,
  correctAttendance,
} = require("../controllers/attendanceController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// ==========================================
// GET ATTENDANCE
// ==========================================

router.get(
  "/",
  protect,
  authorize("admin", "teacher", "student"),
  getAttendance
);

// ==========================================
// TEACHER RECORD / EDIT STUDENT ATTENDANCE
// ==========================================

router.post(
  "/",
  protect,
  authorize("teacher"),
  recordBatchAttendance
);

// ==========================================
// TEACHER ATTENDANCE CORRECTION / EDITING
// ==========================================

router.put(
  "/correction",
  protect,
  authorize("teacher"),
  correctAttendance
);

module.exports = router;