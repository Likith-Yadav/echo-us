# EchoUs Mobile App

React Native (Expo) mobile app for EchoUs private chat and calling.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Expo CLI (if not installed)

```bash
npm install -g expo-cli
```

### 3. Configure Backend URL

Edit `src/config/api.js`:

```javascript
// For Android Emulator
export const API_URL = 'http://10.0.2.2:5000';
export const SOCKET_URL = 'http://10.0.2.2:5000';

// For iOS Simulator
// export const API_URL = 'http://localhost:5000';

// For Physical Device (same WiFi network)
// Find your computer's IP: ipconfig (Windows) or ifconfig (Mac/Linux)
// export const API_URL = 'http://192.168.1.100:5000';

// For Production (after deploying backend)
// export const API_URL = 'https://your-app.onrender.com';
```

### 4. Start Expo

```bash
npm start
```

This will open Expo Dev Tools in your browser.

### 5. Run on Device/Emulator

**Android Emulator:**
```bash
npm run android
# OR press 'a' in the terminal
```

**iOS Simulator (Mac only):**
```bash
npm run ios
# OR press 'i' in the terminal
```

**Physical Device:**
1. Install "Expo Go" app from App Store/Play Store
2. Scan the QR code shown in terminal
3. Make sure your phone and computer are on the same WiFi

## Features

### Screens

1. **LoginScreen** - User login
2. **RegisterScreen** - New user registration
3. **ChatScreen** - Main chat interface
4. **ProfileScreen** - User profile management
5. **CallScreen** - Voice/video calling

### State Management (Zustand)

- **authStore** - Authentication & user data
- **chatStore** - Messages & chat functionality

### Real-time Features

- Socket.io connection for live updates
- Message delivery in real-time
- Online/offline status
- Typing indicators
- Incoming call notifications

### WebRTC Calling

- Audio calls
- Video calls
- Mute/unmute
- Camera on/off
- Call duration tracking

## Testing the App

### Create Two Test Users

1. Click "Register" and create first account
2. Logout (from Profile screen)
3. Register second account
4. Now you have two users!

### Test on Two Devices

**Best Option:** Use two physical devices
- Install Expo Go on both phones
- Scan QR code on both
- Login with different accounts
- Start chatting!

**Alternative:** Emulator + Physical Device
- Run app on Android emulator
- Run app on your phone (via Expo Go)
- Login with different accounts on each

### Testing Features

✅ **Messaging:**
- Send text messages
- Upload images (tap 📎)
- See typing indicator
- Check read receipts

✅ **Calls:**
- Voice call (tap 📞)
- Video call (tap 📹)
- Mute/unmute during call
- Toggle camera (video calls)
- End call

✅ **Profile:**
- Update name, username, status
- Change profile picture
- View online status

## Troubleshooting

### App won't connect to backend?

1. **Check backend is running:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Verify URL in `api.js`:**
   - Android emulator: `http://10.0.2.2:5000`
   - iOS simulator: `http://localhost:5000`
   - Physical device: `http://YOUR_IP:5000`

3. **Find your IP address:**
   - Windows: `ipconfig` (look for IPv4)
   - Mac/Linux: `ifconfig` (look for inet)

### Socket not connecting?

1. Clear Expo cache:
   ```bash
   expo start -c
   ```

2. Restart app completely

3. Check if backend Socket.io is running (should see logs)

### Camera/Microphone permissions denied?

1. Go to device Settings → Apps → Expo Go
2. Enable Camera and Microphone permissions
3. Restart app

### Can't test calls on emulator?

- WebRTC requires physical devices for camera/microphone
- Use two physical devices or one physical + one emulator (limited)

### App crashes?

1. Clear Expo cache:
   ```bash
   expo start -c
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```

3. Check console for errors

### Images not uploading?

- Verify Cloudinary is configured in backend `.env`
- Check file size (max 10MB)
- Verify internet connection

## Project Structure

```
mobile/
├── src/
│   ├── screens/          # App screens
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── ChatScreen.js
│   │   ├── ProfileScreen.js
│   │   └── CallScreen.js
│   ├── store/           # Zustand state management
│   │   ├── authStore.js
│   │   └── chatStore.js
│   ├── utils/           # Utilities
│   │   ├── socket.js
│   │   └── notifications.js
│   └── config/          # Configuration
│       └── api.js
├── assets/              # Images & icons
├── App.js              # Root component
├── app.json            # Expo configuration
├── babel.config.js
└── package.json
```

## Building for Production

### Android APK

```bash
expo build:android
```

Follow prompts to configure signing.

### iOS IPA

```bash
expo build:ios
```

Requires Apple Developer account.

### Publish to Expo

```bash
expo publish
```

This creates a link you can share.

## Customization

### Change Theme Colors

The app uses indigo (`#6366f1`) as primary color. To change:

1. Find all instances of `#6366f1` in screen files
2. Replace with your color
3. Update `app.json` splash screen color

### Change App Name

Edit `app.json`:

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug"
  }
}
```

### Add App Icon

Replace files in `assets/`:
- `icon.png` (1024x1024)
- `splash.png` (1242x2436)
- `adaptive-icon.png` (1024x1024 for Android)

## Expo Commands

```bash
# Start dev server
expo start

# Clear cache
expo start -c

# Run on Android
expo run:android

# Run on iOS
expo run:ios

# Build APK
expo build:android

# Build IPA
expo build:ios

# Publish to Expo
expo publish
```

## Dependencies

Key packages:
- `expo` - React Native framework
- `react-navigation` - Navigation
- `socket.io-client` - Real-time communication
- `react-native-webrtc` - Video/voice calling
- `zustand` - State management
- `axios` - HTTP requests
- `expo-image-picker` - Image selection
- `expo-notifications` - Push notifications

## License

MIT

