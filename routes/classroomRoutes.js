const express = require("express");

const router = express.Router();

const {
  getClassrooms,
  addClassroom,
  updateClassroom,
  assignClassTeacher,
  deleteClassroom,
} = require("../controllers/classroomController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// ==========================================
// GET CLASSROOMS
// ADMIN + TEACHER
// ==========================================
router.get(
  "/",
  protect,
  authorize("admin", "teacher"),
  getClassrooms
);

// ==========================================
// ADD CLASSROOM
// ADMIN ONLY
// ==========================================
router.post(
  "/",
  protect,
  authorize("admin"),
  addClassroom
);

// ==========================================
// UPDATE CLASSROOM
// ADMIN ONLY
// ==========================================
router.put(
  "/:id",
  protect,
  authorize("admin"),
  updateClassroom
);

// ==========================================
// ASSIGN CLASS TEACHER
// ADMIN ONLY
// ==========================================
router.put(
  "/:id/teacher",
  protect,
  authorize("admin"),
  assignClassTeacher
);

// ==========================================
// DELETE CLASSROOM
// ADMIN ONLY
// ==========================================
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteClassroom
);

module.exports = router;