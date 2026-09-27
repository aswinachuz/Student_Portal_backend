const express = require("express");

const router = express.Router();

const {
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent,
} = require("../controllers/teacherController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

// ==========================================
// GET STUDENTS
// ==========================================

router.get(
  "/students",
  protect,
  authorize("teacher"),
  getStudents
);

// ==========================================
// ADD STUDENT
// ==========================================

router.post(
  "/students",
  protect,
  authorize("teacher"),
  upload.single("avatar"),
  addStudent
);

// ==========================================
// UPDATE STUDENT
// ==========================================

router.put(
  "/students/:id",
  protect,
  authorize("teacher"),
  upload.single("avatar"),
  updateStudent
);

// ==========================================
// DELETE STUDENT
// ==========================================

router.delete(
  "/students/:id",
  protect,
  authorize("teacher"),
  deleteStudent
);

module.exports = router;