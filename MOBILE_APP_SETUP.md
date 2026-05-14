# 📱 CloudVault Mobile App - iOS & Android

## 🚀 Quick Setup (30 minutes to working app)

### **Step 1: Create React Native Project**

```bash
# Install Expo CLI
npm install -g eas-cli

# Create new project
npx create-expo-app CloudVaultMobile
cd CloudVaultMobile

# Install dependencies
npm install \
  @react-navigation/native \
  @react-navigation/bottom-tabs \
  @react-navigation/native-stack \
  react-native-gesture-handler \
  react-native-screens \
  expo-media-library \
  expo-auth-session \
  expo-secure-store \
  expo-camera \
  @expo/vector-icons
```

### **Step 2: Copy Mobile App Files**

```bash
# Copy all files from mobile-app/ folder to your project
cp -r mobile-app/screens ./screens
cp mobile-app/App.tsx ./App.tsx
```

### **Step 3: Run on Android or iOS**

**Android (Real Device or Emulator):**
```bash
npm run android
```

**iOS (Mac Only):**
```bash
npm run ios
```

**Web Preview:**
```bash
npm run web
```

---

## 📋 File Structure

```
CloudVaultMobile/
├── App.tsx                          # Main app component
├── screens/
│   ├── SplashScreen.tsx             # Loading screen
│   ├── LoginScreen.tsx              # User login
│   ├── SignupScreen.tsx             # New account
│   ├── HomeScreen.tsx               # View device photos
│   ├── TransferPhotosScreen.tsx     # Transfer flow
│   ├── CloudConnectionsScreen.tsx   # Manage clouds
│   └── SettingsScreen.tsx           # App settings
├── app.json                         # Expo config
├── package.json                     # Dependencies
└── eas.json                         # Build config
```

---

## 🔐 OAuth Setup (Google & Apple)

### **Google OAuth (Both iOS & Android)**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable APIs:
   - Google Photos Library API
   - Google Drive API
4. Create OAuth 2.0 credentials:
   - Type: Web application
   - Authorized redirect URIs:
     ```
     https://auth.expo.io/@your-username/cloudvault
     exp://localhost:19000
     ```
5. Copy Client ID and Secret to `.env.local`

### **Apple OAuth (iOS Only)**

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Create new App ID
3. Enable "Sign in with Apple"
4. Create service ID for web auth
5. Configure return URLs:
   ```
   https://auth.expo.io/@your-username/cloudvault
   ```

### **Set Environment Variables**

Create `.env.local`:
```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your_secret
EXPO_PUBLIC_APPLE_CLIENT_ID=com.example.cloudvault
EXPO_PUBLIC_API_URL=https://api.cloudvault.app
```

---

## 🛠️ Development Features

### **HomeScreen - Access Device Photos**
```typescript
// Automatically shows all photos on device
// Uses native media library access
// Displays in grid format (3 columns)
```

### **TransferPhotosScreen - Cloud Transfer**
```typescript
// 4-step flow:
// 1. Select source (iCloud/Google Photos/Google Drive)
// 2. Select destination
// 3. Confirm transfer
// 4. Track progress in real-time
```

### **CloudConnectionsScreen - Manage Connections**
```typescript
// Connect/disconnect cloud services
// View storage usage
// Manage permissions
```

### **SettingsScreen - User Settings**
```typescript
// Profile management
// Privacy settings
// Notification preferences
// Account settings
```

---

## 📦 Build for Production

### **Option 1: Expo (Easiest)**

```bash
# Install Expo CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Both platforms
eas build --platform all
```

### **Option 2: Android (Direct)**

```bash
# Generate keystore (one time)
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias

# Build APK
npx react-native build-android --variant=release

# Or use Gradle
cd android && ./gradlew assembleRelease
```

### **Option 3: iOS (Direct - Mac Only)**

```bash
# Build for app store
cd ios
xcodebuild -workspace CloudVault.xcworkspace -scheme CloudVault -configuration Release

# Or use Xcode UI
open CloudVault.xcworkspace
# Select "Product" → "Archive"
```

---

## 🎬 Features Overview

### **Home Tab - View Photos**
- ✅ Display all device photos
- ✅ Photos in grid layout (3 columns)
- ✅ Swipe to view full screen
- ✅ Tap to select multiple
- ✅ Quick actions: Backup, Share

### **Transfer Tab - Move Photos**
- ✅ iCloud ↔ Google Photos
- ✅ Google Photos ↔ Google Drive
- ✅ Any → Any cloud
- ✅ Real-time progress
- ✅ Background transfer
- ✅ Resume on failure

