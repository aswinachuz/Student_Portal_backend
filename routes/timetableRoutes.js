const express = require("express");

const router = express.Router();

const {
  getTimetable,
  addTimetable,
  updateTimetable,
  deleteTimetable,
} = require("../controllers/timetableController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// ------------------------------------
// VIEW TIMETABLE
// Teacher + Student
// ------------------------------------
router.get(
  "/",
  protect,
  authorize("teacher", "student"),
  getTimetable
);

// ------------------------------------
// ADD TIMETABLE
// Controller checks Class Teacher
// ------------------------------------
router.post(
  "/",
  protect,
  authorize("teacher"),
  addTimetable
);

// ------------------------------------
// UPDATE TIMETABLE
// Controller checks Class Teacher
// ------------------------------------
router.put(
  "/:id",
  protect,
  authorize("teacher"),
  updateTimetable
);

// ------------------------------------
// DELETE TIMETABLE
// Controller checks Class Teacher
// ------------------------------------
router.delete(
  "/:id",
  protect,
  authorize("teacher"),
  deleteTimetable
);

module.exports = router;