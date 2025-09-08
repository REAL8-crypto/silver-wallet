import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import {
  Keypair,
  Server,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  Operation,
  Asset,
  getLiquidityPoolId,
  LiquidityPoolFeeV18,
  AccountResponse
} from '@stellar/stellar-sdk';

type NetworkType = 'TESTNET' | 'PUBLIC';

interface BalanceItem {
  asset_code: string;
  asset_issuer?: string;
  balance: string;
}

interface WalletContextProps {
  publicKey: string | null;
  secretKey: string | null;
  network: NetworkType;
  isLoading: boolean;
  balance: BalanceItem[];
  createNewAccount: () => Promise<void>;
  importAccount: (secret: string) => boolean;
  toggleNetwork: () => void;
  fundWithFriendbot: () => Promise<void>;
  addTrustline: (assetCode: string, issuer: string) => Promise<void>;
  sendPayment: (destination: string, amount: string, asset?: Asset) => Promise<void>;
  joinLiquidityPool: (
    assetA: Asset,
    assetB: Asset,
    maxAmountA: string,
    maxAmountB: string,
    minPrice: string,
    maxPrice: string
  ) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextProps>({} as WalletContextProps);
export const useWallet = () => useContext(WalletContext);

const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';
const HORIZON_PUBLIC = 'https://horizon.stellar.org';

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkType>('TESTNET');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [balance, setBalance] = useState<BalanceItem[]>([]);

  const server = new Server(network === 'TESTNET' ? HORIZON_TESTNET : HORIZON_PUBLIC);
  const networkPassphrase = network === 'TESTNET' ? Networks.TESTNET : Networks.PUBLIC;

  useEffect(() => {
    if (publicKey) {
      refreshBalance();
    } else {
      setBalance([]);
    }
  }, [publicKey, network]);

  const refreshBalance = async () => {
    if (!publicKey) return;
    try {
      const account = await server.loadAccount(publicKey);
      const balances = account.balances.map(b => ({
        asset_code: b.asset_type === 'native' ? 'XLM' : b.asset_code!,
        asset_issuer: b.asset_issuer,
        balance: b.balance
      }));
      setBalance(balances);
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  };

  const createNewAccount = async () => {
    const pair = Keypair.random();
    setPublicKey(pair.publicKey());
    setSecretKey(pair.secret());
    if (network === 'TESTNET') {
      await fetch(`https://friendbot.stellar.org?addr=${pair.publicKey()}`);
      await refreshBalance();
    }
  };

  const importAccount = (secret: string): boolean => {
    try {
      const pair = Keypair.fromSecret(secret);
      setPublicKey(pair.publicKey());
      setSecretKey(secret);
      return true;
    } catch {
      return false;
    }
  };

  const toggleNetwork = () => {
    setNetwork(prev => (prev === 'TESTNET' ? 'PUBLIC' : 'TESTNET'));
  };

  const fundWithFriendbot = async () => {
    if (network !== 'TESTNET' || !publicKey) return;
    await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
    await refreshBalance();
  };

  const getAccount = async (): Promise<AccountResponse> => {
    if (!publicKey) throw new Error('No account loaded');
    return await server.loadAccount(publicKey);
  };

  const signAndSubmit = async (txBuilder: TransactionBuilder) => {
    if (!secretKey) throw new Error('No secret key available');
    const tx = txBuilder.build();
    const keypair = Keypair.fromSecret(secretKey);
    tx.sign(keypair);
    const result = await server.submitTransaction(tx);
    await refreshBalance();
    return result;
  };

  const addTrustline = async (assetCode: string, issuer: string) => {
    setIsLoading(true);
    try {
      const account = await getAccount();
      const asset = new Asset(assetCode, issuer);
      const txBuilder = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase
      }).addOperation(Operation.changeTrust({ asset }));

      await signAndSubmit(txBuilder.setTimeout(30));
    } finally {
      setIsLoading(false);
    }
  };

  const sendPayment = async (destination: string, amount: string, asset: Asset = Asset.native()) => {
    setIsLoading(true);
    try {
      const account = await getAccount();
      const txBuilder = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase
      }).addOperation(Operation.payment({
        destination,
        asset,
        amount
      }));

      await signAndSubmit(txBuilder.setTimeout(30));
    } finally {
      setIsLoading(false);
    }
  };

  const joinLiquidityPool = async (
    assetA: Asset,
    assetB: Asset,
    maxAmountA: string,
    maxAmountB: string,
    minPrice: string,
    maxPrice: string
  ) => {
    setIsLoading(true);
    try {
      const account = await getAccount();
      const poolId = getLiquidityPoolId('constant_product', {
        assetA,
        assetB,
        fee: LiquidityPoolFeeV18
      });

      const txBuilder = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase
      }).addOperation(Operation.liquidityPoolDeposit({
        liquidityPoolId: poolId,
        maxAmountA,
        maxAmountB,
        minPrice,
        maxPrice
      }));

      await signAndSubmit(txBuilder.setTimeout(30));
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setPublicKey(null);
    setSecretKey(null);
    setBalance([]);
  };

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        secretKey,
        network,
        isLoading,
        balance,
        createNewAccount,
        importAccount,
        toggleNetwork,
        fundWithFriendbot,
        addTrustline,
        sendPayment,
        joinLiquidityPool,
        disconnect
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
