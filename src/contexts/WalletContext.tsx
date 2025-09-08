import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as StellarSDK from "stellar-sdk";

interface BalanceItem {
  asset_code: string;
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
  importWallet: (secretKey: string) => Promise<void>; // Add this line
  disconnect: () => void;
  addTrustline: (assetCode: string, issuer: string) => Promise<void>;
  sendPayment: (destination: string, amount: string, assetCode?: string, issuer?: string) => Promise<void>;
  joinLiquidityPool: (assetA: StellarSDK.Asset, assetB: StellarSDK.Asset, amountA: string, amountB: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextProps | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const server = new StellarSDK.Server("https://horizon-testnet.stellar.org");

  // Computed XLM balance
  const balance = balances.find(b => b.asset_code === 'XLM')?.balance || '0';

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
        asset_code: b.asset_type === "native" ? "XLM" : b.asset_code,
        asset_issuer: b.asset_issuer || null,
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
      const keypair = StellarSDK.Keypair.fromSecret(secret);
      setPublicKey(keypair.publicKey());
      setSecretKey(secret);
    } catch (err) {
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
      const transaction = new StellarSDK.TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: StellarSDK.Networks.TESTNET,
      })
        .addOperation(StellarSDK.Operation.changeTrust({
          asset: new StellarSDK.Asset(assetCode, issuer),
        }))
        .setTimeout(30)
        .build();
      transaction.sign(StellarSDK.Keypair.fromSecret(secretKey));
      await server.submitTransaction(transaction);
      await fetchBalance(publicKey);
    } catch (err) {
      setError("Failed to add trustline");
    } finally {
      setLoading(false);
    }
  };

  const sendPayment = async (destination: string, amount: string, assetCode?: string, issuer?: string) => {
    if (!publicKey || !secretKey) return;
    setLoading(true);
    try {
      const account = await server.loadAccount(publicKey);
      const fee = await server.fetchBaseFee();
      const asset = assetCode && issuer ? new StellarSDK.Asset(assetCode, issuer) : StellarSDK.Asset.native();
      const transaction = new StellarSDK.TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: StellarSDK.Networks.TESTNET,
      })
        .addOperation(StellarSDK.Operation.payment({
          destination,
          asset,
          amount,
        }))
        .setTimeout(30)
        .build();
      transaction.sign(StellarSDK.Keypair.fromSecret(secretKey));
      await server.submitTransaction(transaction);
      await fetchBalance(publicKey);
    } catch (err) {
      setError("Failed to send payment");
    } finally {
      setLoading(false);
    }
  };

  const joinLiquidityPool = async (assetA: StellarSDK.Asset, assetB: StellarSDK.Asset, amountA: string, amountB: string) => {
    if (!publicKey || !secretKey) return;
    setLoading(true);
    try {
      const account = await server.loadAccount(publicKey);
      const fee = await server.fetchBaseFee();
      const transaction = new StellarSDK.TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: StellarSDK.Networks.TESTNET,
      })
        .addOperation(StellarSDK.Operation.liquidityPoolDeposit({
          liquidityPoolId: StellarSDK.LiquidityPoolId.fromAssets(assetA, assetB, 30),
          maxAmountA: amountA,
          maxAmountB: amountB,
          minPrice: "0.99",
          maxPrice: "1.01",
        }))
        .setTimeout(30)
        .build();
      transaction.sign(StellarSDK.Keypair.fromSecret(secretKey));
      await server.submitTransaction(transaction);
      await fetchBalance(publicKey);
    } catch (err) {
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