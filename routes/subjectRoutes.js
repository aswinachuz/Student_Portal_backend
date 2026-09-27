const express = require("express");

const router = express.Router();

const {
  getSubjects,
  addSubject,
  updateSubject,
  deleteSubject,
} = require("../controllers/subjectController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// ADMIN and TEACHER can view subjects
router.get(
  "/",
  protect,
  authorize("admin", "teacher"),
  getSubjects
);

// ADMIN and TEACHER can create subjects
router.post(
  "/",
  protect,
  authorize("admin", "teacher"),
  addSubject
);

// ADMIN and TEACHER can update subjects
router.put(
  "/:id",
  protect,
  authorize("admin", "teacher"),
  updateSubject
);

// ADMIN and TEACHER can delete subjects
router.delete(
  "/:id",
  protect,
  authorize("admin", "teacher"),
  deleteSubject
);

module.exports = router;