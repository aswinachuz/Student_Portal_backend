const express = require("express");

const router = express.Router();

const {
  getTeachingAssignments,
  getAvailableTeachers,
  assignTeacher,
  updateTeacherAssignment,
  deleteTeacherAssignment,
} = require("../controllers/teachingAssignmentController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// GET TEACHING ASSIGNMENTS
router.get(
  "/",
  protect,
  authorize("teacher"),
  getTeachingAssignments
);

// GET ALL TEACHERS
router.get(
  "/teachers",
  protect,
  authorize("teacher"),
  getAvailableTeachers
);

// ASSIGN TEACHER
router.post(
  "/",
  protect,
  authorize("teacher"),
  assignTeacher
);

// CHANGE TEACHER
router.put(
  "/:id",
  protect,
  authorize("teacher"),
  updateTeacherAssignment
);

// REMOVE ASSIGNMENT
router.delete(
  "/:id",
  protect,
  authorize("teacher"),
  deleteTeacherAssignment
);

module.exports = router;