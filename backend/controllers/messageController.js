const { PrismaClient } = require('@prisma/client');
const { uploadToCloudinary } = require('../utils/cloudinaryConfig');

const prisma = new PrismaClient();

// Get all messages between two users (optimized - last 100 only)
const getMessages = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user.id;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePic: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePic: true
          }
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            messageType: true,
            mediaUrl: true,
            sender: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100  // Only get last 100 messages for performance
    });

    // Reverse to show oldest first
    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Send text message
const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, messageType, replyToId } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver and content are required' });
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        messageType: messageType || 'text',
        replyToId: replyToId || null
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePic: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePic: true
          }
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            messageType: true,
            mediaUrl: true,
            sender: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        }
      }
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(receiverId).emit('new_message', message);

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Upload media message (image/voice)
const uploadMedia = async (req, res) => {
  try {
    console.log('📤 Upload media request received');
    console.log('Body:', req.body);
    console.log('File:', req.file ? 'File present' : 'No file');

    const { receiverId, messageType } = req.body;
    const senderId = req.user.id;

    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!receiverId) {
      console.error('❌ No receiverId in request');
      return res.status(400).json({ error: 'Receiver ID is required' });
    }

    console.log(`📤 Uploading file to Cloudinary: ${req.file.size} bytes`);

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'echous/messages');
    
    console.log(`✅ Cloudinary upload successful: ${result.secure_url}`);

    // Create message with media URL
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        messageType: messageType || 'image',
        mediaUrl: result.secure_url,
        content: result.secure_url
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePic: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePic: true
          }
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            messageType: true,
            mediaUrl: true,
            sender: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        }
      }
    });

    console.log(`✅ Message created in DB: ${message.id}`);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(receiverId).emit('new_message', message);
      console.log(`📨 Socket event sent to ${receiverId}`);
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('❌ Upload media error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to upload media',
      details: error.message 
    });
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user.id;

    const result = await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: currentUserId,
        isRead: false
      },
      data: { isRead: true }
    });

    console.log(`📭 Marked ${result.count} messages as read from ${otherUserId} to ${currentUserId}`);
    
    res.json({ message: 'Messages marked as read', count: result.count });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await prisma.message.delete({
      where: { id: messageId }
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

module.exports = { 
  getMessages, 
  sendMessage, 
  uploadMedia, 
  markAsRead, 
  deleteMessage 
};

