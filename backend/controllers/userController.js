const { PrismaClient } = require('@prisma/client');
const { uploadToCloudinary } = require('../utils/cloudinaryConfig');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Get other user profile (chat partner)
const getOtherUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Find the other user (not yourself)
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId }
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        profilePic: true,
        status: true,
        isOnline: true,
        lastSeen: true
      }
    });

    // Calculate unread count for each user
    const usersWithUnread = await Promise.all(users.map(async (user) => {
      const unreadCount = await prisma.message.count({
        where: {
          senderId: user.id,
          receiverId: currentUserId,
          isRead: false
        }
      });
      return { ...user, unreadCount };
    }));

    if (userId) {
      const user = usersWithUnread.find(u => u.id === userId);
      return res.json({ user });
    }

    res.json({ users: usersWithUnread });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, username, status } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (name) updateData.name = name;
    if (username) {
      // Check if username is already taken
      const existing = await prisma.user.findFirst({
        where: { username, id: { not: userId } }
      });
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updateData.username = username;
    }
    if (status !== undefined) updateData.status = status;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        profilePic: true,
        status: true,
        isOnline: true,
        lastSeen: true
      }
    });

    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Upload profile picture
const uploadProfilePic = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'echous/profiles');

    // Update user profile picture
    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePic: result.secure_url },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        profilePic: true,
        status: true,
        isOnline: true,
        lastSeen: true
      }
    });

    res.json({ user });
  } catch (error) {
    console.error('Upload profile pic error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Update push notification token
const updatePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user.id;

    if (!pushToken) {
      return res.status(400).json({ error: 'Push token is required' });
    }

    // Update user's push token
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken }
    });

    console.log(`📱 Push token saved for user ${userId}`);
    res.json({ message: 'Push token saved successfully' });
  } catch (error) {
    console.error('Update push token error:', error);
    res.status(500).json({ error: 'Failed to update push token' });
  }
};

module.exports = { 
  getOtherUser, 
  updateProfile, 
  uploadProfilePic, 
  changePassword,
  updatePushToken 
};

