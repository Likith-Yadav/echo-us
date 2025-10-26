const express = require('express');
const multer = require('multer');
const {
  getMessages,
  sendMessage,
  uploadMedia,
  markAsRead,
  deleteMessage
} = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// @route   GET /api/messages/:otherUserId
// @desc    Get all messages with another user
// @access  Private
router.get('/:otherUserId', authMiddleware, getMessages);

// @route   POST /api/messages
// @desc    Send text message
// @access  Private
router.post('/', authMiddleware, sendMessage);

// @route   POST /api/messages/upload
// @desc    Upload media message
// @access  Private
router.post('/upload', authMiddleware, upload.single('media'), uploadMedia);

// @route   PUT /api/messages/read/:otherUserId
// @desc    Mark messages as read
// @access  Private
router.put('/read/:otherUserId', authMiddleware, markAsRead);

// @route   DELETE /api/messages/:messageId
// @desc    Delete message
// @access  Private
router.delete('/:messageId', authMiddleware, deleteMessage);

module.exports = router;

