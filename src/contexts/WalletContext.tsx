import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  Server,
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  LiquidityPoolAsset,
  getLiquidityPoolId,
  LiquidityPoolFeeV18,
  BASE_FEE,
  Networks,
} from "@stellar/stellar-sdk";

interface BalanceItem {
  asset_code: string;
  asset_issuer?: string | null;
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
  disconnect: () => void;
  addTrustline: (assetCode: string, issuer: string) => Promise<void>;
  sendPayment: (
    destination: string,
    amount: string,
    assetCode?: string,
    issuer?: string
  ) => Promise<void>;
  joinLiquidityPool: (
    assetA: Asset,
    assetB: Asset,
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

  const server = new Server("https://horizon-testnet.stellar.org");

  // Computed XLM balance
  const balance = balances.find((b) => b.asset_code === "XLM")?.balance || "0";

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
      const keypair = Keypair.fromSecret(secret);
      setPublicKey(keypair.publicKey());
      setSecretKey(secret);
    } catch (err) {
      setError("Invalid secret key");
    } finally {
      setLoading(false);
    }
  };

  const createWallet = () => {
    const keypair = Keypair.random();
    setPublicKey(keypair.publicKey());
    setSecretKey(keypair.secret());
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
        networkPassphrase: Networks.TESTNET,
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
      console.error(err);
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
      const asset =
        assetCode && issuer ? new Asset(assetCode, issuer) : Asset.native();
      const transaction = new TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: Networks.TESTNET,
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
      console.error(err);
      setError("Failed to send payment");
    } finally {
      setLoading(false);
    }
  };

  const joinLiquidityPool = async (
    assetA: Asset,
    assetB: Asset,
    amountA: string,
    amountB: string
  ) => {
    if (!publicKey || !secretKey) return;
    setLoading(true);
    try {
      const account = await server.loadAccount(publicKey);
      const fee = await server.fetchBaseFee();

      const lpAsset = new LiquidityPoolAsset(assetA, assetB, LiquidityPoolFeeV18);
      const poolId = getLiquidityPoolId("constant_product", assetA, assetB, LiquidityPoolFeeV18);

      const transaction = new TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.liquidityPoolDeposit({
            liquidityPoolId: poolId,
            maxAmountA: amountA,
            maxAmountB: amountB,
            minPrice: "0.99",
            maxPrice: "1.01",
          })
        )
        .setTimeout(30)
        .build();

      transaction.sign(Keypair.fromSecret(secretKey));
      await server.submitTransaction(transaction);
      await fetchBalance(publicKey);
    } catch (err) {
      console.error(err);
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
        createWallet,
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
