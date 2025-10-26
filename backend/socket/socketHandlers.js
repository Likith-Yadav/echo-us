const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../utils/tokenUtils');

const prisma = new PrismaClient();

// Store active user sockets
const userSockets = new Map(); // userId -> socketId

const socketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Authenticate socket connection
    socket.on('authenticate', async (token) => {
      try {
        const decoded = verifyToken(token);
        if (!decoded) {
          socket.emit('auth_error', { message: 'Invalid token' });
          return;
        }

        // Store user socket
        socket.userId = decoded.userId;
        userSockets.set(decoded.userId, socket.id);

        // Join user's personal room
        socket.join(decoded.userId);

        // Update user online status
        await prisma.user.update({
          where: { id: decoded.userId },
          data: { isOnline: true, lastSeen: new Date() }
        });

        // Notify all connected users about online status
        io.emit('user_status', {
          userId: decoded.userId,
          isOnline: true
        });

        socket.emit('authenticated', { userId: decoded.userId });
        console.log(`✅ User authenticated: ${decoded.userId}`);
      } catch (error) {
        console.error('Socket auth error:', error);
        socket.emit('auth_error', { message: 'Authentication failed' });
      }
    });

    // Handle typing indicator
    socket.on('typing_start', ({ receiverId }) => {
      const typingUserId = socket.userId;
      console.log(`⌨️ TYPING_START: User ${typingUserId} started typing → sending to ${receiverId}`);
      
      // Send typing indicator ONLY to the receiver
      io.to(receiverId).emit('user_typing', {
        userId: typingUserId, // The person who IS typing
        isTyping: true
      });
    });

    socket.on('typing_stop', ({ receiverId }) => {
      const typingUserId = socket.userId;
      console.log(`⌨️ TYPING_STOP: User ${typingUserId} stopped typing → sending to ${receiverId}`);
      
      // Send typing stop ONLY to the receiver
      io.to(receiverId).emit('user_typing', {
        userId: typingUserId, // The person who WAS typing
        isTyping: false
      });
    });

    // Handle real-time messaging (optimized)
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, messageType, mediaUrl } = data;
        const senderId = socket.userId;

        if (!senderId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        console.log(`📤 SEND_MESSAGE: from ${senderId} to ${receiverId} | content: "${content?.substring(0, 20)}"`);

        // Create message in database FIRST (don't send temp message)
        const message = await prisma.message.create({
          data: {
            senderId,
            receiverId,
            content,
            messageType: messageType || 'text',
            mediaUrl
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
            }
          }
        });

        console.log(`✅ Message created in DB: ${message.id}`);
        
        // Send message to receiver
        io.to(receiverId).emit('new_message', message);
        console.log(`📨 Sent to receiver: ${receiverId}`);
        
        // Acknowledge sender with real message
        socket.emit('message_sent', message);
        console.log(`✅ Sent confirmation to sender: ${senderId}`);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle message read receipts
    socket.on('mark_read', async ({ messageId, senderId }) => {
      try {
        await prisma.message.update({
          where: { id: messageId },
          data: { isRead: true }
        });

        // Notify sender
        io.to(senderId).emit('message_read', { messageId });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // ========== WebRTC Signaling ==========

    // Initiate call
    socket.on('call_initiate', async (data) => {
      try {
        const { receiverId, callType, offer } = data;
        const callerId = socket.userId;

        // Create call record
        const call = await prisma.call.create({
          data: {
            callerId,
            receiverId,
            callType,
            status: 'ringing'
          },
          include: {
            caller: {
              select: {
                id: true,
                username: true,
                name: true,
                profilePic: true
              }
            }
          }
        });

        // Send call notification to receiver
        io.to(receiverId).emit('incoming_call', {
          call,
          offer,
          callerId,
          callType
        });

        socket.emit('call_initiated', { callId: call.id });
        console.log(`📞 ${callType} call initiated from ${callerId} to ${receiverId}`);
      } catch (error) {
        console.error('Call initiate error:', error);
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    // Answer call
    socket.on('call_answer', async (data) => {
      const { callId, callerId, answer } = data;

      // Update call status
      await prisma.call.update({
        where: { id: callId },
        data: { status: 'ongoing' }
      });

      // Send answer to caller
      io.to(callerId).emit('call_answered', {
        callId,
        answer,
        receiverId: socket.userId
      });

      console.log(`✅ Call ${callId} answered`);
    });

    // Reject call
    socket.on('call_reject', async (data) => {
      const { callId, callerId } = data;

      // Update call status
      await prisma.call.update({
        where: { id: callId },
        data: { 
          status: 'rejected',
          endedAt: new Date()
        }
      });

      // Notify caller
      io.to(callerId).emit('call_rejected', { callId });

      console.log(`❌ Call ${callId} rejected`);
    });

    // End call
    socket.on('call_end', async (data) => {
      const { callId, otherUserId, duration } = data;

      // Update call status
      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'ended',
          duration: duration || 0,
          endedAt: new Date()
        }
      });

      // Notify other user
      io.to(otherUserId).emit('call_ended', { callId });

      console.log(`📴 Call ${callId} ended`);
    });

    // ICE Candidate exchange
    socket.on('ice_candidate', (data) => {
      const { receiverId, candidate } = data;
      io.to(receiverId).emit('ice_candidate', {
        candidate,
        senderId: socket.userId
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      if (socket.userId) {
        try {
          console.log(`👋 User disconnecting: ${socket.userId}`);
          
          // Update user offline status
          const lastSeenTime = new Date();
          await prisma.user.update({
            where: { id: socket.userId },
            data: { 
              isOnline: false,
              lastSeen: lastSeenTime
            }
          });

          // Remove from active sockets
          userSockets.delete(socket.userId);

          // Notify all users about offline status
          io.emit('user_status', {
            userId: socket.userId,
            isOnline: false,
            lastSeen: lastSeenTime
          });

          console.log(`✅ User ${socket.userId} set to offline at ${lastSeenTime}`);
        } catch (error) {
          console.error('Disconnect error:', error);
        }
      }
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandlers;

