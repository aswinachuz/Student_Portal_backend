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
// TEACHER / ADMIN SUBMIT ATTENDANCE
// ==========================================

router.post(
  "/",
  protect,
  authorize("admin", "teacher"),
  recordBatchAttendance
);

// ==========================================
// ADMIN ATTENDANCE CORRECTION
// ==========================================

router.put(
  "/correction",
  protect,
  authorize("admin"),
  correctAttendance
);

module.exports = router;