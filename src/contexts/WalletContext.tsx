import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as StellarSdkNS from '@stellar/stellar-sdk';

// Comprehensive interop pattern that handles all bundler scenarios
let StellarSdk: any;

// Check if we have a default export (ESM)
if ((StellarSdkNS as any).default && typeof (StellarSdkNS as any).default === 'object') {
  StellarSdk = (StellarSdkNS as any).default;
} else if (typeof StellarSdkNS === 'object' && (StellarSdkNS as any).Server) {
  // Direct namespace with named exports
  StellarSdk = StellarSdkNS;
} else {
  // Fallback to namespace or whatever we have
  StellarSdk = StellarSdkNS;
}

// Double-check the extracted objects exist, with fallbacks
const Server = StellarSdk.Server || (StellarSdkNS as any).Server;
const Asset = StellarSdk.Asset || (StellarSdkNS as any).Asset;
const Keypair = StellarSdk.Keypair || (StellarSdkNS as any).Keypair;
const TransactionBuilder = StellarSdk.TransactionBuilder || (StellarSdkNS as any).TransactionBuilder;
const Networks = StellarSdk.Networks || (StellarSdkNS as any).Networks;
const Operation = StellarSdk.Operation || (StellarSdkNS as any).Operation;

// Runtime validation to ensure we have the constructors we need
if (!Server || typeof Server !== 'function') {
  throw new Error('Stellar SDK Server constructor not found. Please check your build configuration.');
}
if (!Asset || typeof Asset !== 'function') {
  throw new Error('Stellar SDK Asset constructor not found. Please check your build configuration.');
}

// Type alias for Asset instances
type AssetInstance = InstanceType<typeof StellarSdkNS.Asset>;

// Production Horizon and network passphrase
export const HORIZON_SERVER_URL = "https://horizon.stellar.org";
export const server = new Server(HORIZON_SERVER_URL);
export const NETWORK_PASSPHRASE = Networks.PUBLIC;

interface BalanceItem {
  asset_type: string; // "native" or "credit_alphanum4"/"credit_alphanum12"
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

interface WalletContextProps {
  publicKey: string | null;
  secretKey: string | null;
  balance: string;
  balances: BalanceItem[];
  loading: boolean;
  error: string | null;
  connectWallet: (secretKey: string) => Promise<void>;
  createWallet: () => void;
  importWallet: (secretKey: string) => Promise<void>;
  disconnect: () => void;
  addTrustline: (assetCode: string, issuer: string) => Promise<void>;
  sendPayment: (
    destination: string,
    amount: string,
    assetCode?: string,
    issuer?: string
  ) => Promise<void>;
  joinLiquidityPool: (
    assetA: AssetInstance,
    assetB: AssetInstance,
    amountA: string,
    amountB: string
  ) => Promise<void>;
}

const WalletContext = createContext<WalletContextProps | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Computed XLM balance
  const balance = balances.find(b => b.asset_type === "native")?.balance || "0";

  useEffect(() => {
    if (publicKey) {
      fetchBalance(publicKey);
    } else {
      setBalances([]);
    }
  }, [publicKey]);

  const fetchBalance = async (accountId: string) => {
    try {
      setLoading(true);
      const account = await server.loadAccount(accountId);
      const accountBalances: BalanceItem[] = account.balances.map((b: any) => ({
        asset_type: b.asset_type,
        asset_code: b.asset_code || undefined,
        asset_issuer: b.asset_issuer || undefined,
        balance: b.balance,
      }));
      setBalances(accountBalances);
    } catch (err) {
      console.error("Error fetching balance:", err);
      setError("Failed to fetch balance");
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async (secret: string) => {
    try {
      setLoading(true);
      setError(null);
      const keypair = Keypair.fromSecret(secret);
      setPublicKey(keypair.publicKey());
      setSecretKey(secret);
    } catch {
      setError("Invalid secret key");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setPublicKey(null);
    setSecretKey(null);
    setBalances([]);
  };

  const addTrustline = async (assetCode: string, issuer: string) => {
    if (!publicKey || !secretKey) return;
    setLoading(true);
    try {
      const account = await server.loadAccount(publicKey);
      const fee = await server.fetchBaseFee();
      const transaction = new TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.changeTrust({
            asset: new Asset(assetCode, issuer),
          })
        )
        .setTimeout(30)
        .build();
      transaction.sign(Keypair.fromSecret(secretKey));
      await server.submitTransaction(transaction);
      await fetchBalance(publicKey);
    } catch (err) {
      console.error("Error adding trustline:", err);
      setError("Failed to add trustline");
    } finally {
      setLoading(false);
    }
  };

  const sendPayment = async (
    destination: string,
    amount: string,
    assetCode?: string,
    issuer?: string
  ) => {
    if (!publicKey || !secretKey) return;
    setLoading(true);
    try {
      const account = await server.loadAccount(publicKey);
      const fee = await server.fetchBaseFee();
      const asset = assetCode && issuer ? new Asset(assetCode, issuer) : Asset.native();
      const transaction = new TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.payment({
            destination,
            asset,
            amount,
          })
        )
        .setTimeout(30)
        .build();
      transaction.sign(Keypair.fromSecret(secretKey));
      await server.submitTransaction(transaction);
      await fetchBalance(publicKey);
    } catch (err) {
      console.error("Error sending payment:", err);
      setError("Failed to send payment");
    } finally {
      setLoading(false);
    }
  };

  const joinLiquidityPool = async (
    assetA: AssetInstance,
    assetB: AssetInstance,
    amountA: string,
    amountB: string
  ) => {
    if (!publicKey || !secretKey) return;
    setLoading(true);
    try {
      // Note: Liquidity pool functionality temporarily disabled pending SDK compatibility checks
      setError("Liquidity pool functionality temporarily unavailable");
      console.log("Liquidity pool deposit:", { assetA, assetB, amountA, amountB });
    } catch {
      setError("Failed to join liquidity pool");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        secretKey,
        balance,
        balances,
        loading,
        error,
        connectWallet,
        createWallet: () => {}, // You can implement wallet generation here
        importWallet: connectWallet, // Alias for now
        disconnect,
        addTrustline,
        sendPayment,
        joinLiquidityPool,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
};