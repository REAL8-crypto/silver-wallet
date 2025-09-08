import React, { createContext, useState, useContext, ReactNode } from 'react';
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

interface WalletContextProps {
  publicKey: string | null;
  secretKey: string | null;
  network: NetworkType;
  isLoading: boolean;
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

  const server = new Server(network === 'TESTNET' ? HORIZON_TESTNET : HORIZON_PUBLIC);
  const networkPassphrase = network === 'TESTNET' ? Networks.TESTNET : Networks.PUBLIC;

  const createNewAccount = async () => {
    const pair = Keypair.random();
    setPublicKey(pair.publicKey());
    setSecretKey(pair.secret());
    if (network === 'TESTNET') {
      await fetch(`https://friendbot.stellar.org?addr=${pair.publicKey()}`);
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
    return await server.submitTransaction(tx);
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

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        secretKey,
        network,
        isLoading,
        createNewAccount,
        importAccount,
        toggleNetwork,
        fundWithFriendbot,
        addTrustline,
        sendPayment,
        joinLiquidityPool
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
