# Changelog

All notable changes to the REAL8 Stellar Wallet project will be documented in this file.

## [2.2.8] - 20251009

### Added
- **Liquidity Pool Withdrawal System**
  - Complete withdraw/leave liquidity pool functionality
  - New `LeavePoolDialog` component with intuitive slider interface
  - Percentage-based withdrawal (0-100%) with visual slider controls
  - "Max" button for quick full withdrawal
  - Automatic calculation of proportional asset amounts
  - Real-time display of available pool shares
  - 5% slippage tolerance for withdrawals

- **Enhanced Pool Management UI**
  - "Withdraw" button appears when user has shares in a pool
  - Color-coded buttons: red for withdraw, blue for add/join
  - Side-by-side action buttons for pools with user participation
  - Separate dialogs for deposit and withdrawal operations
  - Auto-refresh pool data after successful operations

- **WalletContext Enhancements**
  - New `leaveLiquidityPool` function for pool withdrawals
  - Automatic minimum amount calculation with slippage protection
  - Pool share validation before withdrawal
  - Proportional asset distribution based on pool reserves
  - Comprehensive error handling and balance checks

### Changed
- **Pool Operation Flow**
  - Split pool operations into dedicated dialogs (join/add vs. withdraw)
  - Improved user feedback with action-specific success messages
  - Enhanced `PoolCard` to show both add and withdraw options
  - Better state management in `PoolsManager` for multiple dialogs

### Fixed
- **Price Calculation for Pool Deposits**
  - Fixed `op_bad_price` error by calculating price from deposit amounts instead of pool reserves
  - Updated price calculation: `exactPrice = maxAmountA / maxAmountB`
  - Reduced slippage tolerance from 15% to 10% (industry standard)
  - Added proper price bounds for `liquidityPoolDeposit` operation

- **Asset Parsing in Pool Operations**
  - Replaced problematic `Asset.fromOperation()` with custom `parseAssetFromReserve()` helper
  - Fixed `e.switch is not a function` error
  - Proper handling of native assets and issued assets from Horizon API
  - Correct parsing of asset strings in format "CODE:ISSUER"

### Technical
- Enhanced TypeScript interfaces for pool withdrawal operations
- Added `leaveLiquidityPool` to `WalletContextValue` type
- Improved error logging for pool operations with Horizon error details
- Better separation of concerns between join and leave pool workflows
- Proper cleanup of dialog state on open/close

## [2.2.7] - 20251009

### Fixed
- **Liquidity Pool Joining Error**
  - Resolved `REAL8:GBVYY.../XLM does not look like a liquidity pool ID` error in `PoolsManager.tsx` by using `pool.liquidityPoolId` (hexadecimal pool ID) instead of `pool.poolId` (asset pair string) in `joinLiquidityPool` calls.
  - Updated `WalletContext.tsx` to handle both `poolId` (hex) and asset-based inputs for `joinLiquidityPool`, fetching pool by assets if `poolId` is invalid or absent.
  - Removed unnecessary `poolId` prop from `JoinPoolDialog` in `WalletDashboard.tsx`, aligning with `JoinPoolDialogProps` interface.

### Changed
- **Liquidity Pool Handling**
  - Enhanced `joinLiquidityPool` in `WalletContext.tsx` to validate `poolId` as a 64-character hex string or fallback to asset-based pool lookup using `serverRef.current.liquidityPools().forAssets()`.
  - Improved error handling in `PoolsManager.tsx` with better snackbar messages for pool operation failures.
  - Ensured `PoolOperationDialog` in `PoolsManager.tsx` uses correct `liquidityPoolId` from `PoolDef` for consistent pool operations.

### Technical
- Improved TypeScript types in `WalletContext.tsx` for `joinLiquidityPool` parameters to support optional `poolId`.
- Added logging in `joinLiquidityPool` for debugging pool lookup and transaction submission.
- Ensured compatibility between `JoinPoolDialog` (asset-based) and `PoolOperationDialog` (pool ID-based) workflows.

## [2.2.6] - 20251003

### Added
- **Asset Transfer System**
  - Complete transfer functionality for all assets (XLM, REAL8, USDC, etc.)
  - Reusable TransferDialog component with validation and error handling
  - XLM reserve calculation (prevents account from becoming invalid)
  - Optional memo support (up to 28 characters)
  - "Max" button for quick balance transfers
  - Transfer actions integrated into Assets Management table

- **Asset Icons**
  - Visual icons for REAL8, wREAL8, XLM, USDC, EURC, SLVR, and GOLD
  - Consistent 32px icons in tables, 48px in asset lists
  - Rounded styling with padding to prevent cutoff
  - Icons displayed across Wallet Overview and Assets Management tabs

- **wREAL8 Token Support**
  - Added wrapped REAL8 (wREAL8) to curated assets list
  - Issuer: `GADYIWMD5P75ZHTVIIF6ADU6GYE5T7WRZIHAU4LPAZ4F5IMPD7NRK7V7`
  - Dedicated icon for wrapped variant
  - Full trustline and transfer support

- **Price Update Notifications**
  - Non-intrusive top-right notification during price updates
  - Smooth fade-in/fade-out transitions
  - Separate states for initial load vs. background updates

### Changed
- **API Rate Limiting Improvements**
  - Implemented 2-minute in-memory cache for price data
  - Request deduplication prevents duplicate simultaneous calls
  - Exponential backoff retry logic for 429 (rate limit) errors
  - Increased polling intervals: 10 minutes (asset prices), 3 minutes (REAL8 stats)
  - 200ms delay between sequential price fetches
  - Stale-while-revalidate pattern for smooth UX

- **User Experience**
  - Eliminated jerky reloading during price updates
  - Background updates no longer cause layout shifts
  - Asset icons improve visual asset identification
  - Better error messages for insufficient balance scenarios

### Fixed
- Invalid DOM nesting in SettingsPanel (Chip inside Typography)
- Rate limit errors from excessive Horizon API calls
- React Strict Mode causing doubled API requests in development
- Missing TypeScript types in price fetching hooks

### Technical
- Centralized caching system shared across hooks
- TypeScript improvements in `useAssetPrices` and `useReal8Stats`
- Proper error boundaries for price fetch failures
- Enhanced logging for debugging price data issues

## [2.0.1] - 20250911

### Added
- Auto-prefill of REAL8 issuer + asset code in Add Trustline dialog
- Comprehensive GitHub Copilot instructions for development workflow

### Changed
- Dialog state reset on open for AddAssetDialog (ensures accurate defaults)

### Fixed
- Intermittent placeholder display inconsistencies in stats values (standardized placeholder formatting)

### Developer
- Added clearer comments and guard conditions around trustline creation logic

## [1.0.1] - 20250812

### Added
- REAL8 stats card layout: responsive centered cards for PRICE (XLM / USD), TOTAL SUPPLY, CIRCULATING
- Fallback price calculation path (REAL8/XLM * XLM/USD) when direct REAL8/USD unavailable

### Changed
- Updated Settings panel tagline (removed previous gold/silver-backed phrasing)
- Moved price/number formatting logic into stats hook for better separation of concerns

### Fixed
- Missing issuer field requiring manual paste when adding REAL8 trustline

### Developer
- Improved internal structure of stats grid component (array-driven definitions)

## [1.0.0] - 20250727

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