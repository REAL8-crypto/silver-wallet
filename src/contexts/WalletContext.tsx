import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
} from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK = Networks.TESTNET;
const server = new Server(HORIZON_URL);

// -------------------
// Types
// -------------------
interface BalanceItem {
  asset_type: string;
  balance: string;
  asset_code?: string;
  asset_issuer?: string;
}

interface WalletContextProps {
  publicKey: string | null;
  secretKey: string | null;
  balances: BalanceItem[];
  loading: boolean;
  error: string | null;
  createWallet: () => void;
  loadWallet: (secret: string) => Promise<void>;
  sendPayment: (destination: string, amount: string, asset?: Asset) => Promise<void>;
  joinLiquidityPool: (assetA: Asset, assetB: Asset, amountA: string, amountB: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextProps | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async (pubKey: string) => {
    try {
      const account = await server.loadAccount(pubKey);
      setBalances(account.balances as BalanceItem[]);
    } catch (err) {
      console.error(err);
    }
  };

  const createWallet = () => {
    const pair = Keypair.random();
    setPublicKey(pair.publicKey());
    setSecretKey(pair.secret());
    setBalances([]);
  };

  const loadWallet = async (secret: string) => {
    setLoading(true);
    setError(null);
    try {
      const keypair = Keypair.fromSecret(secret);
      setPublicKey(keypair.publicKey());
      setSecretKey(secret);
      await fetchBalances(keypair.publicKey());
    } catch (err) {
      console.error(err);
      setError('Invalid secret key');
    } finally {
      setLoading(false);
    }
  };

  const sendPayment = async (destination: string, amount: string, asset: Asset = Asset.native()) => {
    if (!secretKey || !publicKey) return;
    setLoading(true);
    try {
      const sourceAccount = await server.loadAccount(publicKey);
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK,
      })
        .addOperation(Operation.payment({ destination, asset, amount }))
        .setTimeout(30)
        .build();

      transaction.sign(Keypair.fromSecret(secretKey));
      await server.submitTransaction(transaction);
      await fetchBalances(publicKey);
    } catch (err) {
      console.error(err);
      setError('Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const joinLiquidityPool = async (assetA: Asset, assetB: Asset, amountA: string, amountB: string) => {
    if (!secretKey || !publicKey) return;
    setLoading(true);
    try {
      const lpAsset = new LiquidityPoolAsset(assetA, assetB, LiquidityPoolFeeV18);
      const poolId = getLiquidityPoolId('constant_product', assetA, assetB, LiquidityPoolFeeV18);

      const sourceAccount = await server.loadAccount(publicKey);
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK,
      })
        .addOperation(
          Operation.liquidityPoolDeposit({
            liquidityPoolId: poolId,
            maxAmountA: amountA,
            maxAmountB: amountB,
            minPrice: '0.5',
            maxPrice: '2',
          })
        )
        .setTimeout(30)
        .build();

      transaction.sign(Keypair.fromSecret(secretKey));
      await server.submitTransaction(transaction);
      await fetchBalances(publicKey);
    } catch (err) {
      console.error(err);
      setError('Liquidity pool join failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        secretKey,
        balances,
        loading,
        error,
        createWallet,
        loadWallet,
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
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
