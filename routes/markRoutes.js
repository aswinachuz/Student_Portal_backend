const express = require('express');
const router = express.Router();
const { getMarks, createMark, updateMark, deleteMark } = require('../controllers/markController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getMarks) // Accessible by all 3 roles; student view scoped inside controller
  .post(protect, authorize('admin', 'teacher'), createMark);

router.route('/:id')
  .put(protect, authorize('admin', 'teacher'), updateMark)
  .delete(protect, authorize('admin'), deleteMark);

module.exports = router;