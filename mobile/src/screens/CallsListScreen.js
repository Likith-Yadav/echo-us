import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../config/api';

export default function CallsListScreen() {
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/calls`);
      setCalls(response.data.calls || []);
    } catch (error) {
      console.error('Fetch calls error:', error);
    }
  };

  const renderCall = ({ item }) => {
    const isIncoming = item.receiverId === item.id;
    const otherUser = isIncoming ? item.caller : item.receiver;
    const callIcon = item.callType === 'video' ? '📹' : '📞';
    const statusColor = 
      item.status === 'ended' ? '#10b981' :
      item.status === 'missed' ? '#ef4444' :
      item.status === 'rejected' ? '#ef4444' : '#6b7280';

    return (
      <TouchableOpacity 
        style={styles.callItem}
        onPress={() => Alert.alert('Calls', 'Call feature requires APK build')}
      >
        <Image source={{ uri: otherUser.profilePic }} style={styles.avatar} />
        <View style={styles.callInfo}>
          <Text style={styles.name}>{otherUser.name}</Text>
          <View style={styles.callDetails}>
            <Text style={[styles.callType, { color: statusColor }]}>
              {isIncoming ? '📲' : '📞'} {item.callType} • {item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.callIcon}>{callIcon}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📞</Text>
      <Text style={styles.emptyTitle}>No calls yet</Text>
      <Text style={styles.emptyText}>
        Call history will appear here.{'\n'}
        (Requires APK build for calls)
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={calls}
        renderItem={renderCall}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={calls.length === 0 && styles.emptyList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  callItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  callInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  callDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callType: {
    fontSize: 14,
  },
  callIcon: {
    fontSize: 24,
    marginLeft: 12,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

