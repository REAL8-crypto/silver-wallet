# APK Build Instructions for REAL8 Wallet

## 🚨 Node.js Version Requirement

**Current Issue**: The system is running Node.js 18.19.1, but Capacitor CLI requires Node.js 20+.

## 🔧 Solutions for APK Generation

### Option 1: Upgrade Node.js (Recommended)
```bash
# Install Node.js 20+ using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Verify version
node --version  # Should show v20.x.x

# Then build APK
npx cap init "REAL8 Wallet" "com.real8.wallet"
npx cap add android
npm run build:android
```

### Option 2: Cloud Build Services
Use online services that support Capacitor builds:
- **Ionic Appflow**: https://ionic.io/appflow
- **GitHub Actions**: Set up CI/CD with Node.js 20
- **Netlify Build**: Configure build environment

### Option 3: Docker Build
```bash
# Create Dockerfile with Node.js 20
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npx cap init "REAL8 Wallet" "com.real8.wallet"
RUN npx cap add android
RUN npx cap build android
```

### Option 4: Manual Android Studio Build
1. Build the web app: `npm run build`
2. Initialize Capacitor with Node.js 20+ environment
3. Open in Android Studio
4. Build APK manually

## 📱 Current Working Alternative: PWA

The app is fully functional as a PWA:
1. Open `http://192.168.18.9:3001` on mobile
2. Add to Home Screen
3. Works like a native app

## 🔄 Build Commands (When Node.js 20+ Available)

```bash
# One-time setup
npx cap init "REAL8 Wallet" "com.real8.wallet"
npx cap add android

# Build process
npm run build
npx cap copy
npx cap open android  # Opens Android Studio
# Or
npx cap run android   # Builds and runs directly
```

## 📋 APK Configuration

The `capacitor.config.ts` will be created with:
```typescript
{
  appId: 'com.real8.wallet',
  appName: 'REAL8 Wallet',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  }
}
```
