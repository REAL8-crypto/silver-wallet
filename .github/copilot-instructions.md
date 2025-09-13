# REAL8 Stellar Wallet

REAL8 Stellar Wallet is a React 18 + TypeScript web application for managing Stellar wallets, specifically designed for the REAL8 token ecosystem. The application supports multi-language functionality (Spanish/English), mobile PWA installation, and Android APK generation via Capacitor.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap, Build, and Test the Repository
- `npm install` -- **57 seconds**. NEVER CANCEL. Set timeout to 2+ minutes.
- `npm run build` -- **52 seconds**. NEVER CANCEL. Set timeout to 2+ minutes.
- `npm start` -- **15 seconds to compile**. Development server starts on http://localhost:3000
- `npm test -- --watchAll=false` -- **FAILS due to Jest ES module configuration**. Do not attempt to fix tests unrelated to your changes.

### Production Serving
- `npm run build` then `npx serve -s build -l 3001` -- Serves production build
- Alternative: `npm install -g serve` then `serve -s build -l 3001`

### Mobile Development (Android)
- **Prerequisites**: Node.js 20+ (available in this environment)
- **One-time setup**: 
  - `npx cap init "REAL8 Wallet" "com.real8.wallet"` -- **Under 1 second**
  - `npx cap add android` -- **Under 1 second**
- **Build process**: `npm run build:android` -- **31 seconds total**. NEVER CANCEL. Set timeout to 2+ minutes.
  - This runs: `npm run build && npx cap copy && npx cap run android`
  - The `npx cap run android` will fail without Android emulator, but build succeeds
- **Copy only**: `npx cap copy android` -- **Under 1 second**

## Validation

### Manual Testing Requirements
- **ALWAYS validate application functionality** after making changes by opening the built application in a browser
- **Test the wallet creation flow**: Click "Crear Nueva Billetera" (Create New Wallet) and verify the interface responds correctly
- **Test navigation**: Verify back buttons and basic UI interactions work properly
- **Screenshot validation**: Take screenshots of any UI changes to document the impact

### Known Issues and Workarounds
- **Test suite fails** with Jest ES module configuration errors. This is a known issue with Stellar SDK v14.1.1 and React Scripts. Do not attempt to fix unless directly related to your changes.
- **Stellar SDK import pattern**: Use `import * as StellarSdk from "@stellar/stellar-sdk"` with type workarounds. The Server class is at `(StellarSdk as any).Horizon.Server`.
- **Build warnings**: ESLint warnings about unused imports in `src/components/WalletDashboard.tsx` are non-blocking and expected.

### CI/CD Considerations
- **No GitHub Actions** are configured in this repository
- **Netlify deployment** is configured in `netlify.toml` with Node.js 20 environment
- **Legacy peer dependencies** are required (.npmrc contains `legacy-peer-deps=true`)

## Key Technologies and Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Material-UI v7** for components and theming
- **Stellar SDK v14.1.1** for blockchain interactions
- **i18next** for internationalization (Spanish/English)
- **QRCode library** for QR code generation

### Mobile Support
- **Capacitor v7.4.3** for mobile app generation
- **PWA manifest** configured for web app installation
- **Android build** ready with proper configuration in `capacitor.config.ts`

### Configuration Files
- `package.json` -- Dependencies and scripts
- `tsconfig.json` -- TypeScript configuration
- `babel.config.js` -- Babel configuration for React
- `config-overrides.js` -- Custom webpack configuration for Stellar SDK
- `netlify.toml` -- Deployment configuration
- `capacitor.config.ts` -- Mobile app configuration

## Project Structure

### Source Code (`src/`)
- `contexts/WalletContext.tsx` -- **CRITICAL**: Stellar wallet state management and blockchain operations
- `components/` -- React components for wallet functionality
- `translations/` -- i18next language files (Spanish/English)
- `i18n.ts` -- Internationalization configuration

### Key Entry Points
- `src/App.tsx` -- Main application component
- `src/index.tsx` -- Application entry point
- `public/` -- Static assets including logos and PWA manifest

### Build Outputs
- `build/` -- Production build output (gitignored)
- `android/` -- Capacitor Android project (committed)

## Common Commands and Expected Results

### Development Workflow
```bash
# Install dependencies (required after clone)
npm install  # 57 seconds

# Start development server
npm start    # 15 seconds to compile, runs on port 3000

# Build for production
npm run build  # 52 seconds

# Serve production build
npx serve -s build -l 3001  # Immediate
```

### Mobile Development Workflow
```bash
# Initialize Capacitor (one-time)
npx cap init "REAL8 Wallet" "com.real8.wallet"  # Under 1 second

# Add Android platform (one-time)
npx cap add android  # Under 1 second

# Build and deploy to Android
npm run build:android  # 31 seconds total

# Copy web assets only
npx cap copy android  # Under 1 second
```

### Repository Information
```bash
# View repository structure
ls -la
# Key files: package.json, README.md, src/, public/, android/

# Check current status
git status

# View package.json for dependencies
cat package.json
```

## Environment Requirements

### Node.js and Dependencies
- **Node.js 20+** (available in this environment)
- **NPM 10.8.2** (included)
- **Legacy peer dependencies** required (configured in .npmrc)

### Browser Compatibility
- **Modern browsers** supporting ES6+ features
- **Mobile browsers** for PWA functionality
- **Chrome/Edge/Firefox/Safari** latest versions

## Troubleshooting

### Build Issues
- **NEVER CANCEL builds** - they take 45-60 seconds normally
- **Stellar SDK import errors**: Use the pattern shown in `src/contexts/WalletContext.tsx`
- **Webpack polyfill issues**: Already configured in `config-overrides.js`

### Runtime Issues
- **Module loading errors**: Verify Stellar SDK imports follow the correct pattern
- **Network connectivity**: Application uses Stellar Mainnet by default
- **Mobile issues**: Test PWA functionality before building APK

### Test Issues
- **Jest configuration**: Known issue with ES modules, do not fix unless essential
- **Component testing**: Focus on manual browser testing for validation

## External Links and Resources
- **REAL8 Website**: https://real8.org/
- **Stellar Network**: Application connects to Stellar Mainnet
- **Help Documentation**: Linked within the application interface

---

**REMEMBER**: Always build and validate your changes by serving the application and testing core functionality. Take screenshots of UI changes to document impact.