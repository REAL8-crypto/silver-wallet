import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Keypair, Horizon } from '@stellar/stellar-sdk';
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

  // ...Rest of your context logic, no unused variables

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
        disconnect: () => {},
        addTrustline: async () => {},
        sendPayment: async () => {},
        joinLiquidityPool: async () => {},
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
