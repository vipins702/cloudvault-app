# 🎨 CloudVault Mobile App - Assets Checklist

This document lists all images and graphics needed for your mobile app.

---

## 📦 Required Assets

### 1. App Icon (iOS + Android)

**File:** `mobile-app/assets/icon.png`

**Specifications:**
- **Size:** 1024 × 1024 pixels
- **Format:** PNG (with transparency)
- **Color:** The CloudVault logo/icon
- **Background:** Transparent
- **Safe area:** Keep important content in center 512×512px

**iOS Requirements:**
- iOS will automatically round and add shine
- No need for separate iOS icons

**Android Requirements:**
- Foreground will be extracted (center 108×108dp safe area)
- Background color specified in app.json

**Design Suggestions:**
- ☁️ Cloud icon with upload arrow
- Blue and white color scheme (matches app)
- Simple, recognizable at small sizes
- Works well on all backgrounds

---

### 2. Adaptive Icon (Android)

**File:** `mobile-app/assets/adaptive-icon.png`

**Specifications:**
- **Size:** 512 × 512 pixels
- **Format:** PNG (with transparency)
- **Design:** Larger background + foreground element
- **Background:** Can extend to edges
- **Foreground:** Keep in center (safe area: 108×108dp of 512×512)

**Design Example:**
```
Background: Gradient blue (#0f172a to #2563eb)
Foreground: White cloud or upload icon (centered)
```

---

### 3. Splash Screen Image

**File:** `mobile-app/assets/splash.png`

**Specifications:**
- **Size:** 1284 × 2778 pixels (iPhone 14 Pro aspect ratio)
- **Format:** PNG
- **Background:** #0f172a (app's primary color)
- **Content:** 
  - App logo centered
  - "CloudVault" text
  - "Transfer Photos Anywhere" tagline
  - Loading spinner (optional, OS provides this)

**Design Tips:**
- Use portrait orientation
- Leave space at edges (safe area margins)
- Place logo/text in safe area
- Match app's dark theme

---

### 4. Web Favicon

**File:** `mobile-app/assets/favicon.png`

**Specifications:**
- **Size:** 192 × 192 pixels
- **Format:** PNG
- **Purpose:** Browser tab icon for web preview
- **Content:** Simplified version of app icon

---

## 🎬 App Store Graphics

### Google Play Store

#### 1. Feature Graphic

**File:** Featured image for Play Store listing

**Specifications:**
- **Size:** 1024 × 500 pixels
- **Format:** PNG or JPEG
- **Content:** 
  - "CloudVault - Transfer Photos"
  - Highlight 3-4 key features
  - Use app colors

**Example Layout:**
```
[Left Side - Icon]           [Right Side - Features]
  🎨 CloudVault               ✓ Transfer from iCloud
                              ✓ Multi-cloud backup
                              ✓ Real-time progress
                              ✓ Fast & Secure
```

#### 2. Screenshots (5 required)

**Specifications Per Screenshot:**
- **Size:** 1440 × 2560 pixels (9:16 aspect)
- **Format:** PNG or JPEG
- **Text:** Add overlays with descriptions
- **Phones:** Show actual app UI from screens

**Screenshot 1: Home Screen**
```
Title: "All Your Photos"
Description: "See 10,000+ photos from your device"
Shows: HomeScreen with photo grid
```

**Screenshot 2: Transfer - Select Source**
```
Title: "Transfer in Steps"
Description: "From iCloud, Google Photos, or more"
Shows: TransferPhotosScreen step 1
```

**Screenshot 3: Transfer - Progress**
```
Title: "Real-Time Progress"
Description: "Track your transfer with live updates"
Shows: ProgressView with 50% progress
```

**Screenshot 4: Connected Clouds**
```
Title: "Multi-Cloud Support"
Description: "iCloud, Google, OneDrive, Dropbox, AWS"
Shows: CloudConnectionsScreen with 3+ clouds
```

**Screenshot 5: Success**
```
Title: "Files Transferred"
Description: "Your photos are safe in multiple clouds"
Shows: Success/complete screen
```

#### 3. App Icon (Google Play)

**File:** For store listing

**Specifications:**
- **Size:** 512 × 512 pixels
- **Format:** PNG
- **No transparency:** Background must be solid
- **Padding:** 1/12 of size on each side

---

### Apple App Store

#### 1. App Preview (Optional Video)

**Specifications:**
- **Duration:** 15-30 seconds
- **Resolution:** 1080 × 1920 pixels (iPhone)
- **Format:** MP4
- **Content:** Screen recording of key flows

**Suggested Flows:**
1. Login → HomeScreen (5 sec)
2. Start transfer → Progress → Complete (10 sec)
3. Settings & features (5 sec)

#### 2. Screenshots (5 required)

