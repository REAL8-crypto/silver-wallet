// src/contexts/WalletContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  Keypair,
  Server,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  LiquidityPoolAsset,
  getLiquidityPoolId,
  LiquidityPoolFeeV18,
  BASE_FEE,
} from 'stellar-sdk';

interface WalletContextType {
  publicKey: string | null;
  secretKey: string | null;
  balance: string;
  network: 'testnet' | 'public';
  setNetwork: (n: 'testnet' | 'public') => void;
  createWallet: (autoFund?: boolean) => Promise<void>;
  importWallet: (secretKey: string) => Promise<void>;
  disconnect: () => void;
  addTrustline: (assetCode: string, issuer: string) => Promise<string>; // returns txHash
  sendPayment: (destination: string, amount: string, assetCode?: string, issuer?: string) => Promise<string>; // returns txHash
  joinLiquidityPool: (assetA: string, assetB: string, amountA: string, amountB: string) => Promise<string>; // returns txHash
  loading: boolean;
  error: string | null;
  fundTestnetAccount: (publicKey: string) => Promise<string>; // friendbot
}

const defaultContext: WalletContextType = {
  publicKey: null,
  secretKey: null,
  balance: '0',
  network: 'testnet',
  setNetwork: () => {},
  createWallet: async () => '',
  importWallet: async () => '',
  disconnect: () => {},
  addTrustline: async () => '',
  sendPayment: async () => '',
  joinLiquidityPool: async () => '',
  loading: false,
  error: null,
  fundTestnetAccount: async () => '',
};

const WalletContext = createContext<WalletContextType>(defaultContext);

