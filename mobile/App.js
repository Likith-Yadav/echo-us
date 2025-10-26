import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/utils/navigationRef';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { LogBox, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ChatsListScreen from './src/screens/ChatsListScreen';
import ChatDetailScreen from './src/screens/ChatDetailScreen';
import CallScreen from './src/screens/CallScreen';
import CallsListScreen from './src/screens/CallsListScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import UserInfoScreen from './src/screens/UserInfoScreen';

// Store
import useAuthStore from './src/store/authStore';
import { initSocket } from './src/utils/socket';
import { initNotifications, addNotificationResponseListener } from './src/utils/notifications';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Remote debugger',
  'Setting a timer',
]);

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ChatsList" 
        component={ChatsListScreen}
        options={({ navigation }) => ({
          title: 'EchoUs',
          headerStyle: { 
            backgroundColor: '#128c7e',
            elevation: 4,
            shadowOpacity: 0.3,
          },
          headerTintColor: '#fff',
          headerTitleStyle: { 
            fontWeight: 'bold',
            fontSize: 20,
          },
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => navigation.navigate('Profile')}
              style={{ 
                marginRight: 16,
                padding: 8,
              }}
            >
              <Ionicons name="person-circle-outline" size={28} color="#fff" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen 
        name="ChatDetail" 
        component={ChatDetailScreen}
        options={({ navigation }) => ({
          headerStyle: { 
            backgroundColor: '#128c7e',
            elevation: 4,
          },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        })}
        listeners={({ navigation }) => ({
          focus: () => {
            // Hide bottom tabs when in chat detail
            navigation.getParent()?.setOptions({
              tabBarStyle: { display: 'none' }
            });
          },
          beforeRemove: () => {
            // Show bottom tabs when leaving chat detail
            navigation.getParent()?.setOptions({
              tabBarStyle: {
                height: 60,
                paddingBottom: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: '#e5e7eb',
                backgroundColor: '#fff',
                display: 'flex',
              }
            });
          },
        })}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerStyle: { 
            backgroundColor: '#128c7e',
            elevation: 4,
          },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen 
        name="UserInfo" 
        component={UserInfoScreen}
        options={({ route }) => ({
          title: route.params?.otherUser?.name || 'User Info',
          headerStyle: { 
            backgroundColor: '#128c7e',
            elevation: 4,
          },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        })}
      />
      <Stack.Screen 
        name="Call" 
        component={CallScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#128c7e',
        tabBarInactiveTintColor: '#667781',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'ChatsTab') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'CallsTab') {
            iconName = focused ? 'call' : 'call-outline';
          }
          return (
            <Ionicons 
              name={iconName} 
              size={focused ? 26 : 24} 
              color={color} 
            />
          );
        },
      })}
    >
      <Tab.Screen 
        name="ChatsTab" 
        component={ChatStack}
        options={{
          headerShown: false,
          tabBarLabel: 'CHATS',
        }}
      />
      <Tab.Screen 
        name="CallsTab" 
        component={CallsListScreen}
        options={{
          title: 'Calls',
          headerStyle: { backgroundColor: '#128c7e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
          tabBarLabel: 'CALLS',
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const { token, loadToken } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Load fonts and token from storage
    const initApp = async () => {
      try {
        // Load fonts
        await Font.loadAsync({
          ...Ionicons.font,
        });
        setFontsLoaded(true);
        
        // Load token
        await loadToken();
      } catch (error) {
        console.error('Error loading app:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initApp();
    
    // Initialize notifications
    initNotifications();
  }, []);

  useEffect(() => {
    if (token) {
      // Initialize socket when logged in
      const socket = initSocket(token);
      
      // Listen for incoming calls globally
      const { onIncomingCall } = require('./src/utils/socket');
      const { navigate } = require('./src/utils/navigationRef');
      
      onIncomingCall((callData) => {
        console.log('📞 Incoming call received:', callData);
        
        // Show incoming call alert
        Alert.alert(
          `${callData.callType === 'video' ? '📹' : '📞'} Incoming Call`,
          `${callData.call.caller?.name || 'Someone'} is calling...`,
          [
            {
              text: 'Decline',
              style: 'cancel',
              onPress: () => {
                const { endCall } = require('./src/utils/socket');
                endCall(callData.call.id);
              }
            },
            {
              text: 'Answer',
              onPress: () => {
                // Navigate to call screen
                navigate('Call', {
                  otherUser: callData.call.caller,
                  callType: callData.callType,
                  isIncoming: true,
                  callData: callData
                });
              }
            }
          ]
        );
      });
    }
  }, [token]);

  if (isLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#128c7e' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {!token ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : (
            <Stack.Screen name="Main" component={MainTabs} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
