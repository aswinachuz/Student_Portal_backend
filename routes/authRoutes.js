const express = require("express");

const router = express.Router();

const {
  register,
  login,
  getProfile,
  updateProfile,
} = require("../controllers/authController");

const { protect, authorize } = require("../middleware/authMiddleware");
const { imageUpload } = require("../middleware/uploadMiddleware");

// ==========================================
// REGISTER (Admin Only - Public registration disabled)
// ==========================================
router.post(
  "/register",
  protect,
  authorize("admin"),
  register
);

// ==========================================
// LOGIN
// ==========================================
router.post(
  "/login",
  login
);

// ==========================================
// PROFILE (GET + UPDATE)
// ==========================================
router
  .route("/profile")
  .get(
    protect,
    getProfile
  )
  .put(
    protect,
    imageUpload.single("avatar"),
    updateProfile
  );

module.exports = router;