// Horizon endpoints
const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';
const HORIZON_PUBLIC = 'https://horizon.stellar.org';

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [network, setNetworkState] = useState<'testnet' | 'public'>('testnet');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // server is computed from network state
  const server = new Server(network === 'testnet' ? HORIZON_TESTNET : HORIZON_PUBLIC);

  // Compute network passphrase for TransactionBuilder
  const networkPassphrase = network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;

  // Load wallet from localStorage on mount
  useEffect(() => {
    const storedSecretKey = localStorage.getItem('stellar_secret_key');
    if (storedSecretKey) {
      try {
        const trimmed = storedSecretKey.trim();
        const kp = Keypair.fromSecret(trimmed); // will throw if invalid
        setSecretKey(trimmed);
        setPublicKey(kp.publicKey());
        fetchBalance(kp.publicKey()).catch(() => {});
      } catch (err) {
        console.error('Invalid stored secret key, removing it from storage.', err);
        localStorage.removeItem('stellar_secret_key');
        localStorage.removeItem('stellar_public_key');
      }
    }
  }, []);

  const setNetwork = (n: 'testnet' | 'public') => {
    setNetworkState(n);
    // You may want to clear / re-fetch balances when switching networks
    if (publicKey) {
      fetchBalance(publicKey).catch(() => {});
    }
  };

  const fetchBalance = async (acctId: string) => {
    try {
      setLoading(true);
      const response = await server.loadAccount(acctId);
      const xlmBal = response.balances.find((b: any) => b.asset_type === 'native');
      setBalance(xlmBal ? xlmBal.balance : '0');
      setError(null);
    } catch (err: any) {
      if (err && err.status === 404) {
        setBalance('0 (Account not activated)');
      } else {
        console.error('fetchBalance error:', err);
        setError('Failed fetching balance');
      }
    } finally {
      setLoading(false);
    }
  };

  // Create a new valid Stellar keypair and optionally auto-fund via Friendbot (testnet)
  const createWallet = async (autoFund: boolean = false) => {
    try {
      setLoading(true);
      const pair = Keypair.random();
      const pub = pair.publicKey();
      const sec = pair.secret();

      setPublicKey(pub);
      setSecretKey(sec);
      localStorage.setItem('stellar_secret_key', sec);
      localStorage.setItem('stellar_public_key', pub);
      setBalance('0');
      setError(null);

      // optional auto-fund on testnet via friendbot
      if (autoFund && network === 'testnet') {
        try {
          await fundTestnetAccount(pub);
          await fetchBalance(pub);
        } catch (ferr) {
          // friendbot failure is non-fatal; surface an error but keep keys
          console.warn('Friendbot failed:', ferr);
          setError('Friendbot funding failed (see console).');
        }
      }
    } catch (err) {
      console.error('createWallet error:', err);
      setError('Failed to create wallet.');
    } finally {
      setLoading(false);
    }
  };

  // import secret (validates using Keypair.fromSecret)
  const importWallet = async (secret: string) => {
    try {
      setLoading(true);
      const trimmed = secret.trim();
      const kp = Keypair.fromSecret(trimmed); // throws if invalid
      setSecretKey(trimmed);
      setPublicKey(kp.publicKey());
      localStorage.setItem('stellar_secret_key', trimmed);
      localStorage.setItem('stellar_public_key', kp.publicKey());
      setError(null);
      await fetchBalance(kp.publicKey());
      return kp.publicKey();
    } catch (err) {
      console.error('importWallet error:', err);
      setError('Invalid Stellar secret key.');
      throw err;
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

  // Friendbot helper (testnet only) - returns submitted response text (tx hash / friendbot response)
  const fundTestnetAccount = async (pub: string): Promise<string> => {
    if (network !== 'testnet') {
      throw new Error('Friendbot is only available on testnet');
    }
    const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(pub)}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const txt = await resp.text().catch(() => 'friendbot error');
      throw new Error(`Friendbot failed: ${resp.status} ${txt}`);
    }
    const data = await resp.json();
    return data.hash || JSON.stringify(data);
  };

  // Add trustline for a custom credit asset
  const addTrustline = async (assetCode: string, issuer: string): Promise<string> => {
    if (!publicKey || !secretKey) throw new Error('No wallet connected');

    try {
      setLoading(true);
      const sourceAccount = await server.loadAccount(publicKey);
      // parse asset: assetCode + issuer
      const asset = new Asset(assetCode, issuer);
      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE.toString(),
        networkPassphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset,
            limit: undefined, // default max
          })
        )
        .setTimeout(30)
        .build();

      const signer = Keypair.fromSecret(secretKey);
      tx.sign(signer);

      const res = await server.submitTransaction(tx);
      // refresh balance / trustlines
      await fetchBalance(publicKey);
      setError(null);
      return res.hash;
    } catch (err: any) {
      console.error('addTrustline error:', err);
      setError(err?.message || 'Failed to add trustline');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Send payment (native XLM or custom asset)
  const sendPayment = async (
    destination: string,
    amount: string,
    assetCode: string = 'XLM',
    issuer: string = ''
  ): Promise<string> => {
    if (!publicKey || !secretKey) throw new Error('No wallet connected');

    try {
      setLoading(true);
      const sourceAccount = await server.loadAccount(publicKey);

      let asset = undefined;
      if (assetCode === 'XLM' || assetCode.toLowerCase() === 'native') {
        // native payment
      } else {
        asset = new Asset(assetCode, issuer);
      }

      const op =
        asset === undefined
          ? Operation.payment({ destination, asset: Asset.native(), amount })
          : Operation.payment({ destination, asset, amount });

      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE.toString(),
        networkPassphrase,
      })
        .addOperation(op)
        .setTimeout(30)
        .build();

      const signer = Keypair.fromSecret(secretKey);
      tx.sign(signer);

      const res = await server.submitTransaction(tx);
      // optionally refresh balance
      await fetchBalance(publicKey);
      setError(null);
      return res.hash;
    } catch (err: any) {
      console.error('sendPayment error:', err);
      setError(err?.message || 'Failed to send payment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Join a constant-product liquidity pool (deposit).
   *
   * assetA and assetB are strings with the format:
   *  - "XLM" or "native" for the native asset, or
   *  - "CODE:ISSUER" for credit assets (e.g. "REAL8:GDU...").
   *
   * The method:
   *  - parses the assets,
   *  - ensures trust lines exist (changeTrust for credit assets and the pool trustline),
   *  - computes the pool id, and
   *  - submits a liquidityPoolDeposit operation with the provided max amounts.
   *
   * Returns the transaction hash when successful.
   */
  const joinLiquidityPool = async (
    assetA: string,
    assetB: string,
    amountA: string,
    amountB: string
  ): Promise<string> => {
    if (!publicKey || !secretKey) throw new Error('No wallet connected');

    const parseAsset = (s: string): Asset => {
      const trimmed = s.trim();
      if (trimmed === 'XLM' || trimmed.toLowerCase() === 'native') {
        return Asset.native();
      }
      const [code, issuer] = trimmed.split(':');
      if (!code || !issuer) throw new Error(`Invalid asset string: ${s}. Use CODE:ISSUER or XLM`);
      return new Asset(code, issuer);
    };

    try {
      setLoading(true);
      const assetObjA = parseAsset(assetA);
      const assetObjB = parseAsset(assetB);

      // Ensure lexicographic order rule (getLiquidityPoolId enforces assetA < assetB)
      // getLiquidityPoolId checks Asset.compare internally - if assets are in wrong order it will throw.
      const poolIdBuf = getLiquidityPoolId('constant_product', {
        assetA: assetObjA,
        assetB: assetObjB,
        fee: LiquidityPoolFeeV18,
      });
      const poolIdHex = poolIdBuf.toString('hex');

      const sourceAccount = await server.loadAccount(publicKey);

      // Build tx:
      // 1) changeTrust for each credit asset if needed (skipped for native)
      // 2) changeTrust for the liquidity pool shares (use LiquidityPoolAsset)
      // 3) liquidityPoolDeposit (with maxAmountA/maxAmountB)
      const txBuilder = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE.toString(),
        networkPassphrase,
      });

      // If assetA or assetB is credit (non-native), add changeTrust for them to be safe.
      const addChangeTrustIfCredit = (assetObj: Asset) => {
        if (assetObj.isNative && assetObj.isNative()) return;
        txBuilder.addOperation(
          Operation.changeTrust({
            asset: assetObj,
          })
        );
      };

      // Add changeTrust for the two credit assets if they are non-native
      addChangeTrustIfCredit(assetObjA);
      addChangeTrustIfCredit(assetObjB);

      // Add changeTrust for liquidity pool shares (this is necessary to hold pool shares)
      const poolAsset = new LiquidityPoolAsset(assetObjA, assetObjB, LiquidityPoolFeeV18);
      txBuilder.addOperation(
        Operation.changeTrust({
          asset: poolAsset,
        })
      );

      // Add liquidity pool deposit op
      txBuilder.addOperation(
        Operation.liquidityPoolDeposit({
          liquidityPoolId: poolIdHex,
          maxAmountA: amountA,
          maxAmountB: amountB,
          // minPrice / maxPrice omitted for simplicity; optionally calculate to limit slippage
        })
      );

      const tx = txBuilder.setTimeout(60).build();
      const signer = Keypair.fromSecret(secretKey);
      tx.sign(signer);

      const res = await server.submitTransaction(tx);
      await fetchBalance(publicKey);
      setError(null);
      return res.hash;
    } catch (err: any) {
      console.error('joinLiquidityPool error:', err);
      setError(err?.message || 'Failed to join liquidity pool');
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
        network,
        setNetwork,
        createWallet,
        importWallet,
        disconnect,
        addTrustline,
        sendPayment,
        joinLiquidityPool,
        loading,
        error,
        fundTestnetAccount,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const ctx = useContext(WalletContext);
  if (ctx === undefined) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return ctx;
};
