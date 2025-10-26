import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config/api';
import { initSocket, disconnectSocket } from '../utils/socket';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  // Load token from storage
  loadToken: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Get user info
        const response = await axios.get(`${API_URL}/api/auth/me`);
        set({ token, user: response.data.user });
      }
    } catch (error) {
      console.error('Load token error:', error);
      await AsyncStorage.removeItem('token');
    }
  },

  // Register
  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, userData);
      const { token, user } = response.data;
      
      // Save token
      await AsyncStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get and save push notification token
      try {
        const { initNotifications } = require('../utils/notifications');
        const pushToken = await initNotifications();
        if (pushToken) {
          try {
            await axios.put(`${API_URL}/api/users/push-token`, { pushToken });
            console.log('📱 Push token saved to backend');
          } catch (pushTokenError) {
            console.log('⚠️ Could not save push token to backend (will work after backend update):', pushTokenError.response?.data?.error || pushTokenError.message);
          }
        }
      } catch (error) {
        console.log('⚠️ Could not initialize notifications:', error.message);
      }
      
      set({ token, user, loading: false });
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Registration failed';
      set({ error: errorMsg, loading: false });
      return { success: false, error: errorMsg };
    }
  },

  // Login
  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      console.log('🔐 Logging in...');
      
      // Disconnect any existing socket first
      disconnectSocket();
      
      const response = await axios.post(`${API_URL}/api/auth/login`, credentials);
      const { token, user } = response.data;
      
      console.log(`✅ Login successful: ${user.name} (${user.id})`);
      
      // Save token
      await AsyncStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get and save push notification token
      try {
        const { initNotifications } = require('../utils/notifications');
        const pushToken = await initNotifications();
        if (pushToken) {
          // Save push token to backend
          try {
            await axios.put(`${API_URL}/api/users/push-token`, { pushToken });
            console.log('📱 Push token saved to backend');
          } catch (pushTokenError) {
            console.log('⚠️ Could not save push token to backend (will work after backend update):', pushTokenError.response?.data?.error || pushTokenError.message);
          }
        }
      } catch (error) {
        console.log('⚠️ Could not initialize notifications:', error.message);
      }
      
      // Initialize socket with NEW token
      initSocket(token);
      
      set({ token, user, loading: false });
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Login failed';
      set({ error: errorMsg, loading: false });
      return { success: false, error: errorMsg };
    }
  },

  // Logout
  logout: async () => {
    const currentUser = get().user;
    console.log(`👋 Logging out ${currentUser?.name} (${currentUser?.id})`);
    
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Disconnect socket FIRST (very important!)
      disconnectSocket();
      console.log('🔌 Socket disconnected');
      
      // Clear token
      await AsyncStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      
      // Clear user state
      set({ token: null, user: null });
      
      console.log('✅ Logout complete - ready for new login');
    }
  },

  // Update user
  updateUser: (userData) => {
    set({ user: { ...get().user, ...userData } });
  },
}));

export default useAuthStore;

