const express = require('express');
const router = express.Router();

const {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment
} = require('../controllers/assignmentController');

const {
  protect,
  authorize
} = require('../middleware/authMiddleware');

// Get all assignments
router.get('/', protect, getAssignments);

// Get single assignment
router.get('/:id', protect, getAssignment);

// Create assignment
router.post(
  '/',
  protect,
  authorize('admin', 'teacher'),
  createAssignment
);

// Update assignment
router.put(
  '/:id',
  protect,
  authorize('admin', 'teacher'),
  updateAssignment
);

// Delete assignment
router.delete(
  '/:id',
  protect,
  authorize('admin', 'teacher'),
  deleteAssignment
);

module.exports = router;