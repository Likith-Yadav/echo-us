import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import useAuthStore from '../store/authStore';

// Dynamically import WebRTC to prevent errors in Expo Go
let RTCPeerConnection, RTCView, mediaDevices;
try {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCView = webrtc.RTCView;
  mediaDevices = webrtc.mediaDevices;
} catch (error) {
  console.log('WebRTC not available - this is expected in Expo Go');
}

import {
  getSocket,
  initiateCall,
  answerCall,
  endCall,
  sendIceCandidate,
  onCallAnswered,
  onCallEnded,
  onIceCandidate,
} from '../utils/socket';

const { width, height } = Dimensions.get('window');

// WebRTC Configuration
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function CallScreen({ route, navigation }) {
  const { user } = useAuthStore();
  const { otherUser, callType, isIncoming, callData } = route.params;
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState(isIncoming ? 'ringing' : 'calling');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const peerConnection = useRef(null);
  const callId = useRef(null);
  const callStartTime = useRef(null);
  const durationInterval = useRef(null);

  // Check if WebRTC is available
  useEffect(() => {
    if (!mediaDevices || !RTCPeerConnection) {
      Alert.alert(
        '❌ WebRTC Not Available',
        'Voice and video calls require the production APK build.\n\nThis feature is not available in Expo Go.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
      return;
    }
    setupCall();
    
    // Socket listeners
    onCallAnswered(handleCallAnswered);
    onCallEnded(handleCallEnded);
    onIceCandidate(handleIceCandidate);

    return () => {
      cleanup();
    };
  }, []);

  const setupCall = async () => {
    try {
      // Get local media stream
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        } : false,
      });

      setLocalStream(stream);

      // Create peer connection
      peerConnection.current = new RTCPeerConnection(configuration);

      // Add local stream to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // Handle ICE candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          sendIceCandidate({
            receiverId: isIncoming ? callData.callerId : otherUser.id,
            candidate: event.candidate,
          });
        }
      };

      // Create and send offer (for outgoing calls)
      if (!isIncoming) {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);

        initiateCall({
          receiverId: otherUser.id,
          callType,
          offer,
        });
      } else {
        // Answer incoming call
        await peerConnection.current.setRemoteDescription(callData.offer);
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        callId.current = callData.call.id;

        answerCall({
          callId: callData.call.id,
          callerId: callData.callerId,
          answer,
        });

        startCallTimer();
        setCallStatus('connected');
      }
    } catch (error) {
      console.error('Setup call error:', error);
      Alert.alert('Error', 'Failed to setup call');
      navigation.goBack();
    }
  };

  const handleCallAnswered = async ({ answer, callId: answeredCallId }) => {
    try {
      await peerConnection.current.setRemoteDescription(answer);
      callId.current = answeredCallId;
      startCallTimer();
      setCallStatus('connected');
    } catch (error) {
      console.error('Handle answer error:', error);
    }
  };

  const handleCallEnded = () => {
    cleanup();
    navigation.goBack();
  };

  const handleIceCandidate = async ({ candidate }) => {
    try {
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Add ICE candidate error:', error);
    }
  };

  const startCallTimer = () => {
    callStartTime.current = Date.now();
    durationInterval.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime.current) / 1000);
      setCallDuration(elapsed);
    }, 1000);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    const duration = callDuration;
    
    endCall({
      callId: callId.current,
      otherUserId: isIncoming ? callData.callerId : otherUser.id,
      duration,
    });

    cleanup();
    navigation.goBack();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setMuted(!muted);
    }
  };

  const toggleCamera = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setCameraOff(!cameraOff);
    }
  };

  const cleanup = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    if (peerConnection.current) {
      peerConnection.current.close();
    }
  };

  const displayUser = isIncoming 
    ? callData?.call?.caller 
    : otherUser;

  return (
    <View style={styles.container}>
      {/* Remote Video (full screen) */}
      {callType === 'video' && remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
        />
      ) : (
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: displayUser?.profilePic }}
            style={styles.avatar}
          />
        </View>
      )}

      {/* Local Video (small preview) */}
      {callType === 'video' && localStream && !cameraOff && (
        <RTCView
          streamURL={localStream.toURL()}
          style={styles.localVideo}
          objectFit="cover"
        />
      )}

      {/* Call Info */}
      <View style={styles.callInfo}>
        <Text style={styles.userName}>{displayUser?.name}</Text>
        <Text style={styles.callStatus}>
          {callStatus === 'ringing' && 'Incoming call...'}
          {callStatus === 'calling' && 'Calling...'}
          {callStatus === 'connected' && formatDuration(callDuration)}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, muted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Text style={styles.controlIcon}>{muted ? '🔇' : '🔊'}</Text>
        </TouchableOpacity>

        {callType === 'video' && (
          <TouchableOpacity
            style={[styles.controlButton, cameraOff && styles.controlButtonActive]}
            onPress={toggleCamera}
          >
            <Text style={styles.controlIcon}>{cameraOff ? '📷' : '📹'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndCall}
        >
          <Text style={styles.controlIcon}>📞</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  remoteVideo: {
    width: width,
    height: height,
    position: 'absolute',
  },
  localVideo: {
    width: 120,
    height: 160,
    position: 'absolute',
    top: 60,
    right: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#374151',
  },
  callInfo: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    alignSelf: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  callStatus: {
    fontSize: 16,
    color: '#e5e7eb',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  controls: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  endCallButton: {
    backgroundColor: '#ef4444',
  },
  controlIcon: {
    fontSize: 28,
  },
});

