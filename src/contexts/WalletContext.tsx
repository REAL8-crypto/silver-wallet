import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as Stellar from '@stellar/stellar-sdk';
import { Asset, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { REAL8 } from '../constants/real8Asset';

type NetworkMode = 'public' | 'testnet';

interface BalanceLine {
  asset_type: string;
  balance: string;
  asset_code?: string;
  asset_issuer?: string;
  liquidity_pool_id?: string;
  limit?: string;
  buying_liabilities?: string;
  selling_liabilities?: string;
  is_authorized?: boolean;
  is_authorized_to_maintain_liabilities?: boolean;
  is_clawback_enabled?: boolean;
}

interface WalletContextValue {
  publicKey: string | null;
  secretKey: string | null;
  balance: string;
  balances: BalanceLine[];
  unfunded: boolean;
  isTestnet: boolean;
  loading: boolean;
  lastUpdated: Date | null;
  error: string | null;

  generateWallet: () => void;
  importSecret: (secret: string) => void;
  disconnect: () => void;
  refresh: () => Promise<void>;

  // Legacy aliases
  createWallet: () => void;
  importWallet: (secret: string) => void;

  sendPayment: (opts: {
    destination: string;
    amount: string;
    assetCode?: string;
    issuer?: string;
    memoText?: string;
  }) => Promise<void>;

  sendPaymentLegacy: (
    destination: string,
    amount: string,
    assetCode?: string,
    issuer?: string,
    memoText?: string
  ) => Promise<void>;

  addTrustline: (assetCode: string, issuer: string, limit?: string) => Promise<void>;
  removeTrustline: (assetCode: string, issuer: string) => Promise<void>;
  joinLiquidityPool: (opts: {
    assetACode?: string;
    assetAIssuer?: string;
    assetBCode?: string;
    assetBIssuer?: string;
    maxAmountA: string;
    maxAmountB: string;
  }) => Promise<void>;

  networkMode: NetworkMode;
  setNetworkMode: (mode: NetworkMode) => void;
}

const TESTNET_HORIZON = 'https://horizon-testnet.stellar.org';
const PUBLIC_HORIZON = 'https://horizon.stellar.org';

function getConfig(mode: NetworkMode) {
  return mode === 'public'
    ? { url: PUBLIC_HORIZON, passphrase: Networks.PUBLIC, isTestnet: false }
    : { url: TESTNET_HORIZON, passphrase: Networks.TESTNET, isTestnet: true };
}

/**
 * Resolve the Server constructor robustly for both ESM & CJS builds.
 */
function getServerCtor(S: any): any {
  if (S && typeof S.Server === 'function') return S.Server;
  if (S?.Horizon?.Server && typeof S.Horizon.Server === 'function') return S.Horizon.Server;
  if (S?.default?.Server && typeof S.default.Server === 'function') return S.default.Server;
  if (S?.default?.Horizon?.Server && typeof S.default.Horizon.Server === 'function') {
    return S.default.Horizon.Server;
  }
  return null;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [networkMode, setNetworkMode] = useState<NetworkMode>(
    (localStorage.getItem('NETWORK_MODE') as NetworkMode) || 'testnet'
  );
  const cfg = getConfig(networkMode);

  const serverRef = useRef<any | null>(null);
  const serverCtorRef = useRef<any | null>(null);
  const warnedRef = useRef(false);

  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);

  const [balance, setBalance] = useState('0');
  const [balances, setBalances] = useState<BalanceLine[]>([]);
  const [unfunded, setUnfunded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<number | null>(null);

  // Initialize server when network mode changes
  useEffect(() => {
    localStorage.setItem('NETWORK_MODE', networkMode);
    const ServerCtor = getServerCtor(Stellar);
    if (!ServerCtor) {
      if (!warnedRef.current) {
        console.warn('[WalletProvider] No Server constructor found');
        warnedRef.current = true;
      }
      return;
    }
    serverCtorRef.current = ServerCtor;
    serverRef.current = new ServerCtor(cfg.url);
  }, [networkMode, cfg.url]);

  // Load account data
  const loadAccount = useCallback(async () => {
    if (!publicKey || !serverRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const account = await serverRef.current.loadAccount(publicKey);
      
      setBalance(account.balances.find((b: any) => b.asset_type === 'native')?.balance || '0');
      setBalances(account.balances);
      setUnfunded(false);
      setLastUpdated(new Date());
    } catch (e: any) {
      if (e?.status === 404) {
        setUnfunded(true);
        setBalance('0');
        setBalances([]);
      } else {
        setError(e.message || 'Failed to load account');
        console.error('[loadAccount] Error:', e);
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  const refresh = useCallback(async () => {
    await loadAccount();
  }, [loadAccount]);

  // Restore secret key on mount
  useEffect(() => {
    const stored = localStorage.getItem('WALLET_SECRET');
    if (stored) {
      try {
        const kp = Keypair.fromSecret(stored);
        setPublicKey(kp.publicKey());
        setSecretKey(stored);
      } catch {
        localStorage.removeItem('WALLET_SECRET');
      }
    }
  }, []);

  // Load account when public key changes
  useEffect(() => {
    if (publicKey) {
      void loadAccount();
    }
  }, [publicKey, loadAccount]);

  // Polling for account updates
  useEffect(() => {
    if (publicKey && !unfunded) {
      pollingRef.current = window.setInterval(() => {
        void loadAccount();
      }, 30000); // Poll every 30 seconds
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [publicKey, unfunded, loadAccount]);

  const generateWallet = () => {
    const kp = Keypair.random();
    setPublicKey(kp.publicKey());
    setSecretKey(kp.secret());
    localStorage.setItem('WALLET_SECRET', kp.secret());
    setUnfunded(true);
    setBalance('0');
    setBalances([]);
  };

  const importSecret = (secret: string) => {
    try {
      const kp = Keypair.fromSecret(secret.trim());
      setPublicKey(kp.publicKey());
      setSecretKey(kp.secret());
      localStorage.setItem('WALLET_SECRET', kp.secret());
      void refresh();
    } catch {
      setError('Invalid secret key');
    }
  };

  const disconnect = () => {
    setPublicKey(null);
    setSecretKey(null);
    setBalance('0');
    setBalances([]);
    setUnfunded(false);
    setLastUpdated(null);
    localStorage.removeItem('WALLET_SECRET');
  };

  async function submitTx(builder: any, signer: any) {
    if (!serverRef.current) throw new Error('Server unavailable');
    const tx = builder.setTimeout(120).build();
    tx.sign(signer);
    const res = await serverRef.current.submitTransaction(tx);
    await refresh();
    return res;
  }

  const sendPayment = async ({
    destination,
    amount,
    assetCode,
    issuer,
    memoText
  }: {
    destination: string;
    amount: string;
    assetCode?: string;
    issuer?: string;
    memoText?: string;
  }) => {
    if (!secretKey || !publicKey) throw new Error('Wallet not loaded');
    if (!serverRef.current) throw new Error('Server not initialized');

    setLoading(true);
    setError(null);

    try {
      // Basic validation
      if (!destination || !destination.trim()) throw new Error('Destination required');
      if (!amount || Number.isNaN(Number(amount)) || parseFloat(amount) <= 0) throw new Error('Amount must be > 0');
      if (assetCode && assetCode !== 'XLM' && (!issuer || !issuer.trim())) throw new Error('Issuer required for non-native assets');

      const kp = Keypair.fromSecret(secretKey);
      const account = await serverRef.current.loadAccount(publicKey);
      const fee = String(await serverRef.current.fetchBaseFee());

      // Build asset: native XLM vs custom asset
      const asset = (!assetCode || assetCode === 'XLM') ? Asset.native() : new Asset(assetCode, issuer!);

      const builder = new TransactionBuilder(account, { fee, networkPassphrase: cfg.passphrase })
        .addOperation(Operation.payment({
          destination: destination.trim(),
          asset,
          amount: String(amount)
        }));

      if (memoText && memoText.trim().length) {
        // Attach memo as text (max 28 chars) — callers should cap length if needed
        builder.addMemo(Stellar.Memo.text(memoText.trim()));
      }

      await submitTx(builder, kp);
    } catch (e: any) {
      console.error('[sendPayment] Error:', e);
      setError(e?.message || 'Failed to send payment');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const sendPaymentLegacy = async (
    destination: string,
    amount: string,
    assetCode?: string,
    issuer?: string,
    memoText?: string
  ) => sendPayment({ destination, amount, assetCode, issuer, memoText });

  const addTrustline = async (
    assetCode: string,
    issuer: string,
    limit?: string
  ) => {
    if (!secretKey || !publicKey) throw new Error('Wallet not loaded');
    if (!serverRef.current) throw new Error('Server not initialized');

    // Native XLM doesn't require a trustline
    if (assetCode === 'XLM') {
      throw new Error('XLM is native and does not require a trustline');
    }

    try {
      setLoading(true);
      setError(null);

      const kp = Keypair.fromSecret(secretKey);
      const account = await serverRef.current.loadAccount(publicKey);
      const fee = String(await serverRef.current.fetchBaseFee());

      const asset = new Asset(assetCode, issuer);
      const builder = new TransactionBuilder(account, { fee, networkPassphrase: cfg.passphrase })
        .addOperation(Operation.changeTrust({
          asset,
          // if limit is a non-empty string, pass it, otherwise undefined so SDK uses default (max)
          limit: limit && limit.length ? limit : undefined
        }));

      await submitTx(builder, kp);
    } catch (e: any) {
      console.error('[addTrustline] Error:', e);
      setError(e?.message || 'Failed to add trustline');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const removeTrustline = async (assetCode: string, issuer: string) => {
    if (!secretKey || !publicKey) throw new Error('Wallet not loaded');
    if (!serverRef.current) throw new Error('Server not initialized');

    try {
      setLoading(true);
      setError(null);

      const kp = Keypair.fromSecret(secretKey);
      const account = await serverRef.current.loadAccount(publicKey);
      const fee = String(await serverRef.current.fetchBaseFee());
      
      const asset = new Asset(assetCode, issuer);
      const builder = new TransactionBuilder(account, { fee, networkPassphrase: cfg.passphrase })
        .addOperation(Operation.changeTrust({
          asset,
          limit: '0' // Setting limit to 0 removes the trustline
        }));

      await submitTx(builder, kp);
    } catch (e: any) {
      console.error('[removeTrustline] Error:', e);
      setError(e.message || 'Failed to remove trustline');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const joinLiquidityPool = async ({
    assetACode = 'XLM',
    assetAIssuer = '',
    assetBCode = REAL8.CODE,
    assetBIssuer = REAL8.ISSUER,
    maxAmountA,
    maxAmountB
  }: {
    assetACode?: string;
    assetAIssuer?: string;
    assetBCode?: string;
    assetBIssuer?: string;
    maxAmountA: string;
    maxAmountB: string;
  }) => {
    if (!secretKey || !publicKey) throw new Error('Wallet not loaded');
    if (!serverRef.current) throw new Error('Server not initialized');

    console.log('[joinLiquidityPool] Starting with params:', {
      assetACode, assetAIssuer, assetBCode, assetBIssuer, maxAmountA, maxAmountB
    });

    try {
      setLoading(true);
      setError(null);

      // Validate amounts are positive
      if (parseFloat(maxAmountA) <= 0 || parseFloat(maxAmountB) <= 0) {
        throw new Error('Amounts must be positive');
      }

      // Build Asset instances for A and B
      const assetA = assetACode === 'XLM' ? Asset.native() : new Asset(assetACode, assetAIssuer);
      const assetB = assetBCode === 'XLM' ? Asset.native() : new Asset(assetBCode, assetBIssuer);

      console.log('[joinLiquidityPool] Looking for pool with assets:', assetA, assetB);

      // Fetch the pool
      const poolsResponse = await serverRef.current.liquidityPools().forAssets(assetA, assetB).call();
      if (!poolsResponse.records || poolsResponse.records.length === 0) {
        throw new Error('Liquidity pool not found for these assets');
      }
      
      const pool = poolsResponse.records[0];
      const poolId = pool.id;
      console.log('[joinLiquidityPool] Found pool:', poolId);
      console.log('[joinLiquidityPool] Pool reserves:', pool.reserves);

      // Calculate current pool price from reserves
      const reserve0 = parseFloat(pool.reserves[0].amount);
      const reserve1 = parseFloat(pool.reserves[1].amount);
      const poolPrice = reserve1 / reserve0; // Price of asset1 in terms of asset0
      console.log('[joinLiquidityPool] Current pool price:', poolPrice);

      // Determine canonical order from pool.reserves
      const reserve0Asset = pool.reserves[0].asset;
      let canonicalMaxAmountA, canonicalMaxAmountB;

      // Check if our assetA matches reserve0
      const assetAMatches = (reserve0Asset === 'native' && assetACode === 'XLM') ||
                           (reserve0Asset !== 'native' && 
                            reserve0Asset.includes(assetACode) && 
                            reserve0Asset.includes(assetAIssuer));

      if (assetAMatches) {
        canonicalMaxAmountA = maxAmountA;
        canonicalMaxAmountB = maxAmountB;
      } else {
        // Swap amounts
        canonicalMaxAmountA = maxAmountB;
        canonicalMaxAmountB = maxAmountA;
      }

      console.log('[joinLiquidityPool] Canonical amounts:', { canonicalMaxAmountA, canonicalMaxAmountB });

      // Load fresh account
      const account = await serverRef.current.loadAccount(publicKey);
      const freshBalances: BalanceLine[] = account.balances;

      // Validate balances
      const balA = freshBalances.find(b => 
        (assetACode === 'XLM' && b.asset_type === 'native') || 
        (assetACode !== 'XLM' && b.asset_code === assetACode && b.asset_issuer === assetAIssuer)
      )?.balance || '0';
      
      const balB = freshBalances.find(b => 
        (assetBCode === 'XLM' && b.asset_type === 'native') || 
        (assetBCode !== 'XLM' && b.asset_code === assetBCode && b.asset_issuer === assetBIssuer)
      )?.balance || '0';

      console.log('[joinLiquidityPool] Current balances:', { balA, balB });

      // For XLM, account for minimum balance requirement (2 XLM base + reserves)
      const numSubentries = account.subentry_count || 0;
      const minBalance = (2 + numSubentries * 0.5 + 1); // +1 for safety buffer
      
      if (assetACode === 'XLM') {
        const availableXLM = parseFloat(balA) - minBalance;
        if (availableXLM < parseFloat(maxAmountA)) {
          throw new Error(`Insufficient XLM. Available: ${availableXLM.toFixed(2)} XLM (after reserves)`);
        }
      } else if (parseFloat(balA) < parseFloat(maxAmountA)) {
        throw new Error(`Insufficient ${assetACode}. Available: ${balA}`);
      }

      if (assetBCode === 'XLM') {
        const availableXLM = parseFloat(balB) - minBalance;
        if (availableXLM < parseFloat(maxAmountB)) {
          throw new Error(`Insufficient XLM. Available: ${availableXLM.toFixed(2)} XLM (after reserves)`);
        }
      } else if (parseFloat(balB) < parseFloat(maxAmountB)) {
        throw new Error(`Insufficient ${assetBCode}. Available: ${balB}`);
      }

      // Build transaction
      const kp = Keypair.fromSecret(secretKey);
      const fee = String(await serverRef.current.fetchBaseFee());
      let builder = new TransactionBuilder(account, { fee, networkPassphrase: cfg.passphrase });
      
      // Check if trustline exists for pool shares
      const hasPoolShareTrustline = freshBalances.some(b => b.liquidity_pool_id === poolId);
      console.log('[joinLiquidityPool] Has pool share trustline:', hasPoolShareTrustline);

      if (!hasPoolShareTrustline) {
        console.log('[joinLiquidityPool] Adding pool share trustline...');
        
        // Create LiquidityPoolAsset - FIXED: Use correct constructor
        const LiquidityPoolAsset = (Stellar as any).LiquidityPoolAsset;
        if (!LiquidityPoolAsset) {
          throw new Error('LiquidityPoolAsset not available in SDK');
        }

        // The constructor expects (assetA, assetB, fee) where fee is in basis points (30 = 0.30%)
        const poolAsset = new LiquidityPoolAsset(assetA, assetB, Stellar.LiquidityPoolFeeV18);
        
        builder = builder.addOperation(Operation.changeTrust({
          asset: poolAsset,
          limit: '922337203685.4775807' // Max limit
        }));
      }

      // Add liquidityPoolDeposit operation - FIXED: Use correct price format
      console.log('[joinLiquidityPool] Adding deposit operation...');
      builder = builder.addOperation(
        Operation.liquidityPoolDeposit({
          liquidityPoolId: poolId,
          maxAmountA: canonicalMaxAmountA,
          maxAmountB: canonicalMaxAmountB,
          minPrice: { n: 9, d: 10 },  // 0.9 as fraction
          maxPrice: { n: 11, d: 10 }  // 1.1 as fraction
        })
      );

      console.log('[joinLiquidityPool] Submitting transaction...');
      await submitTx(builder, kp);
      console.log('[joinLiquidityPool] Success!');

    } catch (e: any) {
      console.error('[joinLiquidityPool] Error:', e);
      
      // Log full error details for debugging
      if (e.response?.data) {
        console.error('[joinLiquidityPool] Horizon error details:', e.response.data);
      }
      
      setError(e.message || 'Failed to join liquidity pool');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const value: WalletContextValue = {
    publicKey,
    secretKey,
    balance,
    balances,
    unfunded,
    isTestnet: cfg.isTestnet,
    loading,
    lastUpdated,
    error,

    generateWallet,
    importSecret,
    disconnect,
    refresh,

    createWallet: generateWallet,
    importWallet: importSecret,

    sendPayment,
    sendPaymentLegacy,
    addTrustline,
    removeTrustline,
    joinLiquidityPool,

    networkMode,
    setNetworkMode
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}