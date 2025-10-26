import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function UserInfoScreen({ route }) {
  const { otherUser } = route.params;

  return (
    <ScrollView style={styles.container}>
      {/* Profile Picture */}
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: otherUser.profilePic }}
          style={styles.avatar}
        />
      </View>

      {/* User Details */}
      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Ionicons name="person" size={20} color="#128c7e" style={styles.icon} />
          <View style={styles.infoContent}>
            <Text style={styles.label}>NAME</Text>
            <Text style={styles.value}>{otherUser.name}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="at" size={20} color="#128c7e" style={styles.icon} />
          <View style={styles.infoContent}>
            <Text style={styles.label}>USERNAME</Text>
            <Text style={styles.value}>@{otherUser.username}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="mail" size={20} color="#128c7e" style={styles.icon} />
          <View style={styles.infoContent}>
            <Text style={styles.label}>EMAIL</Text>
            <Text style={styles.value}>{otherUser.email}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="information-circle" size={20} color="#128c7e" style={styles.icon} />
          <View style={styles.infoContent}>
            <Text style={styles.label}>STATUS</Text>
            <Text style={styles.value}>{otherUser.status}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons 
            name={otherUser.isOnline ? "checkmark-circle" : "time"} 
            size={20} 
            color={otherUser.isOnline ? "#25d366" : "#667781"} 
            style={styles.icon} 
          />
          <View style={styles.infoContent}>
            <Text style={styles.label}>STATUS</Text>
            <Text style={[styles.value, otherUser.isOnline && styles.onlineText]}>
              {otherUser.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#e5e7eb',
    borderWidth: 4,
    borderColor: '#128c7e',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  icon: {
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667781',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    color: '#000',
  },
  onlineText: {
    color: '#25d366',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginLeft: 36,
  },
});

