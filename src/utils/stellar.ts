// Stellar SDK imports based on actual v14.x structure
import * as StellarSdk from '@stellar/stellar-sdk';

// Server is under the Horizon namespace
const Server = StellarSdk.Horizon.Server;

// Other classes are re-exported from stellar-base
const {
  Asset,
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Transaction,
  xdr,
  StrKey,
  TimeoutInfinite,
  Memo
} = StellarSdk;

// Re-export for consistency with existing code
export {
  Server,
  Asset,
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Transaction,
  xdr,
  StrKey,
  TimeoutInfinite,
  Memo
};

// TypeScript type alias for Asset instances
export type AssetInstance = InstanceType<typeof Asset>;

// Export the main SDK namespace
export default StellarSdk;