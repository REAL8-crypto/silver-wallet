// Runtime-safe helper module that normalizes the different module shapes of @stellar/stellar-sdk
// (ESM default vs CommonJS/namespace)

import * as StellarSdkNS from '@stellar/stellar-sdk';

// Normalize runtime shape to handle both ESM default and CommonJS/namespace imports
const StellarSdk: any = (StellarSdkNS as any).default || StellarSdkNS;

// Export commonly used members for direct access
export const Server = StellarSdk.Horizon.Server;
export const Asset = StellarSdk.Asset;
export const Keypair = StellarSdk.Keypair;
export const TransactionBuilder = StellarSdk.TransactionBuilder;
export const Networks = StellarSdk.Networks;
export const Operation = StellarSdk.Operation;
export const Transaction = StellarSdk.Transaction;
export const xdr = StellarSdk.xdr;
export const StrKey = StellarSdk.StrKey;
export const TimeoutInfinite = StellarSdk.TimeoutInfinite;
export const Memo = StellarSdk.Memo;

// TypeScript type alias for Asset instances
export type AssetInstance = InstanceType<typeof StellarSdk.Asset>;

// Default export of the normalized StellarSdk
export default StellarSdk;