### **Clouds Tab - Manage Services**
- ✅ Connect/disconnect clouds
- ✅ View storage usage per cloud
- ✅ Manage permissions
- ✅ Remove accounts

### **Settings Tab - Preferences**
- ✅ Profile management
- ✅ Notification settings
- ✅ Privacy settings
- ✅ Help & support
- ✅ Sign out

---

## 🔒 Permissions Required

### **Android**
```xml
<!-- In AndroidManifest.xml -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### **iOS**
```xml
<!-- In Info.plist -->
<key>NSPhotoLibraryUsageDescription</key>
<string>CloudVault needs access to your photos to transfer them</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>CloudVault needs permission to save transferred photos</string>
```

---

## 🚀 Deploy to App Stores

### **Google Play Store**

1. Create Google Play Developer account ($25 one-time)
2. Create app bundle:
   ```bash
   cd android && ./gradlew bundleRelease
   ```
3. Upload to Google Play Console
4. Set pricing and description
5. Submit for review (typically 4-24 hours)

### **Apple App Store**

1. Create Apple Developer account ($99/year)
2. Archive app in Xcode
3. Upload to App Store Connect
4. Add screenshots, description, pricing
5. Submit for review (typically 24-48 hours)

---

## 📊 App Store Screenshots (What to Create)

**Screenshot 1: Home**
- Title: "All Your Photos in One Place"
- Description: "See all 10,000+ photos from your device"

**Screenshot 2: Transfer**
- Title: "Transfer in Minutes"
- Description: "Move from iCloud to Google Drive with one tap"

**Screenshot 3: Multi-Cloud**
- Title: "Backup to Multiple Clouds"
- Description: "Sync with AWS, Google, iCloud, and more"

**Screenshot 4: Progress**
- Title: "Real-Time Progress"
- Description: "Track your transfer with live updates"

**Screenshot 5: Complete**
- Title: "Never Lose Your Photos"
- Description: "Always backed up across multiple clouds"

---

## 💰 Monetization in Mobile App

### **Free Tier**
- 100 photos/month
- Display ads

### **Pro Tier ($4.99/month)**
- Unlimited transfers
- No ads
- Priority support

### **In-App Purchases**
```typescript
// Use React Native IAP
npm install react-native-iap

// Available purchases:
- Pro Subscription: $4.99/month
- Lifetime Pro: $29.99 one-time
- Extra Cloud Connections: $9.99
- Priority Support: $2.99/month
```

---

## 🧪 Testing

### **Unit Tests**
```bash
npm test
```

### **Integration Tests**
```bash
npm run test:integration
```

### **Device Testing**
1. Test on real iPhone
2. Test on real Android
3. Test on emulator/simulator
4. Test slow networks
5. Test interrupted transfers

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Photos not loading | Check media library permission |
| OAuth fails | Verify redirect URIs in console |
| Transfer hangs | Enable background task permission |
| App crashes on launch | Check API connectivity |
| Build fails | Clear cache: `expo prebuild --clean` |

---

## 📞 Support & Notifications

### **Push Notifications Setup**

```bash
# Install Expo Notifications
npm install expo-notifications

# Configure in app.json
```

### **What to Notify Users About**
- ✅ Transfer started
- ✅ Transfer complete
- ✅ Transfer failed (with error)
- ✅ New cloud connected
- ✅ Storage limit warning

---

## 🎯 Launch Checklist

- [ ] OAuth set up for Google & Apple
- [ ] All screens working on iOS
- [ ] All screens working on Android
- [ ] Transfer feature tested (10+ transfers)
- [ ] Background task working
- [ ] Notifications working
- [ ] Permissions prompts working
- [ ] Error handling in place
- [ ] Screenshots created
- [ ] Description written
- [ ] Privacy policy created
- [ ] Terms of service created
- [ ] App store listing complete
- [ ] Pricing set
- [ ] Test build uploaded to testers
- [ ] Beta testing feedback collected
- [ ] All bugs fixed
- [ ] Final build created
- [ ] Submitted to app stores

---

## 📱 Next Steps

1. **Week 1:** Setup Expo project + basic screens
2. **Week 2:** Implement OAuth + transfers
3. **Week 3:** Testing + bug fixes
4. **Week 4:** Submit to app stores
5. **Week 5:** Launched + monitoring

---

**Your app will be on both iOS and Android app stores in 4 weeks. Ready to start?**
