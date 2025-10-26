const express = require('express');
const {
  getCallHistory,
  createCall,
  updateCall
} = require('../controllers/callController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/calls
// @desc    Get call history
// @access  Private
router.get('/', authMiddleware, getCallHistory);

// @route   POST /api/calls
// @desc    Create call record
// @access  Private
router.post('/', authMiddleware, createCall);

// @route   PUT /api/calls/:callId
// @desc    Update call status
// @access  Private
router.put('/:callId', authMiddleware, updateCall);

module.exports = router;

