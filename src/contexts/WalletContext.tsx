import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef
} from 'react';
import * as Stellar from '@stellar/stellar-sdk';

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
    assetA: any;
    assetB: any;
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

  /**
   * Initialize or recreate the Server on network change.
   */
  useEffect(() => {
    localStorage.setItem('NETWORK_MODE', networkMode);
    // Resolve constructor
    if (!serverCtorRef.current) {
      serverCtorRef.current = getServerCtor(Stellar);
    }
    if (!serverCtorRef.current) {
      if (!warnedRef.current) {
        warnedRef.current = true;
        console.error(
          '[WalletContext] Unable to resolve Stellar Server constructor. Export keys:',
          Object.keys(Stellar)
        );
      }
      setError('Internal: Stellar Server constructor not found');
      return;
    }
    try {
      serverRef.current = new serverCtorRef.current(cfg.url);
    } catch (e) {
      console.error('[WalletContext] Failed to instantiate Server', e);
      setError('Failed to create Horizon server instance');
      serverRef.current = null;
    }
    // Refresh if key present
    if (publicKey) {
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkMode]);

  const loadAccount = useCallback(
    async (pk: string) => {
      if (!serverRef.current) return;
      setError(null);
      try {
        setLoading(true);
        const account = await serverRef.current.loadAccount(pk);
        setUnfunded(false);
        const native = (account.balances as BalanceLine[]).find(
          (b: BalanceLine) => b.asset_type === 'native'
        );
        setBalance(native ? native.balance : '0');
        setBalances(account.balances as BalanceLine[]);
        setLastUpdated(new Date());
      } catch (e: any) {
        if (e?.response?.status === 404) {
          setUnfunded(true);
          setBalance('0');
          setBalances([]);
        } else {
          console.error('[WalletContext] loadAccount error', e);
          setError(e?.message || 'Account load failed');
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!publicKey) return;
    if (!serverRef.current) return;
    await loadAccount(publicKey);
  }, [publicKey, loadAccount]);

  // Restore secret on mount
  useEffect(() => {
    const stored =
      localStorage.getItem('WALLET_SECRET') ||
      localStorage.getItem('stellar_secret_key');
    if (stored) {
      try {
        const kp = Keypair.fromSecret(stored);
        setSecretKey(stored);
        setPublicKey(kp.publicKey());
        void loadAccount(kp.publicKey());
      } catch {
        // ignore
      }
    }
  }, [loadAccount]);

  // Poll
  useEffect(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (publicKey && serverRef.current) {
      pollingRef.current = window.setInterval(() => {
        void refresh();
      }, 30000);
    }
    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [publicKey, refresh]);

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

    const kp = Keypair.fromSecret(secretKey);
    const account = await serverRef.current.loadAccount(publicKey);
    const fee = String(await serverRef.current.fetchBaseFee());

    const asset =
      !assetCode || assetCode === 'XLM'
        ? Asset.native()
        : new Asset(assetCode, issuer || '');

    let builder = new TransactionBuilder(account, {
      fee,
      networkPassphrase: cfg.passphrase
    }).addOperation(
      Operation.payment({
        destination,
        asset,
        amount
      })
    );

    if (memoText) {
      if (typeof (builder as any).addMemo === 'function') {
        builder = (builder as any).addMemo(Memo.text(memoText.slice(0, 28)));
      } else {
        // fallback
        // @ts-ignore
        builder.memo = Memo.text(memoText.slice(0, 28));
      }
    }

    await submitTx(builder, kp);
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
    const kp = Keypair.fromSecret(secretKey);
    const account = await serverRef.current.loadAccount(publicKey);
    const fee = String(await serverRef.current.fetchBaseFee());

    const builder = new TransactionBuilder(account, {
      fee,
      networkPassphrase: cfg.passphrase
    }).addOperation(
      Operation.changeTrust({
        asset: new Asset(assetCode, issuer),
        limit
      })
    );
    await submitTx(builder, kp);
  };

  const removeTrustline = async (assetCode: string, issuer: string) => {
    if (!secretKey || !publicKey) throw new Error('Wallet not loaded');
    if (!serverRef.current) throw new Error('Server not initialized');

    const line = balances.find(
      b => b.asset_code === assetCode && b.asset_issuer === issuer
    );
    if (line && parseFloat(line.balance) !== 0) {
      throw new Error('Trustline balance must be zero before removal');
    }

    const kp = Keypair.fromSecret(secretKey);
    const account = await serverRef.current.loadAccount(publicKey);
    const fee = String(await serverRef.current.fetchBaseFee());

    const builder = new TransactionBuilder(account, {
      fee,
      networkPassphrase: cfg.passphrase
    }).addOperation(
      Operation.changeTrust({
        asset: new Asset(assetCode, issuer),
        limit: '0'
      })
    );
    await submitTx(builder, kp);
  };

  const joinLiquidityPool = async ({
    assetA,
    assetB,
    maxAmountA,
    maxAmountB
  }: {
    assetA: any;
    assetB: any;
    maxAmountA: string;
    maxAmountB: string;
  }) => {
    console.warn(
      '[joinLiquidityPool] Placeholder called',
      assetA,
      assetB,
      maxAmountA,
      maxAmountB
    );
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
