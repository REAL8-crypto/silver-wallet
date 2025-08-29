# REAL8 Stellar Wallet

A simple and secure Stellar wallet application specifically designed for the REAL8 token, supporting both English and Spanish languages.

## Features

- **Multi-language Support**: Available in English and Spanish
- **Wallet Management**: Create new wallets or import existing ones using secret keys
- **Trustline Management**: Add trustlines for custom assets like REAL8
- **Liquidity Pool Participation**: Join and manage liquidity pools
- **Secure Key Storage**: Local storage of encrypted wallet keys
- **Modern UI**: Built with Material-UI for a clean, responsive interface

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn package manager

### Installation

```bash
npm install
npm start
```

### Production Build
```bash
npm run build
serve -s build -l 3001
```

## 📱 Mobile Installation

### PWA Installation
1. Open the app in your mobile browser
2. Look for "Add to Home Screen" option
3. Install as a native-like app

### APK Generation (Requires Node.js 20+)
```bash
# Initialize Capacitor (one time)
npx cap init "REAL8 Wallet" "com.real8.wallet"
npx cap add android

# Build APK
npm run build:android
```

**Note**: Current system uses Node.js 18.19.1. For APK generation, upgrade to Node.js 20+ or use cloud build services.

## 🔧 Configuration

### REAL8 Token Settings
- **Issuer**: `GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD`
- **Network**: Stellar Testnet (configurable in `WalletContext.tsx`)
- **Minimum Reserve**: 2 XLM for trustline creation

### Custom Logos
Place your logo files in the `public/` folder:
- `public/real8-logo.png` - Header logo (recommended: 200x40px)
- `public/real8-icon.png` - Token icon (24x24px)

## 🌐 Language Support

The app supports:
- **🇪🇸 Spanish** (default)
- **🇺🇸 English**

Switch languages using the flag buttons in the header.

## 🔗 External Links

The app includes contextual links to:
- **Help/Ayuda**: REAL8 purchase information
- **Contact/Contacto**: REAL8 support
- **Buy Direct/Compra Directa**: Direct REAL8 purchase

## 🛡️ Security Features

- **Local Storage**: Private keys stored locally (never transmitted)
- **Security Warnings**: Multiple warnings for private key access
- **Auto-Hide**: Private keys auto-hide after 30 seconds
- **Balance Checks**: Prevents insufficient balance transactions

## 🏗️ Technical Stack

- **Frontend**: React 19, TypeScript, Material-UI
- **Blockchain**: Stellar SDK v14
- **Localization**: i18next, react-i18next
- **QR Codes**: qrcode library
- **Mobile**: Capacitor (for APK generation)

## 📋 Version History

### v1.0.0 (2025-08-29)
- ✅ Complete wallet functionality (create, import, send, receive)
- ✅ REAL8 token trustline management
- ✅ Bilingual support (ES/EN) with flag navigation
- ✅ Mobile-responsive design
- ✅ Liquidity pool participation with balance display
- ✅ QR code generation for address sharing
- ✅ Secure private key access with warnings
- ✅ Language-specific external links
- ✅ XLM balance warnings for trustline creation
- ✅ PWA support for mobile installation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on mobile and desktop
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **Help**: [REAL8 Buy Guide](https://real8.org/en/buy-real8/)
- **Contact**: [REAL8 Support](https://real8.org/en/contact/)
- **Direct Purchase**: [Buy REAL8](https://real8.org/en/producto/eng/buy-real8/)

---

Built with ❤️ for the REAL8 ecosystem

## Network Configuration

The wallet is currently configured to use the Stellar Testnet. For production use, you'll need to:

1. Update the server configuration in `src/contexts/WalletContext.tsx`
2. Change the network passphrase from `Networks.TESTNET` to `Networks.PUBLIC`

## Security Notes

- **Never share your secret key** with anyone
- Store your secret key in a secure location
- The application stores keys locally - clear browser data will remove your wallet
- Always verify transaction details before confirming

## Technology Stack

- **React 18** with TypeScript
- **Material-UI (MUI)** for UI components
- **Stellar SDK** for blockchain interactions
- **i18next** for internationalization
- **React Context** for state management

## Available Scripts

### `npm start`
Runs the app in development mode on [http://localhost:3000](http://localhost:3000)

### `npm run build`
Builds the app for production to the `build` folder

### `npm test`
Launches the test runner

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please create an issue in the repository or contact the development team.
