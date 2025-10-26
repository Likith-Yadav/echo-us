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
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import {
  onNewMessage,
  onMessageSent,
  sendMessage as socketSendMessage,
  startTyping,
  stopTyping,
  onUserTyping,
  onUserStatus,
} from '../utils/socket';

export default function ChatDetailScreen({ route, navigation }) {
  const { otherUser } = route.params;
  const { user } = useAuthStore();
  const { messages, fetchMessages, addMessage, uploadMedia, markAsRead } = useChatStore();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(otherUser?.isOnline || false);
  const [localMessages, setLocalMessages] = useState([]);
  const [replyTo, setReplyTo] = useState(null); // Message being replied to
  const [viewImage, setViewImage] = useState(null); // Image being viewed full screen
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const processedMessageIds = useRef(new Set()); // Track processed messages

  // Merge server messages with local optimistic messages
  useEffect(() => {
    setLocalMessages(messages);
    // Auto-scroll to bottom when messages update
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages]);

  // Separate effect for fetching messages (runs once per otherUser change)
  useEffect(() => {
    if (!otherUser) return;
    
    console.log(`🔄 Fetching messages for chat with ${otherUser.name} (${otherUser.id})`);
    
    // Clear processed IDs when switching chats
    processedMessageIds.current.clear();
    
    // Fetch messages async without blocking UI
    fetchMessages(otherUser.id)
      .then(() => {
        // Scroll to bottom after messages are loaded
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 300);
      })
      .catch(err => console.log('Fetch error:', err));
    
    // Mark all messages as read when opening chat
    markAsRead(otherUser.id);
    console.log(`📭 Marked messages from ${otherUser.name} as read`);
  }, [otherUser?.id]);

  // Separate effect for navigation and socket listeners
  useEffect(() => {
    if (!otherUser || !user) return;

    console.log(`🎧 Setting up socket listeners for ${otherUser.name} | My ID: ${user.id}`);

    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('UserInfo', { otherUser })}
          style={styles.headerTitleContainer}
        >
          <Text style={styles.headerTitleText}>{otherUser?.name || 'Chat'}</Text>
          {isOnline && (
            <Text style={styles.onlineIndicator}>online</Text>
          )}
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={handleVideoCall} style={styles.headerIconBtn}>
            <Ionicons name="videocam" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleVoiceCall} style={styles.headerIconBtn}>
            <Ionicons name="call" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });

    const handleNewMessage = (message) => {
      // Check if already processed
      if (processedMessageIds.current.has(message.id)) {
        console.log(`⚠️ Message ${message.id} already processed, IGNORING`);
        return;
      }
      
      console.log(`📨 NEW_MESSAGE:`, {
        msgId: message.id,
        from: message.senderId,
        to: message.receiverId,
        content: message.content?.substring(0, 15),
        myId: user?.id,
        otherUserId: otherUser?.id,
        isForThisChat: message.senderId === otherUser?.id || message.receiverId === otherUser?.id,
      });
      
      // ONLY process if message is part of THIS conversation
      if (message.senderId !== otherUser?.id && message.receiverId !== otherUser?.id) {
        console.log(`❌ Message not for this chat, ignoring`);
        return;
      }
      
      // Mark as processed
      processedMessageIds.current.add(message.id);
      
      setLocalMessages(prev => {
        // Double check if already in state
        const realExists = prev.some(m => m.id === message.id && !m._isOptimistic);
        if (realExists) {
          console.log(`⚠️ Real message ${message.id} already in state, SKIPPING`);
          return prev;
        }
        
        // Remove optimistic messages that match this real message
        const filtered = prev.filter(m => {
          if (!m._isOptimistic) return true;
          
          // Remove if content and timestamp are very close
          if (m.content === message.content && m.senderId === message.senderId) {
            const timeDiff = Date.now() - (m._timestamp || 0);
            if (timeDiff < 10000) {
              console.log(`🗑️ Removing optimistic: ${m.id}`);
              return false;
            }
          }
          
          return true;
        });
        
        console.log(`✅ Adding real message: ${message.id}`);
        return [...filtered, message];
      });
      
      addMessage(message);
      if (message.senderId === otherUser?.id) {
        markAsRead(otherUser.id);
      }
    };
    
    onNewMessage(handleNewMessage);

    const handleMessageSent = (message) => {
      // Check if already processed
      if (processedMessageIds.current.has(message.id)) {
        console.log(`⚠️ Message ${message.id} already processed, IGNORING`);
        return;
      }
      
      console.log(`✅ MESSAGE_SENT:`, {
        msgId: message.id,
        from: message.senderId,
        content: message.content?.substring(0, 15),
        myId: user?.id,
        senderMatchesMe: message.senderId === user?.id,
      });
      
      // CRITICAL: Only accept if the sender is ME
      if (message.senderId !== user?.id) {
        console.log(`❌ Message_sent event but sender is not me! Ignoring.`);
        return;
      }
      
      // Mark as processed
      processedMessageIds.current.add(message.id);
      
      setLocalMessages(prev => {
        // Double check if already in state
        const realExists = prev.some(m => m.id === message.id && !m._isOptimistic);
        if (realExists) {
          console.log(`⚠️ Confirmed message ${message.id} already in state, SKIPPING`);
          return prev;
        }
        
        // Remove MY optimistic messages with matching content
        const filtered = prev.filter(m => {
          if (!m._isOptimistic) return true;
          
          if (m.content === message.content && m.senderId === user?.id) {
            const timeDiff = Date.now() - (m._timestamp || 0);
            if (timeDiff < 10000) {
              console.log(`🗑️ Removing my optimistic: ${m.id}`);
              return false;
            }
          }
          
          return true;
        });
        
        console.log(`✅ Adding MY confirmed message: ${message.id}`);
        return [...filtered, message];
      });
      
      addMessage(message);
    };
    
    onMessageSent(handleMessageSent);

    const handleUserTyping = (data) => {
      console.log(`⌨️ TYPING:`, {
        typingUserId: data.userId,
        myId: user?.id,
        otherId: otherUser?.id,
        isTyping: data.isTyping,
        shouldShow: data.userId === otherUser?.id && data.userId !== user?.id,
      });
      
      // ONLY show if from OTHER user and NOT from me
      if (data.userId === otherUser?.id && data.userId !== user?.id) {
        console.log(`✅ Show typing: ${otherUser?.name}`);
        setIsTyping(data.isTyping);
      } else {
        if (data.userId === user?.id) {
          console.log(`❌ My own typing, hide indicator`);
          setIsTyping(false);
        }
      }
    };
    
    onUserTyping(handleUserTyping);

    const handleUserStatus = (data) => {
      if (data.userId === otherUser?.id) {
        console.log(`👤 ${otherUser?.name} is now ${data.isOnline ? 'online' : 'offline'}`);
        setIsOnline(data.isOnline);
      }
    };
    
    onUserStatus(handleUserStatus);

    return () => {
      console.log(`🧹 Cleaning up socket listeners for ${otherUser?.name}`);
      // Socket listeners are cleaned up via socket.off() in the utils
    };
  }, [otherUser?.id, user?.id]); // Only re-run when these IDs change

  const handleSendMessage = () => {
    if (!inputText.trim() || !otherUser) return;

    const messageText = inputText.trim();
    const timestamp = Date.now();
    
    // Create truly unique optimistic ID
    const tempId = `OPTIMISTIC_${user.id}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📤 Sending message from ME (${user.id}) to ${otherUser.id}: "${messageText}"`);
    
    const tempMessage = {
      id: tempId,
      content: messageText,
      messageType: 'text',
      senderId: user.id, // THIS IS ME
      receiverId: otherUser.id,
      createdAt: new Date().toISOString(),
      replyToId: replyTo?.id || null, // Include reply reference
      replyTo: replyTo || null,
      sender: {
        id: user.id,
        username: user.username,
        name: user.name,
        profilePic: user.profilePic,
      },
      receiver: {
        id: otherUser.id,
        username: otherUser.username,
        name: otherUser.name,
        profilePic: otherUser.profilePic,
      },
      _isOptimistic: true,
      _myUserId: user.id, // Store MY ID for comparison
      _timestamp: timestamp,
    };

    // Add to local messages immediately
    setLocalMessages(prev => {
      console.log(`➕ Adding optimistic message: ${tempId}`);
      return [...prev, tempMessage];
    });

    // Clear input and reply
    setInputText('');
    setReplyTo(null);
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping(otherUser.id);

    // Send to server in background
    socketSendMessage({
      receiverId: otherUser.id,
      content: messageText,
      messageType: 'text',
      replyToId: replyTo?.id || null,
    });

    // Scroll to bottom after sending
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const handleTyping = (text) => {
    setInputText(text);

    if (!otherUser) return;

    if (text.length > 0) {
      console.log(`⌨️ I (${user?.id}) am typing, notifying ${otherUser.id} (${otherUser.name})`);
      startTyping(otherUser.id);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        console.log(`⌨️ I stopped typing, notifying ${otherUser.id}`);
        stopTyping(otherUser.id);
      }, 2000);
    } else {
      stopTyping(otherUser.id);
    }
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to photos');
        return;
      }

      console.log('📷 Opening image picker...');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });

      console.log('📷 Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0 && otherUser) {
        const asset = result.assets[0];
        console.log('📤 Selected image:', {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        });

        Alert.alert('📤 Uploading...', 'Please wait while we upload your image');

        try {
          const message = await uploadMedia(otherUser.id, asset, 'image');
          console.log('✅ Image uploaded successfully:', message);
          
          // Add the message to local state immediately
          addMessage(message);
          
          Alert.alert('✅ Success', 'Image sent successfully!');
        } catch (error) {
          console.error('❌ Upload failed:', error);
          Alert.alert(
            '❌ Upload Failed', 
            error.response?.data?.error || error.message || 'Failed to upload image. Please check your internet connection.'
          );
        }
      }
    } catch (error) {
      console.error('❌ Image pick error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleVoiceCall = () => {
    if (!otherUser) {
      Alert.alert('Error', 'Cannot start call. Please try again.');
      return;
    }
    
    navigation.navigate('Call', {
      otherUser: otherUser,
      callType: 'audio',
      isIncoming: false,
    });
  };

  const handleVideoCall = () => {
    if (!otherUser) {
      Alert.alert('Error', 'Cannot start call. Please try again.');
      return;
    }
    
    navigation.navigate('Call', {
      otherUser: otherUser,
      callType: 'video',
      isIncoming: false,
    });
  };

  const handleLongPress = (item) => {
    Alert.alert(
      'Message Options',
      'What would you like to do?',
      [
        {
          text: 'Reply',
          onPress: () => setReplyTo(item),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleImagePress = (imageUrl) => {
    setViewImage(imageUrl);
  };

  const handleSaveImage = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to save images');
        return;
      }

      // Save the image to gallery
      await MediaLibrary.saveToLibraryAsync(viewImage);
      
      Alert.alert('✅ Saved!', 'Image saved to gallery');
    } catch (error) {
      console.error('Save image error:', error);
      Alert.alert(
        '❌ Error', 
        'Failed to save image: ' + (error.message || 'Unknown error'),
        [{ text: 'OK' }]
      );
    }
  };

  const renderMessage = ({ item }) => {
    const messageSenderId = item.senderId || item.sender?.id || item._myUserId;
    const currentUserId = user?.id;
    
    // Determine if message is mine
    let isMine = false;
    
    if (item._isOptimistic) {
      isMine = true;
    } else {
      isMine = messageSenderId === currentUserId;
    }
    
    return (
      <TouchableOpacity 
        style={[styles.messageBubble, isMine ? styles.myMessage : styles.otherMessage]}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        {/* Reply Preview */}
        {item.replyTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyLine} />
            <View style={styles.replyContent}>
              <Text style={styles.replyName}>
                {item.replyTo.sender?.name || 'User'}
              </Text>
              {item.replyTo.messageType === 'image' ? (
                <Text style={styles.replyText}>📷 Photo</Text>
              ) : (
                <Text style={styles.replyText} numberOfLines={1}>
                  {item.replyTo.content}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Message Content */}
        {item.messageType === 'image' && item.mediaUrl ? (
          <TouchableOpacity onPress={() => handleImagePress(item.mediaUrl)}>
            <Image 
              source={{ uri: item.mediaUrl }} 
              style={styles.messageImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : (
          <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.otherMessageText]}>
            {item.content}
          </Text>
        )}
        
        {/* Time */}
        <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.otherMessageTime]}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={localMessages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => item.id ? item.id.toString() : `msg-${index}`}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => {
          // Auto-scroll to bottom when content size changes (new messages)
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }}
        onLayout={() => {
          // Initial scroll to bottom when list is laid out
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 200);
        }}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        removeClippedSubviews={false}
        maxToRenderPerBatch={20}
        windowSize={21}
        initialNumToRender={50}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{otherUser?.name || 'User'} is typing...</Text>
        </View>
      )}

      {/* Reply Preview */}
      {replyTo && (
        <View style={styles.replyInputPreview}>
          <View style={styles.replyInputContent}>
            <Text style={styles.replyInputLabel}>Replying to {replyTo.sender?.name}</Text>
            <Text style={styles.replyInputText} numberOfLines={1}>
              {replyTo.messageType === 'image' ? '📷 Photo' : replyTo.content}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyCloseBtn}>
            <Ionicons name="close" size={20} color="#667781" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={handleImagePick} style={styles.attachButton}>
          <Ionicons name="add-circle" size={30} color="#54656f" />
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
          <Ionicons name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Image Viewer Modal */}
      <Modal
        visible={viewImage !== null}
        transparent={true}
        onRequestClose={() => setViewImage(null)}
        animationType="fade"
      >
        <View style={styles.imageViewerContainer}>
          {/* Header */}
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity onPress={() => setViewImage(null)} style={styles.imageViewerClose}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveImage} style={styles.imageViewerSave}>
              <Ionicons name="download-outline" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Image */}
          <Image 
            source={{ uri: viewImage }} 
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ece5dd', // WhatsApp chat background
  },
  headerTitleContainer: {
    alignItems: 'flex-start',
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  onlineIndicator: {
    fontSize: 12,
    color: '#d1f4e0',
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    marginRight: 4,
    alignItems: 'center',
  },
  headerIconBtn: {
    marginLeft: 16,
    padding: 4,
  },
  messagesList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf8c6', // WhatsApp green
    borderRadius: 8,
    borderBottomRightRadius: 2,
    marginLeft: 40,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderBottomLeftRadius: 2,
    marginRight: 40,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000',
  },
  myMessageText: {
    color: '#000',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: '#667781',
  },
  otherMessageTime: {
    color: '#667781',
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 4,
  },
  replyPreview: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  replyLine: {
    width: 3,
    backgroundColor: '#128c7e',
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#128c7e',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 13,
    color: '#667781',
  },
  replyInputPreview: {
    flexDirection: 'row',
    backgroundColor: '#f0f2f5',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  replyInputContent: {
    flex: 1,
  },
  replyInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#128c7e',
    marginBottom: 2,
  },
  replyInputText: {
    fontSize: 13,
    color: '#667781',
  },
  replyCloseBtn: {
    padding: 4,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  imageViewerClose: {
    padding: 8,
  },
  imageViewerSave: {
    padding: 8,
  },
  fullScreenImage: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 100,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  typingText: {
    fontSize: 13,
    color: '#128c7e',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 0,
  },
  attachButton: {
    padding: 8,
    marginRight: 4,
  },
  attachIcon: {
    fontSize: 28,
    color: '#54656f',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    fontSize: 16,
    maxHeight: 100,
    color: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  sendButton: {
    backgroundColor: '#25d366', // WhatsApp green
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  sendIcon: {
    fontSize: 24,
    color: '#fff',
  },
});

