import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Type alias for Asset instances using import type
type AssetInstance = InstanceType<typeof import('@stellar/stellar-sdk').Asset>;

// Production Horizon and network passphrase
export const HORIZON_SERVER_URL = "https://horizon.stellar.org";
export const NETWORK_PASSPHRASE = "Public Global Stellar Network ; September 2015";

// Stellar SDK will be loaded dynamically
let StellarSDK: any = null;
let Server: any = null;
let Asset: any = null;
let Keypair: any = null;
let TransactionBuilder: any = null;
let Networks: any = null;
let Operation: any = null;
let server: any = null;

// Initialize Stellar SDK dynamically
const initializeStellarSDK = async () => {
  if (StellarSDK) return; // Already initialized
  
  try {
    // Use dynamic import to load Stellar SDK
    const StellarSdkModule = await import('@stellar/stellar-sdk');
    
    // Handle different export patterns
    StellarSDK = StellarSdkModule.default || StellarSdkModule;
    
    // Extract constructors with fallbacks
    Server = StellarSDK.Server || StellarSdkModule.Server;
    Asset = StellarSDK.Asset || StellarSdkModule.Asset;
    Keypair = StellarSDK.Keypair || StellarSdkModule.Keypair;
    TransactionBuilder = StellarSDK.TransactionBuilder || StellarSdkModule.TransactionBuilder;
    Networks = StellarSDK.Networks || StellarSdkModule.Networks;
    Operation = StellarSDK.Operation || StellarSdkModule.Operation;
    
    // Initialize server instance
    if (Server) {
      server = new Server(HORIZON_SERVER_URL);
    }
    
    console.log('Stellar SDK loaded successfully');
  } catch (error) {
    console.error('Failed to load Stellar SDK:', error);
    throw new Error('Failed to initialize Stellar SDK');
  }
};

interface BalanceItem {
  asset_type: string; // "native" or "credit_alphanum4"/"credit_alphanum12"
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

interface WalletContextProps {
  publicKey: string | null;
  secretKey: string | null;
  balance: string;
  balances: BalanceItem[];
  loading: boolean;
  error: string | null;
  connectWallet: (secretKey: string) => Promise<void>;
  createWallet: () => void;
  importWallet: (secretKey: string) => Promise<void>;
  disconnect: () => void;
  addTrustline: (assetCode: string, issuer: string) => Promise<void>;
  sendPayment: (
    destination: string,
    amount: string,
    assetCode?: string,
    issuer?: string
  ) => Promise<void>;
  joinLiquidityPool: (
    assetA: AssetInstance,
    assetB: AssetInstance,
    amountA: string,
    amountB: string
  ) => Promise<void>;
}

const WalletContext = createContext<WalletContextProps | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Computed XLM balance
  const balance = balances.find(b => b.asset_type === "native")?.balance || "0";

  // Initialize Stellar SDK on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeStellarSDK();
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize Stellar SDK:', err);
        setError('Failed to initialize Stellar SDK');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (publicKey && isInitialized) {
      fetchBalance(publicKey);
    } else {
      setBalances([]);
    }
  }, [publicKey, isInitialized]);

  const fetchBalance = async (accountId: string) => {
    if (!server) {
      setError('Stellar SDK not initialized');
      return;
    }
    
    try {
      setLoading(true);
      const account = await server.loadAccount(accountId);
      const accountBalances: BalanceItem[] = account.balances.map((b: any) => ({
        asset_type: b.asset_type,
        asset_code: b.asset_code || undefined,
        asset_issuer: b.asset_issuer || undefined,
        balance: b.balance,
      }));
      setBalances(accountBalances);
    } catch (err) {
      console.error("Error fetching balance:", err);
      setError("Failed to fetch balance");
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async (secret: string) => {
    if (!Keypair) {
      setError('Stellar SDK not initialized');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const keypair = Keypair.fromSecret(secret);
      setPublicKey(keypair.publicKey());
      setSecretKey(secret);
    } catch {
      setError("Invalid secret key");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setPublicKey(null);
    setSecretKey(null);
    setBalances([]);
  };

  const addTrustline = async (assetCode: string, issuer: string) => {
    if (!publicKey || !secretKey || !server || !TransactionBuilder || !Operation || !Asset || !Keypair) {
      setError('Wallet not connected or Stellar SDK not initialized');
      return;
    }
    
    setLoading(true);
    try {
      const account = await server.loadAccount(publicKey);
      const fee = await server.fetchBaseFee();
      const transaction = new TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.changeTrust({
            asset: new Asset(assetCode, issuer),
          })
        )
        .setTimeout(30)
        .build();
      transaction.sign(Keypair.fromSecret(secretKey));
      await server.submitTransaction(transaction);
      await fetchBalance(publicKey);
    } catch (err) {
      console.error("Error adding trustline:", err);
      setError("Failed to add trustline");
    } finally {
      setLoading(false);
    }
  };

  const sendPayment = async (
    destination: string,
    amount: string,
    assetCode?: string,
    issuer?: string
  ) => {
    if (!publicKey || !secretKey || !server || !TransactionBuilder || !Operation || !Asset || !Keypair) {
      setError('Wallet not connected or Stellar SDK not initialized');
      return;
    }
    
    setLoading(true);
    try {
      const account = await server.loadAccount(publicKey);
      const fee = await server.fetchBaseFee();
      const asset = assetCode && issuer ? new Asset(assetCode, issuer) : Asset.native();
      const transaction = new TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: NETWORK_PASSPHRASE,
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
      transaction.sign(Keypair.fromSecret(secretKey));
      await server.submitTransaction(transaction);
      await fetchBalance(publicKey);
    } catch (err) {
      console.error("Error sending payment:", err);
      setError("Failed to send payment");
    } finally {
      setLoading(false);
    }
  };

  const joinLiquidityPool = async (
    assetA: AssetInstance,
    assetB: AssetInstance,
    amountA: string,
    amountB: string
  ) => {
    if (!publicKey || !secretKey) return;
    setLoading(true);
    try {
      // Note: Liquidity pool functionality temporarily disabled pending SDK compatibility checks
      setError("Liquidity pool functionality temporarily unavailable");
      console.log("Liquidity pool deposit:", { assetA, assetB, amountA, amountB });
    } catch {
      setError("Failed to join liquidity pool");
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
        balances,
        loading: loading || !isInitialized,
        error,
        connectWallet,
        createWallet: () => {}, // You can implement wallet generation here
        importWallet: connectWallet, // Alias for now
        disconnect,
        addTrustline,
        sendPayment,
        joinLiquidityPool,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
};