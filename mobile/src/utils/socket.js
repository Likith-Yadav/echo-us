import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

let socket = null;

export const initSocket = (token) => {
  // If socket already exists, disconnect it first
  if (socket) {
    console.log('⚠️ Socket already exists, disconnecting old one...');
    disconnectSocket();
  }
  
  console.log('🔌 Creating new socket connection...');
  
  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    forceNew: true, // Force a new connection
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected');
    // Authenticate with new token
    socket.emit('authenticate', token);
  });

  socket.on('authenticated', (data) => {
    console.log(`✅ Socket authenticated for user: ${data.userId}`);
  });

  socket.on('auth_error', (error) => {
    console.error('❌ Socket auth error:', error);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('🔌 Disconnecting socket...');
    
    // Remove ALL listeners before disconnecting
    socket.off('connect');
    socket.off('authenticated');
    socket.off('auth_error');
    socket.off('disconnect');
    socket.off('error');
    socket.off('new_message');
    socket.off('message_sent');
    socket.off('user_status');
    socket.off('user_typing');
    socket.off('incoming_call');
    socket.off('call_answered');
    socket.off('call_rejected');
    socket.off('call_ended');
    socket.off('ice_candidate');
    
    console.log('✅ All socket listeners removed');
    
    // Disconnect
    socket.disconnect();
    socket = null;
    
    console.log('✅ Socket disconnected and cleared');
  }
};

// Socket event listeners
export const onNewMessage = (callback) => {
  if (socket) {
    // Remove previous listener to avoid duplicates
    socket.off('new_message');
    socket.on('new_message', callback);
  }
};

export const onMessageSent = (callback) => {
  if (socket) {
    // Remove previous listener to avoid duplicates
    socket.off('message_sent');
    socket.on('message_sent', callback);
  }
};

export const onUserStatus = (callback) => {
  if (socket) {
    // Remove previous listener to avoid duplicates
    socket.off('user_status');
    socket.on('user_status', callback);
  }
};

export const onUserTyping = (callback) => {
  if (socket) {
    // Remove previous listener to avoid duplicates
    socket.off('user_typing');
    socket.on('user_typing', callback);
  }
};

export const onIncomingCall = (callback) => {
  if (socket) {
    socket.on('incoming_call', callback);
  }
};

export const onCallAnswered = (callback) => {
  if (socket) {
    socket.on('call_answered', callback);
  }
};

export const onCallRejected = (callback) => {
  if (socket) {
    socket.on('call_rejected', callback);
  }
};

export const onCallEnded = (callback) => {
  if (socket) {
    socket.on('call_ended', callback);
  }
};

export const onIceCandidate = (callback) => {
  if (socket) {
    socket.on('ice_candidate', callback);
  }
};

// Socket emitters
export const sendMessage = (data) => {
  if (socket) {
    socket.emit('send_message', data);
  }
};

export const startTyping = (receiverId) => {
  if (socket) {
    socket.emit('typing_start', { receiverId });
  }
};

export const stopTyping = (receiverId) => {
  if (socket) {
    socket.emit('typing_stop', { receiverId });
  }
};

export const initiateCall = (data) => {
  if (socket) {
    socket.emit('call_initiate', data);
  }
};

export const answerCall = (data) => {
  if (socket) {
    socket.emit('call_answer', data);
  }
};

export const rejectCall = (data) => {
  if (socket) {
    socket.emit('call_reject', data);
  }
};

export const endCall = (data) => {
  if (socket) {
    socket.emit('call_end', data);
  }
};

export const sendIceCandidate = (data) => {
  if (socket) {
    socket.emit('ice_candidate', data);
  }
};

