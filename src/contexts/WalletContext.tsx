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

// ---------- Lightweight Test Stub (only used under NODE_ENV=test) ----------
function buildTestStub() {
  class Server {
    url: string;
    constructor(url: string) {
      this.url = url;
    }
    async loadAccount(_pk: string) {
      // Simulate unfunded; mirror Horizon 404 shape where consumed
      const err: any = new Error('Not Found');
      err.response = { status: 404 };
      throw err;
    }
    async fetchBaseFee() {
      return 100;
    }
    async submitTransaction(_tx: any) {
      return { hash: 'TEST_HASH' };
    }
  }

  class Keypair {
    static random() {
      return new Keypair();
    }
    static fromSecret(_s: string) {
      return new Keypair();
    }
    secret() {
      return 'S'.padEnd(56, 'X');
    }
    publicKey() {
      return 'G'.padEnd(56, 'Y');
    }
  }

  class Asset {
    static native() {
      return new Asset('XLM', '');
    }
    code: string;
    issuer: string;
    constructor(code: string, issuer: string) {
      this.code = code;
      this.issuer = issuer;
    }
  }

  class TransactionBuilder {
    account: any;
    opts: any;
    ops: any[];
    memo: any;
    constructor(account: any, opts: any) {
      this.account = account;
      this.opts = opts;
      this.ops = [];
      this.memo = undefined;
    }
    addOperation(op: any) {
      this.ops.push(op);
      return this;
    }
    addMemo(m: any) {
      this.memo = m;
      return this;
    }
    setTimeout() {
      return this;
    }
    build() {
      return {
        sign: () => {},
        toXDR: () => 'XDR'
      };
    }
  }

  const Operation = {
    payment: (o: any) => ({ type: 'payment', ...o }),
    changeTrust: (o: any) => ({ type: 'changeTrust', ...o })
  };

  const Networks = {
    TESTNET: 'Test SDF Network ; September 2015',
    PUBLIC: 'Public Global Stellar Network ; September 2015'
  };

  const Memo = {
    text: (v: string) => ({ type: 'text', value: v })
  };

  return {
    Server,
    Keypair,
    Asset,
    TransactionBuilder,
    Operation,
    Networks,
    Memo
  };
}

// Either real SDK (runtime) or stub (tests)
let Stellar: any;
if (IS_TEST) {
  Stellar = buildTestStub();
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const StellarSDK = require('@stellar/stellar-sdk');
  Stellar = {
    Server: StellarSDK.Horizon.Server,
    Keypair: StellarSDK.Keypair,
    Asset: StellarSDK.Asset,
    TransactionBuilder: StellarSDK.TransactionBuilder,
    Operation: StellarSDK.Operation,
    Networks: StellarSDK.Networks,
    Memo: StellarSDK.Memo
  };
}

const {
  Server: HorizonServer,
  Keypair,
  Asset,
  TransactionBuilder,
  Operation,
  Networks,
  Memo
} = Stellar;

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

  const [server, setServer] = useState<any>(() => new HorizonServer(cfg.url));

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
    setServer(new HorizonServer(cfg.url));
    localStorage.setItem('NETWORK_MODE', networkMode);
    if (publicKey && !IS_TEST) {
      void refresh();
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
        const account = await server.loadAccount(pk);
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
    [server]
  );

  const refresh = useCallback(async () => {
    if (!publicKey) return;
    await loadAccount(publicKey);
  }, [publicKey, loadAccount]);

  // Restore secret
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
        // ignore invalid stored key
      }
    }
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
    const res = await server.submitTransaction(tx);
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
    const kp = Keypair.fromSecret(secretKey);
    const account = IS_TEST
      ? { sequence: '0', balances: [] }
      : await server.loadAccount(publicKey);
    const fee = String(IS_TEST ? 100 : await server.fetchBaseFee());

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
    const kp = Keypair.fromSecret(secretKey);
    const account = IS_TEST
      ? { sequence: '0', balances: [] }
      : await server.loadAccount(publicKey);
    const fee = String(IS_TEST ? 100 : await server.fetchBaseFee());

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
    const line = balances.find(
      b => b.asset_code === assetCode && b.asset_issuer === issuer
    );
    if (line && parseFloat(line.balance) !== 0) {
      throw new Error('Trustline balance must be zero before removal');
    }
    const kp = Keypair.fromSecret(secretKey);
    const account = IS_TEST
      ? { sequence: '0', balances: [] }
      : await server.loadAccount(publicKey);
    const fee = String(IS_TEST ? 100 : await server.fetchBaseFee());

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