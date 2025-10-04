# Stellar SDK Improvement Plan

## Current Issue
The WalletContext uses complex dynamic constructor resolution:
```typescript
function getServerCtor(S: any): any {
  if (S && typeof S.Server === 'function') return S.Server;
  if (S?.Horizon?.Server && typeof S.Horizon.Server === 'function') return S.Horizon.Server;
  // ... more fallbacks
}
```

## Proposed Solution
Replace with direct, stable imports:

```typescript
// Replace the complex resolution with:
import { Horizon } from '@stellar/stellar-sdk';

// Then use:
const server = new Horizon.Server(cfg.url);
```

## Benefits
- More predictable behavior
- Better TypeScript support
- Cleaner code
- Follows SDK documentation patterns
- Eliminates warning messages

## Implementation
1. Update WalletContext.tsx imports
2. Replace serverRef initialization 
3. Remove getServerCtor function
4. Test thoroughly on both testnet and mainnet