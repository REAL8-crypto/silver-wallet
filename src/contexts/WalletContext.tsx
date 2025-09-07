import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// Removed unused import: import { useTranslation } from 'react-i18next';

// For now, we'll use a simplified approach that doesn't require stellar-sdk
// We'll implement the crypto functions manually or use stellar-base if needed

interface WalletContextType {
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

const defaultContext: WalletContextType = {
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
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // const { t } = useTranslation(); // Commented out for now

  // Load wallet from localStorage on mount
  useEffect(() => {
    const storedSecretKey = localStorage.getItem('stellar_secret_key');
    const storedPublicKey = localStorage.getItem('stellar_public_key');
    
    if (storedSecretKey && storedPublicKey) {
      setSecretKey(storedSecretKey);
      setPublicKey(storedPublicKey);
      fetchBalance(storedPublicKey);
    }
  }, []);

  const fetchBalance = async (publicKey: string) => {
    try {
      setLoading(true);
      
      // Skip balance fetching for mock wallets (they're not real Stellar accounts)
      if (publicKey.startsWith('G') && publicKey.length === 56) {
        // Direct HTTP call to Horizon API
        const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setBalance('0 (Account not activated)');
            return;
          }
          throw new Error('Failed to fetch account');
        }
        
        const accountData = await response.json();
        const xlmBalance = accountData.balances.find((b: any) => b.asset_type === 'native');
        setBalance(xlmBalance ? xlmBalance.balance : '0');
      } else {
        // Mock wallet - set demo balance
        setBalance(' (Test) 0');
      }
      
    } catch (err) {
      console.error('Error fetching balance:', err);
      setBalance(' (Test) 0');
      setError('Demo wallet - balance fetching disabled');
    } finally {
      setLoading(false);
    }
  };

  const generateKeypair = (): { publicKey: string; secretKey: string } => {
    // This is a simplified implementation for testing
    // In production, you should use proper Stellar cryptography
    
    // Generate 32 random bytes for the secret key
    const secretBytes = new Uint8Array(32);
    crypto.getRandomValues(secretBytes);
    
    // Convert to base32-like format (simplified)
    const secretKey = 'S' + Array.from(secretBytes)
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .toUpperCase()
      .slice(0, 55);
    
    // Generate a mock public key (in production, derive from secret)
    const publicBytes = new Uint8Array(32);
    crypto.getRandomValues(publicBytes);
    const publicKey = 'G' + Array.from(publicBytes)
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .toUpperCase()
      .slice(0, 55);
    
    return { publicKey, secretKey };
  };

  const validateSecretKey = (secretKey: string): boolean => {
    // Basic validation - in production use proper Stellar validation
    return secretKey.startsWith('S') && secretKey.length === 56;
  };

  const derivePublicKey = (secretKey: string): string => {
    // Simplified derivation - in production use proper Stellar cryptography
    // For now, we'll store both keys separately
    return 'G' + secretKey.slice(1, 56);
  };

  const createWallet = () => {
    try {
      setLoading(true);
      const { publicKey, secretKey } = generateKeypair();
      
      setPublicKey(publicKey);
      setSecretKey(secretKey);
      
      // Store both keys
      localStorage.setItem('stellar_secret_key', secretKey);
      localStorage.setItem('stellar_public_key', publicKey);
      
      setBalance('0'); // New wallet has 0 balance
      setError(null);
      
    } catch (err) {
      setError('Failed to create wallet');
      console.error('Error creating wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  const importWallet = (secretKey: string) => {
    try {
      setLoading(true);
      
      if (!validateSecretKey(secretKey)) {
        throw new Error('Invalid secret key format');
      }
      
      const publicKey = derivePublicKey(secretKey);
      
      setSecretKey(secretKey);
      setPublicKey(publicKey);
      
      // Store both keys
      localStorage.setItem('stellar_secret_key', secretKey);
      localStorage.setItem('stellar_public_key', publicKey);
      
      fetchBalance(publicKey);
      setError(null);
      
    } catch (err) {
      setError('Invalid secret key');
      console.error('Error importing wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setPublicKey(null);
    setSecretKey(null);
    setBalance('0');
    localStorage.removeItem('stellar_secret_key');
    localStorage.removeItem('stellar_public_key');
  };

  const addTrustline = async (assetCode: string, issuer: string) => {
    if (!publicKey || !secretKey) {
      throw new Error('No wallet connected');
    }
    
    try {
      setLoading(true);
      
      // This is a placeholder implementation
      // In production, you'd build and submit a changeTrust transaction
      console.log(`Adding trustline for ${assetCode}:${issuer}`);
      
      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setError('Trustline operations require stellar-sdk implementation');
      
    } catch (err) {
      console.error('Error adding trustline:', err);
      setError('Failed to add trustline');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendPayment = async (destination: string, amount: string, assetCode: string = 'XLM', issuer: string = '') => {
    if (!publicKey || !secretKey) {
      throw new Error('No wallet connected');
    }
    
    try {
      setLoading(true);
      
      console.log(`Sending ${amount} ${assetCode} to ${destination}`);
      
      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setError('Payment operations require stellar-sdk implementation');
      
    } catch (err) {
      console.error('Error sending payment:', err);
      setError('Failed to send payment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const joinLiquidityPool = async (assetA: string, assetB: string, amountA: string, amountB: string) => {
    if (!publicKey || !secretKey) {
      throw new Error('No wallet connected');
    }
    
    try {
      setLoading(true);
      
      console.log(`Joining liquidity pool: ${assetA}/${assetB}`);
      
      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setError('Liquidity pool operations require stellar-sdk implementation');
      
    } catch (err) {
      console.error('Error joining liquidity pool:', err);
      setError('Failed to join liquidity pool');
      throw err;
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