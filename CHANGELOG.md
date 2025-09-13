# Changelog

All notable changes to the REAL8 Stellar Wallet project will be documented in this file.

## [1.0.1] - 2025-09-12

### Added
- REAL8 stats card layout: responsive centered cards for PRICE (XLM / USD), TOTAL SUPPLY, CIRCULATING
- Fallback price calculation path (REAL8/XLM * XLM/USD) when direct REAL8/USD unavailable
- Auto-prefill of REAL8 issuer + asset code in Add Trustline dialog
- Comprehensive GitHub Copilot instructions for development workflow

### Changed
- Updated Settings panel tagline (removed previous gold/silver-backed phrasing)
- Moved price/number formatting logic into stats hook for better separation of concerns
- Dialog state reset on open for AddAssetDialog (ensures accurate defaults)

### Fixed
- Missing issuer field requiring manual paste when adding REAL8 trustline
- Intermittent placeholder display inconsistencies in stats values (standardized placeholder formatting)

### Developer
- Improved internal structure of stats grid component (array-driven definitions)
- Added clearer comments and guard conditions around trustline creation logic

## [1.0.0] - 2025-08-29

### 🎉 Initial Release

#### Added
- **Core Wallet Functionality**
  - Stellar wallet creation and import
  - Send and receive XLM payments
  - Real-time balance tracking
  - Secure local storage of private keys

- **REAL8 Token Integration**
  - Pre-configured REAL8 token issuer
  - Trustline management with balance warnings
  - Custom REAL8 branding support

- **Bilingual Support**
  - Full Spanish and English localization
  - Flag-based language switcher in header
  - Language-specific external links

- **Mobile Experience**
  - Responsive design for all screen sizes
  - PWA support for mobile installation
  - Touch-friendly interface

- **Security Features**
  - Private key access with security warnings
  - Auto-hide private key after 30 seconds
  - Balance requirement warnings
  - Secure clipboard operations

- **Advanced Features**
  - Liquidity pool participation
  - QR code generation for address sharing
  - Asset balance display in pool dialogs
  - External links to REAL8 resources

#### Technical Details
- React 19 with TypeScript
- Material-UI v7 for components
- Stellar SDK v14 for blockchain operations
- i18next for internationalization
- QRCode library for QR generation
- Capacitor ready for mobile builds

#### External Links
- Help: Language-specific REAL8 guides
- Contact: REAL8 support pages
- Buy Direct: Direct REAL8 purchase links

### 🔧 Configuration
- Default language: Spanish
- Network: Stellar Testnet
- REAL8 Issuer: `GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD`
- Minimum XLM for trustlines: 2 XLM

### 📱 Mobile Support
- PWA manifest configured
- Responsive breakpoints implemented
- Touch-optimized interactions
- APK generation ready (requires Node.js 20+)