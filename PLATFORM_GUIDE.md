# CloudVault - Complete Platform Guide

Your CloudVault app now exists as **both a web and mobile application**. This guide shows you how to run, develop, and launch both.

---

## 🌐 Web Application

**Location:** Root directory (src/, public/, etc.)

### Quick Start (Web)

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Features:**
- ✅ React 19.2 + TypeScript
- ✅ Vite for fast development
- ✅ Tailwind CSS styling
- ✅ Multi-cloud storage support
- ✅ OAuth integration (Google, Apple)
- ✅ Real-time progress tracking
- ✅ Responsive design

**URLs:**
- Development: http://localhost:5173
- Production: https://cloudvault.app

---

## 📱 Mobile Application

**Location:** `mobile-app/` folder

### What's Included

```
mobile-app/
├── App.tsx                    # Main app (navigation + auth)
├── screens/                   # 7 production screens
│   ├── LoginScreen           # Email/password auth
│   ├── SignupScreen          # New account registration
│   ├── SplashScreen          # Loading state
│   ├── HomeScreen            # View device photos
│   ├── TransferPhotosScreen  # 4-step transfer wizard
│   ├── CloudConnectionsScreen # Connect/manage clouds
│   └── SettingsScreen        # User preferences
├── package.json              # Dependencies
├── app.json                  # Expo config
├── eas.json                  # Build config
└── README_MOBILE_APP.md      # Complete mobile guide
```

### Quick Start (Mobile)

```bash
cd mobile-app

# Install dependencies
npm install

# Install Expo CLI globally
npm install -g eas-cli

# Create Expo account
eas login

# Run on Android
npm run android

# Run on iOS (Mac only)
npm run ios

# Build for production
npm run build:android
npm run build:ios
```

**Read:** `mobile-app/README_MOBILE_APP.md` for complete mobile setup guide

---

## 🎯 Platform Comparison

| Feature | Web | Mobile |
|---------|-----|--------|
| View photos | ✅ | ✅ |
| Transfer photos | ✅ | ✅ |
| Connect clouds | ✅ | ✅ |
| Device photo access | ✅ (upload) | ✅ (native) |
| Offline mode | ✅ (partial) | ✅ (full) |
| Background transfer | ✅ | ✅ |
| Push notifications | ✅ | ✅ |
| OAuth flow | ✅ | ✅ |
| Payment processing | ✅ | ✅ |

---

## 🚀 Development Workflow

### For Web Development

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Watch for changes
npm run type-check

# Terminal 3: Lint and format
npm run lint
```

### For Mobile Development

```bash
cd mobile-app

# Terminal 1: Start Expo
npm start

# Terminal 2: Run on Android
npm run android

# Or: Run on iOS
npm run ios
```

### Cross-Platform Testing

1. **Web:** Open http://localhost:5173 in browser
2. **Android:** Run on emulator or real device via Expo
3. **iOS:** Run on simulator or real device via Expo (Mac only)

---

## 🔐 Authentication

Both web and mobile use the same backend authentication:

```
Login Flow:
1. User enters email + password
2. Backend validates credentials
3. JWT token generated
4. Token stored securely (web: localStorage, mobile: SecureStore)
5. Token sent in Authorization header for API calls
6. Token refreshed automatically when expired
```

### OAuth Integration (Google + Apple)

**Google OAuth:**
- Both web and mobile use Google Photos Library API
- Redirect URI: https://auth.expo.io/@your-username/cloudvault

**Apple OAuth:**
- iOS: Native Sign in with Apple
- Web: JavaScript SDK

Setup in `.env.local`:
```env
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your_secret
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your_secret
```

---

## ☁️ Multi-Cloud Integration

Both platforms support:

1. **iCloud Photos** - Apple's native photo storage
2. **Google Photos** - Google's photo library API
3. **Google Drive** - File storage
4. **OneDrive** - Microsoft cloud storage
5. **Dropbox** - Cloud storage
6. **AWS S3** - Object storage
7. **Supabase** - PostgreSQL + object storage
8. **Vercel Blob** - Edge-optimized blob storage
9. **Azure Blob** - Microsoft cloud storage
10. **Cloudflare R2** - S3-compatible storage

Configuration in `src/lib/storage-api.ts` (web) and backend (mobile).

---

## 📊 Backend Architecture

Both web and mobile connect to the same backend:

```
CloudVault Backend (Vercel Functions + PostgreSQL)
├── /api/auth         # Authentication
├── /api/upload       # File uploads
├── /api/migrate      # Photo migration
├── /api/clouds       # Cloud service management
├── /api/transfer     # Transfer progress
└── /api/payments     # Stripe integration
```

**Database:** Neon PostgreSQL

**Tables:**
- users (email, password, profile)
- clouds (user's connected services)
- transfers (migration jobs, progress, status)
- payments (subscription, invoices)

---

## 💰 Monetization

### Web: Stripe Payments

```typescript
// src/lib/payments.ts
const stripe = Stripe(STRIPE_PUBLIC_KEY);
// Handle payment for Pro subscription
```

### Mobile: In-App Purchases

```typescript
// mobile-app/screens/SettingsScreen.tsx
// iOS StoreKit 2 + Android Google Play Billing
```

### Pricing Tiers

| Plan | Web | Mobile | Price |
|------|-----|--------|-------|
| Free | ✅ | ✅ | Free |
| Pro | ✅ | ✅ | $4.99/mo |
| Yearly | ✅ | ✅ | $39.99/yr |
| Lifetime | ✅ | ✅ | $29.99 |

---

## 📈 Analytics & Monitoring

### Web Analytics
- Google Analytics 4
- Sentry for error tracking
- LogRocket for session replay

### Mobile Analytics  
- Firebase Analytics
- Sentry for crashes
- Apple Analytics

Setup in environment variables:
```env
VITE_GA_ID=G-XXXXXXXXX
VITE_SENTRY_DSN=https://...
EXPO_PUBLIC_FIREBASE_CONFIG={...}
```

---

## 🧪 Testing

### Web Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Mobile Testing

```bash
cd mobile-app

