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

    try {
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

    try {
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

      // Validate amounts are positive
      if (parseFloat(maxAmountA) <= 0 || parseFloat(maxAmountB) <= 0) {
        throw new Error('Amounts must be positive');
      }

      // Build Asset instances for A and B
      const assetA = assetACode === 'XLM' ? Asset.native() : new Asset(assetACode, assetAIssuer);
      const assetB = assetBCode === 'XLM' ? Asset.native() : new Asset(assetBCode, assetBIssuer);

      // Fetch the pool via server.liquidityPools().forAssets(A, B).call() and extract pool.id
      const poolsResponse = await serverRef.current.liquidityPools().forAssets(assetA, assetB).call();
      if (!poolsResponse.records || poolsResponse.records.length === 0) {
        throw new Error('Liquidity pool not found for these assets');
      }
      const pool = poolsResponse.records[0];
      const poolId = pool.id;

      // Determine canonical order from pool.reserves[0].asset vs A/B and map maxAmountA/maxAmountB accordingly
      const reserve0Asset = pool.reserves[0].asset;
      let canonicalAssetA, canonicalAssetB, canonicalMaxAmountA, canonicalMaxAmountB;

      // Check if our assetA matches reserve0
      const assetAMatches = (reserve0Asset === 'native' && assetACode === 'XLM') ||
                           (reserve0Asset !== 'native' && assetACode === reserve0Asset.split(':')[0] && 
                            assetAIssuer === reserve0Asset.split(':')[1]);

      if (assetAMatches) {
        // Our A matches reserve 0, so A->A, B->B
        canonicalAssetA = assetA;
        canonicalAssetB = assetB;
        canonicalMaxAmountA = maxAmountA;
        canonicalMaxAmountB = maxAmountB;
      } else {
        // Our A matches reserve 1, so swap: A->B, B->A
        canonicalAssetA = assetB;
        canonicalAssetB = assetA;
        canonicalMaxAmountA = maxAmountB;
        canonicalMaxAmountB = maxAmountA;
      }

      // Load a fresh account and compute balances for A and B precisely
      const account = await serverRef.current.loadAccount(publicKey);
      const freshBalances: BalanceLine[] = account.balances;

      const balA = freshBalances.find(b => 
        (assetACode === 'XLM' && b.asset_type === 'native') || 
        (assetACode !== 'XLM' && b.asset_code === assetACode && b.asset_issuer === assetAIssuer)
      )?.balance || '0';
      
      const balB = freshBalances.find(b => 
        (assetBCode === 'XLM' && b.asset_type === 'native') || 
        (assetBCode !== 'XLM' && b.asset_code === assetBCode && b.asset_issuer === assetBIssuer)
      )?.balance || '0';

      // Validate amounts are within balances
      if (parseFloat(balA) < parseFloat(maxAmountA) || parseFloat(balB) < parseFloat(maxAmountB)) {
        throw new Error('Insufficient balance for one or both assets');
      }

      // Check/add trustlines if needed (for non-native assets)
      const kp = Keypair.fromSecret(secretKey);
      const fee = String(await serverRef.current.fetchBaseFee());
      let builder = new TransactionBuilder(account, { fee, networkPassphrase: cfg.passphrase });
      
      if (assetACode !== 'XLM' && !freshBalances.some(b => b.asset_code === assetACode && b.asset_issuer === assetAIssuer)) {
        builder = builder.addOperation(Operation.changeTrust({
          asset: assetA
        }));
      }
      if (assetBCode !== 'XLM' && !freshBalances.some(b => b.asset_code === assetBCode && b.asset_issuer === assetBIssuer)) {
        builder = builder.addOperation(Operation.changeTrust({
          asset: assetB
        }));
      }

      // If no trustline exists for the pool shares, add changeTrust for the pool shares
      const hasPoolShareTrustline = freshBalances.some(b => b.liquidity_pool_id === poolId);
      if (!hasPoolShareTrustline) {
        // Use LiquidityPoolFeeV18 if available (default 30), or fall back to number
        let fee_bp;
        try {
          fee_bp = (Stellar as any).LiquidityPoolFeeV18?.liquidityPoolFeeV18 || 30;
        } catch {
          fee_bp = 30;
        }
        
        const poolAsset = new (Stellar as any).LiquidityPoolAsset(canonicalAssetA, canonicalAssetB, fee_bp);
        builder = builder.addOperation(Operation.changeTrust({
          asset: poolAsset
        }));
      }

      // Use Operation.liquidityPoolDeposit with correct pool ID and canonical order
      builder = builder.addOperation(
        Operation.liquidityPoolDeposit({
          liquidityPoolId: poolId,
          maxAmountA: canonicalMaxAmountA,
          maxAmountB: canonicalMaxAmountB,
          minPrice: '0.9', // Keep placeholders as specified
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
