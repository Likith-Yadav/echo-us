import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../config/api';

const useChatStore = create((set, get) => ({
  messages: [],
  otherUser: null,
  loading: false,
  typing: false,

  // Set other user (chat partner)
  setOtherUser: (user) => {
    set({ otherUser: user });
  },

  // Fetch messages (optimized - only last 100)
  fetchMessages: async (otherUserId) => {
    set({ loading: true });
    try {
      const response = await axios.get(`${API_URL}/api/messages/${otherUserId}`);
      const allMessages = response.data.messages || [];
      // Only keep last 100 messages for performance
      const recentMessages = allMessages.slice(-100);
      set({ messages: recentMessages, loading: false });
    } catch (error) {
      console.error('Fetch messages error:', error);
      set({ messages: [], loading: false });
    }
  },

  // Add message (from socket or sending)
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  // Update message
  updateMessage: (messageId, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    }));
  },

  // Send message via API
  sendMessage: async (receiverId, content, messageType = 'text') => {
    try {
      const response = await axios.post(`${API_URL}/api/messages`, {
        receiverId,
        content,
        messageType,
      });
      return response.data.message;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },

  // Upload media
  uploadMedia: async (receiverId, file, messageType) => {
    try {
      console.log('📤 Uploading media:', {
        receiverId,
        messageType,
        fileUri: file.uri,
      });

      const formData = new FormData();
      
      // Get file extension
      const uriParts = file.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      
      // Append file with proper format for React Native
      formData.append('media', {
        uri: file.uri,
        name: `photo.${fileType}`,
        type: `image/${fileType}`,
      });
      
      formData.append('receiverId', receiverId);
      formData.append('messageType', messageType);

      console.log('📤 Sending FormData to:', `${API_URL}/api/messages/upload`);

      const response = await axios.post(`${API_URL}/api/messages/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        timeout: 30000, // 30 second timeout for uploads
      });
      
      console.log('✅ Media uploaded successfully:', response.data.message.id);
      return response.data.message;
    } catch (error) {
      console.error('❌ Upload media error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  // Mark messages as read
  markAsRead: async (otherUserId) => {
    try {
      await axios.put(`${API_URL}/api/messages/read/${otherUserId}`);
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  },

  // Set typing status
  setTyping: (isTyping) => {
    set({ typing: isTyping });
  },

  // Clear messages
  clearMessages: () => {
    set({ messages: [], otherUser: null });
  },

  // Clear all chat data (for logout)
  clearChatData: () => {
    console.log('🧹 Clearing chat data');
    set({ messages: [], otherUser: null, loading: false, typing: false });
  },
}));

export default useChatStore;

