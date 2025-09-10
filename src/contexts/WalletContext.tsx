import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Wallet, StellarConfiguration, ApplicationConfiguration, IssuedAssetId, NativeAssetId, SigningKeypair } from "@stellar/typescript-wallet-sdk";
import { Keypair } from "@stellar/stellar-sdk";

// Use testnet for this configuration - update to MainNet for production
const stellarConfig = StellarConfiguration.TestNet();
const appConfig = new ApplicationConfiguration();
const wallet = new Wallet({
  stellarConfiguration: stellarConfig,
  applicationConfiguration: appConfig,
});

// Production Horizon and network passphrase
export const HORIZON_SERVER_URL = stellarConfig.horizonUrl;
export const server = stellarConfig.server;
export const NETWORK_PASSPHRASE = stellarConfig.network;

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
    assetA: IssuedAssetId | NativeAssetId,
    assetB: IssuedAssetId | NativeAssetId,
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
      const stellar = wallet.stellar();
      const account = await stellar.account().getInfo({ accountAddress: accountId });
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
      const stellar = wallet.stellar();
      const signingKeypair = SigningKeypair.fromSecret(secretKey);
      const asset = new IssuedAssetId(assetCode, issuer);
      
      const txBuilder = await stellar.transaction({
        sourceAddress: signingKeypair,
      });
      
      const transaction = txBuilder
        .addAssetSupport(asset)
        .build();
      
      signingKeypair.sign(transaction);
      await stellar.submitTransaction(transaction);
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
      const stellar = wallet.stellar();
      const signingKeypair = SigningKeypair.fromSecret(secretKey);
      const asset = assetCode && issuer ? new IssuedAssetId(assetCode, issuer) : new NativeAssetId();
      
      const txBuilder = await stellar.transaction({
        sourceAddress: signingKeypair,
      });
      
      const transaction = txBuilder
        .transfer(destination, asset, amount)
        .build();
      
      signingKeypair.sign(transaction);
      await stellar.submitTransaction(transaction);
      await fetchBalance(publicKey);
    } catch (err) {
      console.error("Error sending payment:", err);
      setError("Failed to send payment");
    } finally {
      setLoading(false);
    }
  };

  const joinLiquidityPool = async (
    assetA: IssuedAssetId | NativeAssetId,
    assetB: IssuedAssetId | NativeAssetId,
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