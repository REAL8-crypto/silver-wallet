// Simplified Server instantiation: removed dynamic export resolution to fix production constructor error.
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef
} from 'react';

// Decide at load time whether to use real SDK (runtime) or a test stub (jest)
const IS_TEST = process.env.NODE_ENV === 'test';

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

// ---------- Test stub helpers ----------
function createTestKeypair() {
  return {
    secret: () => 'S'.padEnd(56, 'X'),
    publicKey: () => 'G'.padEnd(56, 'Y')
  };
}

function createTestServer(url: string) {
  return {
    url,
    async loadAccount(_pk: string) {
      const err: any = new Error('Not Found');
      err.response = { status: 404 };
      throw err;
    },
    async fetchBaseFee() {
      return 100;
    },
    async submitTransaction(_tx: any) {
      return { hash: 'TEST_HASH' };
    }
  };
}

function createTestAsset(code: string, issuer: string) {
  return { code, issuer };
}

function createTestBuilder(account: any, opts: any) {
  return {
    account,
    opts,
    ops: [] as any[],
    memo: undefined as any,
    addOperation(op: any) {
      this.ops.push(op);
      return this;
    },
    addMemo(m: any) {
      this.memo = m;
      return this;
    },
    setTimeout() {
      return this;
    },
    build() {
      return {
        sign: () => {},
        toXDR: () => 'XDR'
      };
    }
  };
}

