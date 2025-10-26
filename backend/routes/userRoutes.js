const express = require('express');
const multer = require('multer');
const {
  getOtherUser,
  updateProfile,
  uploadProfilePic,
  changePassword
} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// @route   GET /api/users/:userId?
// @desc    Get other user or all users
// @access  Private
router.get('/:userId?', authMiddleware, getOtherUser);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authMiddleware, updateProfile);

// @route   POST /api/users/profile-pic
// @desc    Upload profile picture
// @access  Private
router.post('/profile-pic', authMiddleware, upload.single('profilePic'), uploadProfilePic);

// @route   PUT /api/users/password
// @desc    Change password
// @access  Private
router.put('/password', authMiddleware, changePassword);

module.exports = router;