**Specifications Per Screenshot:**
- **Size:** 1242 × 2208 pixels (iPhone 6.5")
- **Format:** PNG or JPEG
- **Alternative Sizes:**
  - iPhone 5.5": 1242 × 2208
  - iPad 10.5": 2048 × 2732

**Same 5 screenshots as Google Play:**
1. Home Screen
2. Transfer Select
3. Progress Tracking
4. Connected Clouds
5. Success Screen

#### 3. App Icon (App Store)

**Specifications:**
- **Size:** 1024 × 1024 pixels
- **Format:** PNG, JPEG, or GIF
- **No transparency:** Opaque background
- **No app name:** Icon only

---

## 🎨 Where to Create Assets

### Option 1: DIY with Figma (Free)

1. Go to [Figma.com](https://figma.com)
2. Create free account
3. Create project "CloudVault"
4. Design at 1024×1024 for icons
5. Use export feature to download PNG

**Templates to Start:**
- Search "App Icon Template" in Figma community

### Option 2: Use an AI Designer

1. **Midjourney:**
   ```
   "CloudVault app icon: blue cloud with upload arrow, 
   clean simple design, professional, works at 16x16 and 1024x1024"
   ```

2. **DALL-E:**
   ```
   "App icon for photo transfer service: cloud symbol with 
   arrow, blue and white, minimalist modern design"
   ```

3. **Adobe Express:** (free online tool)
   - Upload template
   - Add CloudVault branding
   - Export as PNG

### Option 3: Hire a Designer

- **Fiverr:** $5-50 for app icon package
- **99designs:** Professional but more expensive
- **Upwork:** Freelance designers

**Budget:** $0-200 for complete asset package

---

## 📝 Asset Checklist

### Must-Have (Before App Store Submission)
- [ ] App Icon (1024×1024)
- [ ] Adaptive Icon (512×512, Android only)
- [ ] Splash Screen (1284×2778)
- [ ] Feature Graphic (1024×500, Google Play)
- [ ] 5 Screenshots (1440×2560 Android, 1242×2208 iOS)
- [ ] Favicon (192×192)

### Nice-to-Have (For Better Store Listing)
- [ ] App Preview Video (15-30 sec, iOS)
- [ ] Banner Graphics (web, social media)
- [ ] Social Media Images (1200×630)

### Color Palette Reference

Use these colors for consistency:

```
Primary:
- Navy Blue: #0f172a (background)
- Blue: #2563eb (buttons, links)

Neutrals:
- Dark Gray: #111827 (cards)
- Medium Gray: #9ca3af (text secondary)
- Light Gray: #d1d5db (text tertiary)

Semantic:
- Success: #10b981 (green)
- Danger: #ef4444 (red)
- Warning: #f59e0b (orange)
```

---

## 🎯 Design Guidelines for Screenshots

### General Rules
- ✅ Show real app UI (screenshots from actual app)
- ✅ Use 2-3 text lines max
- ✅ Highlight key features
- ✅ Use bright contrasting colors
- ✅ Include app logo somewhere
- ✅ Maintain consistency between screenshots

### Text Guidelines
- ✅ Large, readable fonts (28pt+ for titles)
- ✅ High contrast (white text on dark background)
- ✅ Position text in safe area (not edges)
- ✅ Keep messaging clear and benefit-focused

### Example Layout for Screenshots

```
┌─────────────────────────────────┐
│  📱 App Screenshot Area         │
│  [Real photo grid or UI]        │
│                                 │
│  ┌──────────────────────────┐   │
│  │ 🔵 Feature Title         │   │
│  │ Description of feature   │   │
│  │ and why it's awesome     │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

---

## 💾 How to Export from App During Development

### Screenshot from Simulator (iOS)

```bash
# Run the app on iOS simulator
npm run ios

# Press Cmd + S to save screenshot
# Saved to: ~/Library/Logs/iOS\ Simulator/
```

### Screenshot from Emulator (Android)

```bash
# Run the app on Android emulator
npm run android

# Use Android Studio to capture
# Device → Take Screenshot
```

### Using Expo for Screenshots

```bash
# Use native screenshot tools:
# iOS Simulator: Cmd + S
# Android Emulator: Ctrl + Shift + S

# Or use Expo Go app and screenshot directly
npm start
# Scan QR code with Expo Go app
# Take screenshot of phone screen
```

---

## ⚙️ Placeholder Strategy

### While Developing

1. Use Figma free tier (no credit card needed)
2. Create basic shapes:
   - Circle with "☁️" emoji
   - Blue background
   - Text "CloudVault"
3. Export at 1024×1024
4. Use for all assets initially

### Before App Store

1. Once app is ready for launch
2. Invest in professional assets
3. Use tools like:
   - Figma (free, advanced)
   - Canva (free, simple)
   - DALL-E (paid, AI-generated)
4. Hire designer on Upwork/Fiverr if budget allows

---

## 🚀 Asset Delivery Timeline

### Week 1-2 (Development)
- Use placeholder emoji icons
- Basic colored backgrounds
- Placeholder screenshots

### Week 3 (Polish)
- Create final icons in Figma
- Take actual screenshots from app
- Add text overlays
- Export at required sizes

### Week 4 (Launch)
- Upload assets to app stores
- App stores process graphics
- App goes live!

---

## 📊 Asset File Sizes

Expected file sizes when done:

| Asset | Size | Notes |
|-------|------|-------|
| App Icon (1024×1024) | 50-100 KB | PNG |
| Adaptive Icon (512×512) | 30-50 KB | PNG |
| Splash Screen (1284×2778) | 200-400 KB | PNG, may be large |
| Feature Graphic (1024×500) | 100-200 KB | JPEG ok |
| Screenshots (each) | 300-500 KB | Compressed |
| Favicon (192×192) | 10-20 KB | PNG |

**Total package:** ~2-5 MB for all assets

---

## ✅ Ready to Create Assets!

### Quick Summary

1. **App Icon:** Simple cloud/upload symbol, blue, 1024×1024
2. **Splash:** App logo with "CloudVault" tagline, dark blue background
3. **Screenshots:** 5 images showing key features from the app
4. **Favicon:** Smaller version of app icon

### Next Steps

1. Use Figma (free) or emoji icon for now
2. Focus on getting app working first
3. Create professional assets in week 3
4. Upload to app stores in week 4

**Questions about assets? Check Figma tutorials or hire a designer on Fiverr!**

---

**Asset Pack Status: Ready to Create ✅**

You have all the specifications you need. Time to make CloudVault look amazing! 🎨
