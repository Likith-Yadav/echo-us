import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import {
  initSocket,
  onNewMessage,
  onMessageSent,
  onUserStatus,
  onUserTyping,
  sendMessage as socketSendMessage,
  startTyping,
  stopTyping,
  onIncomingCall,
} from '../utils/socket';
import axios from 'axios';
import { API_URL } from '../config/api';

export default function ChatScreen({ navigation }) {
  const { user, token, logout } = useAuthStore();
  const { messages, otherUser, setOtherUser, addMessage, fetchMessages, uploadMedia, markAsRead } = useChatStore();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Initialize socket
    const socket = initSocket(token);

    // Fetch other user
    fetchOtherUser();

    // Socket listeners
    onNewMessage((message) => {
      addMessage(message);
      if (otherUser && message.senderId === otherUser.id) {
        markAsRead(otherUser.id);
      }
    });

    onMessageSent((message) => {
      addMessage(message);
    });

    onUserStatus((data) => {
      if (otherUser && data.userId === otherUser.id) {
        setOtherUserOnline(data.isOnline);
      }
    });

    onUserTyping((data) => {
      if (otherUser && data.userId === otherUser.id) {
        setIsTyping(data.isTyping);
      }
    });

    onIncomingCall((data) => {
      Alert.alert(
        `Incoming ${data.callType} call`,
        `${data.call.caller.name} is calling...\n\nNote: Calls require native build (APK)`,
        [
          {
            text: 'OK',
            style: 'cancel',
          },
        ],
      );
    });

    return () => {
      // Clean up listeners
    };
  }, [token, otherUser]);

  const fetchOtherUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/`);
      const users = response.data.users;
      
      if (users && users.length > 0) {
        const partner = users[0]; // Get first user (your chat partner)
        setOtherUser(partner);
        setOtherUserOnline(partner.isOnline);
        fetchMessages(partner.id);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !otherUser) return;

    socketSendMessage({
      receiverId: otherUser.id,
      content: inputText.trim(),
      messageType: 'text',
    });

    setInputText('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping(otherUser.id);
  };

  const handleTyping = (text) => {
    setInputText(text);

    if (!otherUser) return;

    // Start typing
    if (text.length > 0) {
      startTyping(otherUser.id);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(otherUser.id);
      }, 2000);
    } else {
      stopTyping(otherUser.id);
    }
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && otherUser) {
      try {
        await uploadMedia(otherUser.id, result.assets[0], 'image');
      } catch (error) {
        Alert.alert('Error', 'Failed to upload image');
      }
    }
  };

  const handleVoiceCall = () => {
    if (!otherUser) return;
    Alert.alert(
      'Voice Calls',
      'Voice calling requires a native build. Please build the APK to use this feature.\n\nFor now, you can test messaging!',
      [{ text: 'OK' }]
    );
  };

  const handleVideoCall = () => {
    if (!otherUser) return;
    Alert.alert(
      'Video Calls', 
      'Video calling requires a native build. Please build the APK to use this feature.\n\nFor now, you can test messaging!',
      [{ text: 'OK' }]
    );
  };

  const renderMessage = ({ item }) => {
    const isMine = item.senderId === user.id;

    return (
      <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.otherMessage]}>
        {item.messageType === 'image' && item.mediaUrl ? (
          <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} />
        ) : (
          <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.otherMessageText]}>
            {item.content}
          </Text>
        )}
        <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.otherMessageTime]}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  if (!otherUser) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No chat partner found</Text>
        <Text style={styles.loadingSubtext}>
          Register another account to start chatting!
        </Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={logout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Image
            source={{ uri: otherUser.profilePic }}
            style={styles.avatar}
          />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherUser.name}</Text>
          <Text style={styles.headerStatus}>
            {isTyping ? 'typing...' : otherUserOnline ? 'online' : 'offline'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleVoiceCall} style={styles.iconButton}>
            <Text style={styles.iconText}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleVideoCall} style={styles.iconButton}>
            <Text style={styles.iconText}>📹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.iconButton}>
            <Text style={styles.iconText}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={handleImagePick} style={styles.attachButton}>
          <Text style={styles.attachIcon}>📎</Text>
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleTyping}
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
          multiline
        />
        
        <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 24,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  logoutButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerStatus: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 12,
    padding: 8,
  },
  iconText: {
    fontSize: 20,
  },
  messagesList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366f1',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: '#e0e7ff',
  },
  otherMessageTime: {
    color: '#9ca3af',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  attachIcon: {
    fontSize: 24,
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
    maxHeight: 100,
    color: '#1f2937',
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
  },
  sendIcon: {
    fontSize: 24,
    color: '#6366f1',
  },
});