# Run on Android emulator
npm run android

# Run on iOS simulator  
npm run ios

# Build for testing
eas build --platform all
```

---

## 🚀 Deployment

### Web Deployment (Vercel)

```bash
# Push to GitHub
git push origin main

# Vercel auto-deploys from main branch
# Or manually:
vercel deploy --prod

# Result: https://cloudvault.app
```

### Mobile Deployment (App Stores)

**Android (Google Play):**
```bash
cd mobile-app
eas build --platform android --auto-submit
# Builds and submits to Google Play
# Review time: 24-48 hours
```

**iOS (Apple App Store):**
```bash
cd mobile-app
eas build --platform ios --auto-submit
# Builds and submits to App Store
# Review time: 24-72 hours
```

Full guide: `mobile-app/README_MOBILE_APP.md`

---

## 🆘 Troubleshooting

### Web Issues

| Problem | Solution |
|---------|----------|
| Port 5173 in use | `lsof -i :5173` then kill process |
| Build fails | Delete node_modules, run `npm install` |
| TypeScript errors | Run `npm run type-check` |
| Styling broken | Check Tailwind CSS is compiled |

### Mobile Issues

| Problem | Solution |
|---------|----------|
| Photos not loading | Check MediaLibrary permissions |
| OAuth fails | Verify redirect URI matches console |
| Build hangs | Run `expo prebuild --clean` |
| Emulator slow | Use Android Studio emulator (faster) |

### Backend Issues

| Problem | Solution |
|---------|----------|
| API 503 | Check backend service status |
| Token expired | Automatically refreshed by SDK |
| CORS error | Check backend Origin whitelist |
| Database error | Check Neon PostgreSQL status |

---

## 📚 Documentation

### Web
- `README.md` - Project overview
- `MOBILE_APP_SETUP.md` - Mobile quickstart
- `src/lib/api.ts` - API client
- `src/App.tsx` - Main app component

### Mobile
- `mobile-app/README_MOBILE_APP.md` - Complete guide
- `mobile-app/App.tsx` - Navigation setup
- `mobile-app/screens/*.tsx` - Screen components

### Backend
- API documentation: https://api.cloudvault.app/docs
- Database schema: docs/schema.sql

---

## 🎯 Quick Links

### Getting Started
- [Web Setup](./README.md)
- [Mobile Setup](./mobile-app/README_MOBILE_APP.md)

### Deployment
- [Web: Deploy to Vercel](https://vercel.com/docs/concepts/deployments)
- [Mobile: Submit to App Stores](./mobile-app/README_MOBILE_APP.md#-app-store-submission)

### APIs
- [Google Photos API](https://developers.google.com/photos)
- [Google Drive API](https://developers.google.com/drive)
- [Stripe API](https://stripe.com/docs)

---

## 📞 Support

- 📧 Email: support@cloudvault.app
- 🐛 Issues: GitHub Issues
- 💬 Discussion: GitHub Discussions

---

## ✅ Your Complete Platform

You now have a professional multi-platform cloud photo application:

✅ **Web App** - React + TypeScript + Vite
✅ **Mobile App** - React Native + Expo
✅ **Backend** - Vercel Functions + PostgreSQL
✅ **OAuth** - Google + Apple authentication
✅ **Multi-Cloud** - 10+ storage providers
✅ **Payments** - Stripe + In-App Purchases
✅ **Analytics** - Firebase + Sentry

**Next Steps:**
1. Choose which platform to launch first (recommend: mobile)
2. Follow the setup guides in each folder
3. Test thoroughly on your target platforms
4. Deploy to production
5. Monitor user feedback and iterate

**Let's launch CloudVault! 🚀**
