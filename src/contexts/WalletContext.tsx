import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Keypair,
  Networks,
  Server,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE
} from '@stellar/stellar-sdk';

interface WalletContextType {
  publicKey: string | null;
  secretKey: string | null;
  balance: string;
  network: 'testnet' | 'public';
  createWallet: () => void;
  importWallet: (secretKey: string) => void;
  disconnect: () => void;
  addTrustline: (assetCode: string, issuer: string) => Promise<void>;
  sendPayment: (destination: string, amount: string, assetCode?: string, issuer?: string) => Promise<void>;
  joinLiquidityPool: (assetA: string, assetB: string, amountA: string, amountB: string) => Promise<void>;
  toggleNetwork: () => void;
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
  toggleNetwork: () => {},
  loading: false,
  error: null,
};

const WalletContext = createContext<WalletContextType>(defaultContext);

const TESTNET_SERVER = new Server('https://horizon-testnet.stellar.org');
const PUBLIC_SERVER = new Server('https://horizon.stellar.org');

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<'testnet' | 'public'>('testnet');

  const server = network === 'testnet' ? TESTNET_SERVER : PUBLIC_SERVER;
  const networkPassphrase = network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;

  useEffect(() => {
    const storedSecretKey = localStorage.getItem('stellar_secret_key');
    const storedNetwork = localStorage.getItem('stellar_network') as 'testnet' | 'public' | null;

    if (storedNetwork) setNetwork(storedNetwork);

    if (storedSecretKey) {
      try {
        const keypair = Keypair.fromSecret(storedSecretKey);
        setSecretKey(storedSecretKey);
        setPublicKey(keypair.publicKey());
        fetchBalance(keypair.publicKey());
      } catch (err) {
        console.error('Invalid stored key:', err);
        localStorage.removeItem('stellar_secret_key');
      }
    }
  }, []);

  const fetchBalance = async (accountId: string) => {
    try {
      setLoading(true);
      const account = await server.loadAccount(accountId);
      const xlmBalance = account.balances.find((b) => b.asset_type === 'native');
      setBalance(xlmBalance ? xlmBalance.balance : '0');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setBalance('0 (Account not activated)');
      } else {
        console.error('Error fetching balance:', err);
        setError('Failed to fetch balance');
      }
    } finally {
      setLoading(false);
    }
  };

  const fundWithFriendbot = async (accountId: string) => {
    if (network === 'testnet') {
      try {
        await fetch(`https://friendbot.stellar.org?addr=${accountId}`);
      } catch (err) {
        console.error('Friendbot funding failed:', err);
      }
    }
  };

  const createWallet = async () => {
    try {
      setLoading(true);
      const keypair = Keypair.random();

      const pub = keypair.publicKey();
      const sec = keypair.secret();

      setPublicKey(pub);
      setSecretKey(sec);

      localStorage.setItem('stellar_secret_key', sec);
      localStorage.setItem('stellar_network', network);

      if (network === 'testnet') {
        await fundWithFriendbot(pub);
      }

      await fetchBalance(pub);
      setError(null);
    } catch (err) {
      console.error('Error creating wallet:', err);
      setError('Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const importWallet = async (secret: string) => {
    try {
      setLoading(true);

      const trimmedSecret = secret.trim();
      const keypair = Keypair.fromSecret(trimmedSecret);

      setSecretKey(trimmedSecret);
      setPublicKey(keypair.publicKey());
      localStorage.setItem('stellar_secret_key', trimmedSecret);
      localStorage.setItem('stellar_network', network);

      if (network === 'testnet') {
        await fundWithFriendbot(keypair.publicKey());
      }

      await fetchBalance(keypair.publicKey());
      setError(null);
    } catch (err) {
      console.error('Error importing wallet:', err);
      setError('Invalid Stellar secret key');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setPublicKey(null);
    setSecretKey(null);
    setBalance('0');
    localStorage.removeItem('stellar_secret_key');
  };

  const toggleNetwork = () => {
    const newNetwork = network === 'testnet' ? 'public' : 'testnet';
    setNetwork(newNetwork);
    localStorage.setItem('stellar_network', newNetwork);
  };

  const addTrustline = async (assetCode: string, issuer: string) => {
    if (!publicKey || !secretKey) throw new Error('No wallet connected');
    try {
      setLoading(true);
      const keypair = Keypair.fromSecret(secretKey);
      const account = await server.loadAccount(publicKey);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset: new Asset(assetCode, issuer),
          })
        )
        .setTimeout(30)
        .build();

      tx.sign(keypair);
      await server.submitTransaction(tx);

      await fetchBalance(publicKey);
    } catch (err) {
      console.error('Error adding trustline:', err);
      setError('Failed to add trustline');
    } finally {
      setLoading(false);
    }
  };

  const sendPayment = async (destination: string, amount: string, assetCode = 'XLM', issuer = '') => {
    if (!publicKey || !secretKey) throw new Error('No wallet connected');
    try {
      setLoading(true);
      const keypair = Keypair.fromSecret(secretKey);
      const account = await server.loadAccount(publicKey);

      const asset = assetCode === 'XLM' ? Asset.native() : new Asset(assetCode, issuer);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase,
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

      tx.sign(keypair);
      await server.submitTransaction(tx);

      await fetchBalance(publicKey);
    } catch (err) {
      console.error('Error sending payment:', err);
      setError('Failed to send payment');
    } finally {
      setLoading(false);
    }
  };

const joinLiquidityPool = async (assetA: string, assetB: string, amountA: string, amountB: string) => {
  if (!publicKey || !secretKey) throw new Error('No wallet connected');
  try {
    setLoading(true);
    const keypair = Keypair.fromSecret(secretKey);
    const account = await server.loadAccount(publicKey);

    const asset1 = assetA === 'XLM' ? Asset.native() : new Asset(assetA, publicKey);
    const asset2 = assetB === 'XLM' ? Asset.native() : new Asset(assetB, publicKey);

    // Check if pool exists
    const poolId = Asset.liquidityPoolId(asset1, asset2, 30).toString('hex');
    let poolExists = true;
    try {
      await server.liquidityPools().liquidityPoolId(poolId).call();
    } catch {
      poolExists = false;
    }
    if (!poolExists) {
      throw new Error('Liquidity pool does not exist yet. Someone must create it first.');
    }

    // Ensure trustline to pool share asset
    const poolShareAsset = new Asset('LP', poolId); // LP token placeholder
    const trustlineExists = account.balances.some(b => b.asset_code === 'LP' && b.asset_issuer === poolId);
    if (!trustlineExists) {
      const trustTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase,
      })
        .addOperation(Operation.changeTrust({ asset: poolShareAsset }))
        .setTimeout(30)
        .build();

      trustTx.sign(keypair);
      await server.submitTransaction(trustTx);
    }

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.liquidityPoolDeposit({
          liquidityPoolId: poolId,
          maxAmountA: amountA,
          maxAmountB: amountB,
          minPrice: '0.99',
          maxPrice: '1.01',
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(keypair);
    await server.submitTransaction(tx);

    await fetchBalance(publicKey);
  } catch (err: any) {
    console.error('Error joining liquidity pool:', err);
    setError(err.message || 'Failed to join liquidity pool');
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
        network,
        createWallet,
        importWallet,
        disconnect,
        addTrustline,
        sendPayment,
        joinLiquidityPool,
        toggleNetwork,
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
