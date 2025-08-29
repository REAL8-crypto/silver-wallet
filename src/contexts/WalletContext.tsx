import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Keypair, Horizon, TransactionBuilder, Networks, Operation, Asset, Memo } from '@stellar/stellar-sdk';
import { useTranslation } from 'react-i18next';

interface WalletContextType {
  keypair: Keypair | null;
  publicKey: string | null;
  secretKey: string | null;
  balance: string;
  network: 'testnet' | 'public';
  createWallet: () => void;
  importWallet: (secretKey: string) => void;
  disconnect: () => void;
  addTrustline: (assetCode: string, issuer: string) => Promise<void>;
  sendPayment: (destination: string, amount: string, assetCode: string, issuer?: string) => Promise<void>;
  joinLiquidityPool: (assetA: string, assetB: string, amountA: string, amountB: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const server = new Horizon.Server('https://horizon-testnet.stellar.org');
const defaultContext: WalletContextType = {
  keypair: null,
  publicKey: null,
  secretKey: null,
  balance: '0',
  network: 'testnet',
  createWallet: () => {},
  importWallet: () => {},
  disconnect: () => {},
  addTrustline: async () => {},
  sendPayment: async () => {},
  joinLiquidityPool: async () => {},
  loading: false,
  error: null,
};

const WalletContext = createContext<WalletContextType>(defaultContext);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // Load wallet from localStorage on mount
  useEffect(() => {
    const storedSecretKey = localStorage.getItem('stellar_secret_key');
    if (storedSecretKey) {
      try {
        const keypair = Keypair.fromSecret(storedSecretKey);
        setKeypair(keypair);
        setPublicKey(keypair.publicKey());
        setSecretKey(keypair.secret());
        fetchBalance(keypair.publicKey());
      } catch (err) {
        console.error('Failed to load wallet:', err);
        localStorage.removeItem('stellar_secret_key');
      }
    }
  }, []);

  const fetchBalance = async (publicKey: string) => {
    try {
      setLoading(true);
      const account = await server.loadAccount(publicKey);
      const xlmBalance = account.balances.find((b: any) => b.asset_type === 'native');
      setBalance(xlmBalance ? xlmBalance.balance : '0');
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError(t('error.fetchingBalance'));
    } finally {
      setLoading(false);
    }
  };

  const createWallet = () => {
    try {
      const keypair = Keypair.random();
      setKeypair(keypair);
      setPublicKey(keypair.publicKey());
      setSecretKey(keypair.secret());
      localStorage.setItem('stellar_secret_key', keypair.secret());
      setError(null);
    } catch (err) {
      console.error('Error creating wallet:', err);
      setError(t('error.creatingWallet'));
    }
  };

  const importWallet = (secretKey: string) => {
    try {
      const keypair = Keypair.fromSecret(secretKey);
      setKeypair(keypair);
      setPublicKey(keypair.publicKey());
      setSecretKey(keypair.secret());
      localStorage.setItem('stellar_secret_key', keypair.secret());
      fetchBalance(keypair.publicKey());
      setError(null);
    } catch (err) {
      console.error('Error importing wallet:', err);
      setError(t('error.invalidSecretKey'));
    }
  };

  const disconnect = () => {
    setKeypair(null);
    setPublicKey(null);
    setSecretKey(null);
    setBalance('0');
    localStorage.removeItem('stellar_secret_key');
  };

  const addTrustline = async (assetCode: string, issuer: string) => {
    if (!keypair) return;
    
    try {
      setLoading(true);
      const account = await server.loadAccount(keypair.publicKey());
      const asset = new Asset(assetCode, issuer);
      
      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.changeTrust({
          asset: asset,
        }))
        .setTimeout(30)
        .build();
      
      transaction.sign(keypair);
      await server.submitTransaction(transaction);
      setError(null);
    } catch (err) {
      console.error('Error adding trustline:', err);
      setError(t('error.addingTrustline'));
    } finally {
      setLoading(false);
    }
  };

  const sendPayment = async (destination: string, amount: string, assetCode: string, issuer?: string) => {
    if (!keypair) return;
    
    try {
      setLoading(true);
      const account = await server.loadAccount(keypair.publicKey());
      const asset = assetCode === 'XLM' 
        ? Asset.native() 
        : new Asset(assetCode, issuer!);
      
      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.payment({
          destination,
          asset,
          amount: amount.toString(),
        }))
        .setTimeout(30)
        .build();
      
      transaction.sign(keypair);
      await server.submitTransaction(transaction);
      await fetchBalance(keypair.publicKey());
      setError(null);
    } catch (err) {
      console.error('Error sending payment:', err);
      setError(t('error.sendingPayment'));
    } finally {
      setLoading(false);
    }
  };

  const joinLiquidityPool = async (assetA: string, assetB: string, amountA: string, amountB: string) => {
    if (!keypair) return;
    
    try {
      setLoading(true);
      const account = await server.loadAccount(keypair.publicKey());
      
      // This is a simplified example. In a real app, you'd need to handle the liquidity pool operations
      // based on the specific pool you want to join and the assets involved.
      
      setError(null);
    } catch (err) {
      console.error('Error joining liquidity pool:', err);
      setError(t('error.joiningPool'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        keypair,
        publicKey,
        secretKey,
        balance,
        network: 'testnet',
        createWallet,
        importWallet,
        disconnect,
        addTrustline,
        sendPayment,
        joinLiquidityPool,
        loading,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
