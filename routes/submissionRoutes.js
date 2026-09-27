const express = require("express");

const {
  submitAssignment,
  getMySubmissions,
  getAssignmentSubmissions,
  getPendingSubmissions,
  gradeSubmission,
} = require("../controllers/submissionController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const router = express.Router();


// ==========================================
// STUDENT SUBMITS ASSIGNMENT
// ==========================================

router.post(
  "/",
  protect,
  authorize("student"),
  upload.single("file"),
  submitAssignment
);


// ==========================================
// STUDENT VIEWS OWN SUBMISSIONS
// ==========================================

router.get(
  "/my",
  protect,
  authorize("student"),
  getMySubmissions
);


// ==========================================
// TEACHER/ADMIN VIEWS PENDING SUBMISSIONS
// ==========================================

router.get(
  "/pending",
  protect,
  authorize("admin", "teacher"),
  getPendingSubmissions
);


// ==========================================
// TEACHER/ADMIN VIEWS SUBMISSIONS
// FOR ONE ASSIGNMENT
// ==========================================

router.get(
  "/assignment/:assignmentId",
  protect,
  authorize("admin", "teacher"),
  getAssignmentSubmissions
);


// ==========================================
// TEACHER/ADMIN GRADES SUBMISSION
// ==========================================

router.put(
  "/:id",
  protect,
  authorize("admin", "teacher"),
  gradeSubmission
);


module.exports = router;