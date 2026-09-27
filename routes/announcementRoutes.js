const express = require("express");

const {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
} = require("../controllers/announcementController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// GET ANNOUNCEMENTS
// Admin / Teacher / Student
// =====================================================

router.get(
  "/",
  protect,
  authorize("admin", "teacher", "student"),
  getAnnouncements
);


// =====================================================
// CREATE ANNOUNCEMENT
// Admin / Teacher
// =====================================================

router.post(
  "/",
  protect,
  authorize("admin", "teacher"),
  createAnnouncement
);


// =====================================================
// DELETE ANNOUNCEMENT
// Admin / Teacher
// =====================================================

router.delete(
  "/:id",
  protect,
  authorize("admin", "teacher"),
  deleteAnnouncement
);


module.exports = router;