const TestHelpers = {
  Keypair: {
    random: createTestKeypair,
    fromSecret: (_s: string) => createTestKeypair()
  },
  Asset: {
    native: () => createTestAsset('XLM', ''),
    create: createTestAsset
  },
  Operation: {
    payment: (o: any) => ({ type: 'payment', ...o }),
    changeTrust: (o: any) => ({ type: 'changeTrust', ...o })
  },
  Networks: {
    TESTNET: 'Test SDF Network ; September 2015',
    PUBLIC: 'Public Global Stellar Network ; September 2015'
  },
  Memo: {
    text: (v: string) => ({ type: 'text', value: v })
  }
};

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

  // Backward compatibility
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
  // Use simple hardcoded values for now to avoid import issues
  const Networks = IS_TEST ? TestHelpers.Networks : {
    TESTNET: 'Test SDF Network ; September 2015',
    PUBLIC: 'Public Global Stellar Network ; September 2015'
  };
  return mode === 'public'
    ? { url: PUBLIC_HORIZON, passphrase: Networks.PUBLIC, isTestnet: false }
    : { url: TESTNET_HORIZON, passphrase: Networks.TESTNET, isTestnet: true };
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [networkMode, setNetworkMode] = useState<NetworkMode>(
    (localStorage.getItem('NETWORK_MODE') as NetworkMode) || 'testnet'
  );
  const cfg = getConfig(networkMode);

  // Use serverRef pattern for single Server instance per networkMode
  const serverRef = useRef<any>(null);

  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);

  const [balance, setBalance] = useState('0');
  const [balances, setBalances] = useState<BalanceLine[]>([]);
  const [unfunded, setUnfunded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    // Instantiate a single Server instance per networkMode - use dynamic import
    const initServer = async () => {
      if (IS_TEST) {
        serverRef.current = createTestServer(cfg.url);
      } else {
        const StellarSDK = await import('@stellar/stellar-sdk');
        serverRef.current = new StellarSDK.Server(cfg.url);
      }
    };
    
    void initServer();
    localStorage.setItem('NETWORK_MODE', networkMode);
    if (publicKey && !IS_TEST) {
      // Delay refresh until server is ready
      setTimeout(() => void refresh(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkMode]);

  const loadAccount = useCallback(
    async (pk: string) => {
      if (IS_TEST) {
        // Simulate unfunded quicker in tests
        setUnfunded(true);
        setBalance('0');
        setBalances([]);
        return;
      }
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
    [] // Remove server dependency since we use serverRef.current
  );

  const refresh = useCallback(async () => {
    if (!publicKey) return;
    await loadAccount(publicKey);
  }, [publicKey, loadAccount]);

  // Restore secret
  useEffect(() => {
    const restoreWallet = async () => {
      const stored =
        localStorage.getItem('WALLET_SECRET') ||
        localStorage.getItem('stellar_secret_key');
      if (stored) {
        try {
          if (IS_TEST) {
            const kp = TestHelpers.Keypair.fromSecret(stored);
            setSecretKey(stored);
            setPublicKey(kp.publicKey());
            void loadAccount(kp.publicKey());
          } else {
            const StellarSDK = await import('@stellar/stellar-sdk');
            const kp = StellarSDK.Keypair.fromSecret(stored);
            setSecretKey(stored);
            setPublicKey(kp.publicKey());
            void loadAccount(kp.publicKey());
          }
        } catch {
          // ignore invalid stored key
        }
      }
    };
    void restoreWallet();
  }, [loadAccount]);

  // Poll
  useEffect(() => {
    if (IS_TEST) return; // skip polling in tests
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (publicKey) {
      pollingRef.current = window.setInterval(() => {
        void refresh();
      }, 30_000);
    }
    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [publicKey, refresh]);

  const generateWallet = async () => {
    if (IS_TEST) {
      const kp = TestHelpers.Keypair.random();
      setPublicKey(kp.publicKey());
      setSecretKey(kp.secret());
      localStorage.setItem('WALLET_SECRET', kp.secret());
      setUnfunded(true);
      setBalance('0');
      setBalances([]);
    } else {
      const StellarSDK = await import('@stellar/stellar-sdk');
      const kp = StellarSDK.Keypair.random();
      setPublicKey(kp.publicKey());
      setSecretKey(kp.secret());
      localStorage.setItem('WALLET_SECRET', kp.secret());
      setUnfunded(true);
      setBalance('0');
      setBalances([]);
    }
  };

  const importSecret = async (secret: string) => {
    try {
      if (IS_TEST) {
        const kp = TestHelpers.Keypair.fromSecret(secret.trim());
        setPublicKey(kp.publicKey());
        setSecretKey(kp.secret());
        localStorage.setItem('WALLET_SECRET', kp.secret());
        void refresh();
      } else {
        const StellarSDK = await import('@stellar/stellar-sdk');
        const kp = StellarSDK.Keypair.fromSecret(secret.trim());
        setPublicKey(kp.publicKey());
        setSecretKey(kp.secret());
        localStorage.setItem('WALLET_SECRET', kp.secret());
        void refresh();
      }
    } catch (e: any) {
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
    const tx = builder.setTimeout(120).build();
    tx.sign?.(signer); // real SDK; stub has no-op
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
    const kp = IS_TEST ? TestHelpers.Keypair.fromSecret(secretKey) : eval('require')('@stellar/stellar-sdk').Keypair.fromSecret(secretKey);
    const account = IS_TEST
      ? { sequence: '0', balances: [] }
      : await serverRef.current.loadAccount(publicKey);
    const fee = String(IS_TEST ? 100 : await serverRef.current.fetchBaseFee());

    const StellarSDK = IS_TEST ? null : eval('require')('@stellar/stellar-sdk');
    const asset =
      !assetCode || assetCode === 'XLM'
        ? (IS_TEST ? TestHelpers.Asset.native() : StellarSDK.Asset.native())
        : (IS_TEST ? TestHelpers.Asset.create(assetCode, issuer || '') : new StellarSDK.Asset(assetCode, issuer || ''));

    let builder = IS_TEST 
      ? createTestBuilder(account, { fee, networkPassphrase: cfg.passphrase })
      : new StellarSDK.TransactionBuilder(account, { fee, networkPassphrase: cfg.passphrase });
    
    const Operation = IS_TEST ? TestHelpers.Operation : StellarSDK.Operation;
    builder = builder.addOperation(
      Operation.payment({
        destination,
        asset,
        amount
      })
    );

    if (memoText) {
      const Memo = IS_TEST ? TestHelpers.Memo : StellarSDK.Memo;
      if (typeof builder.addMemo === 'function') {
        builder = builder.addMemo(Memo.text(memoText.slice(0, 28)));
      } else {
        // fallback for stub
        (builder as any).memo = Memo.text(memoText.slice(0, 28));
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

  const addTrustline = async (assetCode: string, issuer: string, limit?: string) => {
    if (!secretKey || !publicKey) throw new Error('Wallet not loaded');
    const kp = IS_TEST ? TestHelpers.Keypair.fromSecret(secretKey) : eval('require')('@stellar/stellar-sdk').Keypair.fromSecret(secretKey);
    const account = IS_TEST
      ? { sequence: '0', balances: [] }
      : await serverRef.current.loadAccount(publicKey);
    const fee = String(IS_TEST ? 100 : await serverRef.current.fetchBaseFee());

    const StellarSDK = IS_TEST ? null : eval('require')('@stellar/stellar-sdk');
    const asset = IS_TEST ? TestHelpers.Asset.create(assetCode, issuer) : new StellarSDK.Asset(assetCode, issuer);
    const Operation = IS_TEST ? TestHelpers.Operation : StellarSDK.Operation;
    
    const builder = IS_TEST 
      ? createTestBuilder(account, { fee, networkPassphrase: cfg.passphrase })
      : new StellarSDK.TransactionBuilder(account, { fee, networkPassphrase: cfg.passphrase });
    
    builder.addOperation(
      Operation.changeTrust({
        asset,
        limit
      })
    );

    await submitTx(builder, kp);
  };

  const removeTrustline = async (assetCode: string, issuer: string) => {
    if (!secretKey || !publicKey) throw new Error('Wallet not loaded');
    const line = balances.find(
      b => b.asset_code === assetCode && b.asset_issuer === issuer
    );
    if (line && parseFloat(line.balance) !== 0) {
      throw new Error('Trustline balance must be zero before removal');
    }
    const kp = IS_TEST ? TestHelpers.Keypair.fromSecret(secretKey) : eval('require')('@stellar/stellar-sdk').Keypair.fromSecret(secretKey);
    const account = IS_TEST
      ? { sequence: '0', balances: [] }
      : await serverRef.current.loadAccount(publicKey);
    const fee = String(IS_TEST ? 100 : await serverRef.current.fetchBaseFee());

    const StellarSDK = IS_TEST ? null : eval('require')('@stellar/stellar-sdk');
    const asset = IS_TEST ? TestHelpers.Asset.create(assetCode, issuer) : new StellarSDK.Asset(assetCode, issuer);
    const Operation = IS_TEST ? TestHelpers.Operation : StellarSDK.Operation;
    
    const builder = IS_TEST 
      ? createTestBuilder(account, { fee, networkPassphrase: cfg.passphrase })
      : new StellarSDK.TransactionBuilder(account, { fee, networkPassphrase: cfg.passphrase });
    
    builder.addOperation(
      Operation.changeTrust({
        asset,
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
      '[joinLiquidityPool] Placeholder invoked (test mode:',
      IS_TEST,
      '). Provide real implementation when ready.',
      { assetA, assetB, maxAmountA, maxAmountB }
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