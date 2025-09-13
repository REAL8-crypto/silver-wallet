import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef
} from 'react';
import * as Stellar from '@stellar/stellar-sdk';
import { REAL8 } from '../constants/real8Asset'; // Added for REAL8 defaults

const {
  Keypair,
  Asset,
  TransactionBuilder,
  Operation,
  Networks,
  Memo
} = Stellar as any;

type NetworkMode = 'testnet' | 'public';

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

  // ... existing code (useEffect for networkMode, loadAccount, refresh, restore secret on mount, polling) ...

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
    // ... existing code ...
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
    // ... existing code ...
  };

  const removeTrustline = async (assetCode: string, issuer: string) => {
    // ... existing code ...
  };

  const joinLiquidityPool = async ({
    assetACode = 'XLM', // Default to XLM
    assetAIssuer = '', // Empty for native
    assetBCode = REAL8.CODE, // From real8Asset.ts
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

    try {
      setLoading(true);
      setError(null);

      // Create Asset objects
      const assetA = assetACode === 'XLM' ? Asset.native() : new Asset(assetACode, assetAIssuer);
      const assetB = assetBCode === 'XLM' ? Asset.native() : new Asset(assetBCode, assetBIssuer);

      // Check balances
      await refresh(); // Ensure latest balances
      const balA = balances.find(b => b.asset_type === 'native' || (b.asset_code === assetACode && b.asset_issuer === assetAIssuer))?.balance || '0';
      const balB = balances.find(b => b.asset_type === 'native' || (b.asset_code === assetBCode && b.asset_issuer === assetBIssuer))?.balance || '0';
      if (parseFloat(balA) < parseFloat(maxAmountA) || parseFloat(balB) < parseFloat(maxAmountB)) {
        throw new Error('Insufficient balance for one or both assets');
      }

      // Check/add trustlines if needed (for non-native assets)
      if (assetACode !== 'XLM' && !balances.some(b => b.asset_code === assetACode && b.asset_issuer === assetAIssuer)) {
        await addTrustline(assetACode, assetAIssuer);
      }
      if (assetBCode !== 'XLM' && !balances.some(b => b.asset_code === assetBCode && b.asset_issuer === assetBIssuer)) {
        await addTrustline(assetBCode, assetBIssuer);
      }

      // Build and submit transaction
      const kp = Keypair.fromSecret(secretKey);
      const account = await serverRef.current.loadAccount(publicKey);
      const fee = String(await serverRef.current.fetchBaseFee());
      const builder = new TransactionBuilder(account, { fee, networkPassphrase: cfg.passphrase })
        .addOperation(
          Operation.liquidityPoolDeposit({
            liquidityPoolId: [assetA, assetB], // SDK auto-computes ID
            maxAmountA,
            maxAmountB,
            minPrice: '0.9', // Example: 10% slippage tolerance (adjust as needed)
            maxPrice: '1.1'
          })
        );
      await submitTx(builder, kp);
    } catch (e: any) {
      console.error('[joinLiquidityPool] Error:', e);
      setError(e.message || 'Failed to join liquidity pool');
      throw e; // Propagate to UI
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
