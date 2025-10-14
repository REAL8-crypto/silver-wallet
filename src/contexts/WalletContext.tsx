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
  createWallet: () => void;
  importWallet: (secret: string) => void;
  sendPayment: (opts: {
    destination: string,
    amount: string,
    assetCode?: string,
    issuer?: string,
    memoText?: string
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
    assetACode?: string,
    assetAIssuer?: string,
    assetBCode?: string,
    assetBIssuer?: string,
    maxAmountA: string | { value: string },
    maxAmountB: string | { value: string },
    poolId?: string
  }) => Promise<void>;
  leaveLiquidityPool: (opts: {
    poolId: string,
    sharesAmount: string,
    minAmountA?: string,
    minAmountB?: string
  }) => Promise<void>;
  swapAssets: (opts: {
    sourceAssetCode: string;
    sourceAssetIssuer: string | null;
    destAssetCode: string;
    destAssetIssuer: string | null;
    sendAmount: string;
    destMin: string;
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

function getServerCtor(S: any): any {
  if (S && typeof S.Server === 'function') return S.Server;
  if (S?.Horizon?.Server && typeof S.Horizon.Server === 'function') return S.Horizon.Server;
  if (S?.default?.Server && typeof S.default.Server === 'function') return S.default.Server;
  if (S?.default?.Horizon?.Server && typeof S.default.Horizon.Server === 'function') {
    return S.default.Horizon.Server;
  }
  return null;
}

function parseAssetFromReserve(assetString: string): Asset {
  if (assetString === 'native') {
    return Asset.native();
  }
  const parts = assetString.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid asset format: ${assetString}`);
  }
  return new Asset(parts[0], parts[1]);
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [networkMode, setNetworkMode] = useState<NetworkMode>(
    (localStorage.getItem('NETWORK_MODE') as NetworkMode) || 'public'
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

  useEffect(() => {
    if (publicKey) {
      void loadAccount();
    }
  }, [publicKey, loadAccount]);

  useEffect(() => {
    if (publicKey && !unfunded) {
      pollingRef.current = window.setInterval(() => {
        void loadAccount();
      }, 30000);
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
      if (!destination || !destination.trim()) throw new Error('Destination required');
      if (!amount || Number.isNaN(Number(amount)) || parseFloat(amount) <= 0) throw new Error('Amount must be > 0');
      if (assetCode && assetCode !== 'XLM' && (!issuer || !issuer.trim())) throw new Error('Issuer required for non-native assets');

      const kp = Keypair.fromSecret(secretKey);
      const account = await serverRef.current.loadAccount(publicKey);
      const fee = String(await serverRef.current.fetchBaseFee());
      const asset = (!assetCode || assetCode === 'XLM') ? Asset.native() : new Asset(assetCode, issuer!);

      const builder = new TransactionBuilder(account, { fee, networkPassphrase: cfg.passphrase })
        .addOperation(Operation.payment({
          destination: destination.trim(),
          asset,
          amount: String(amount)
        }));

      if (memoText && memoText.trim().length) {
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
          limit: '0'
        }));

      await submitTx(builder, kp);
    } catch (e: any) {
      console.error('[removeTrustline] Error:', e);
      setError(e?.message || 'Failed to remove trustline');
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
    maxAmountB,
    poolId
  }: {
    assetACode?: string;
    assetAIssuer?: string;
    assetBCode?: string;
    assetBIssuer?: string;
    maxAmountA: string | { value: string };
    maxAmountB: string | { value: string };
    poolId?: string;
  }) => {
    if (!secretKey || !publicKey) throw new Error('Wallet not loaded');
    if (!serverRef.current) throw new Error('Server not initialized');

    try {
      setLoading(true);
      setError(null);

      let normalizedMaxAmountA: string;
      let normalizedMaxAmountB: string;

      if (typeof maxAmountA === 'string') {
        normalizedMaxAmountA = maxAmountA;
      } else if (maxAmountA && typeof maxAmountA === 'object' && 'value' in maxAmountA && typeof maxAmountA.value === 'string') {
        normalizedMaxAmountA = maxAmountA.value;
      } else {
        throw new Error(`Invalid maxAmountA format: ${JSON.stringify(maxAmountA)}`);
      }

      if (typeof maxAmountB === 'string') {
        normalizedMaxAmountB = maxAmountB;
      } else if (maxAmountB && typeof maxAmountB === 'object' && 'value' in maxAmountB && typeof maxAmountB.value === 'string') {
        normalizedMaxAmountB = maxAmountB.value;
      } else {
        throw new Error(`Invalid maxAmountB format: ${JSON.stringify(maxAmountB)}`);
      }

      if (isNaN(parseFloat(normalizedMaxAmountA)) || parseFloat(normalizedMaxAmountA) <= 0 ||
          isNaN(parseFloat(normalizedMaxAmountB)) || parseFloat(normalizedMaxAmountB) <= 0) {
        throw new Error('Amounts must be positive numbers');
      }

      const formattedMaxAmountA = parseFloat(normalizedMaxAmountA).toFixed(7);
      const formattedMaxAmountB = parseFloat(normalizedMaxAmountB).toFixed(7);

      const assetA = assetACode === 'XLM' ? Asset.native() : new Asset(assetACode, assetAIssuer);
      const assetB = assetBCode === 'XLM' ? Asset.native() : new Asset(assetBCode, assetBIssuer);

      let liquidityPoolId: string;

      if (poolId && /^[0-9a-f]{64}$/i.test(poolId)) {
        liquidityPoolId = poolId;
      } else {
        const poolResponse = await serverRef.current
          .liquidityPools()
          .forAssets(assetA, assetB)
          .call();

        if (!poolResponse.records || poolResponse.records.length === 0) {
          throw new Error(`No liquidity pool found for ${assetA.toString()}/${assetB.toString()}`);
        }
        liquidityPoolId = poolResponse.records[0].id;
      }

      const poolResponse = await serverRef.current
        .liquidityPools()
        .liquidityPoolId(liquidityPoolId)
        .call();

      if (!poolResponse.reserves || poolResponse.reserves.length !== 2) {
        throw new Error(`Invalid pool reserves for pool ID ${liquidityPoolId}`);
      }

      const reserve0Asset = parseAssetFromReserve(poolResponse.reserves[0].asset);
      const reserve1Asset = parseAssetFromReserve(poolResponse.reserves[1].asset);

      const assetAMatches = reserve0Asset.equals(assetA);
      let canonicalMaxAmountA = assetAMatches ? formattedMaxAmountA : formattedMaxAmountB;
      let canonicalMaxAmountB = assetAMatches ? formattedMaxAmountB : formattedMaxAmountA;

      const exactPrice = parseFloat(canonicalMaxAmountA) / parseFloat(canonicalMaxAmountB);
      const slippage = 0.10;
      const minPrice = (exactPrice - (exactPrice * slippage)).toFixed(7);
      const maxPrice = (exactPrice + (exactPrice * slippage)).toFixed(7);

      const account = await serverRef.current.loadAccount(publicKey);
      const freshBalances: BalanceLine[] = account.balances;

      const hasPoolShareTrustline = freshBalances.some(
        b => b.liquidity_pool_id === liquidityPoolId
      );

      const balA = freshBalances.find(b =>
        (assetACode === 'XLM' && b.asset_type === 'native') ||
        (b.asset_code === assetACode && b.asset_issuer === assetAIssuer)
      )?.balance || '0';

      const balB = freshBalances.find(b =>
        (assetBCode === 'XLM' && b.asset_type === 'native') ||
        (b.asset_code === assetBCode && b.asset_issuer === assetBIssuer)
      )?.balance || '0';

      const numSubentries = account.subentry_count || 0;
      const futureSubentries = hasPoolShareTrustline ? numSubentries : numSubentries + 1;
      const minBalance = (2 + futureSubentries * 0.5 + 1);

      if (assetACode === 'XLM' && parseFloat(balA) < parseFloat(formattedMaxAmountA) + minBalance) {
        throw new Error(`Insufficient XLM. Available: ${(parseFloat(balA) - minBalance).toFixed(7)}, Needed: ${formattedMaxAmountA}`);
      } else if (assetACode !== 'XLM' && parseFloat(balA) < parseFloat(formattedMaxAmountA)) {
        throw new Error(`Insufficient ${assetACode}. Available: ${balA}`);
      }

      if (assetBCode === 'XLM' && parseFloat(balB) < parseFloat(formattedMaxAmountB) + minBalance) {
        throw new Error(`Insufficient XLM. Available: ${(parseFloat(balB) - minBalance).toFixed(7)}, Needed: ${formattedMaxAmountB}`);
      } else if (assetBCode !== 'XLM' && parseFloat(balB) < parseFloat(formattedMaxAmountB)) {
        throw new Error(`Insufficient ${assetBCode}. Available: ${balB}`);
      }

      const kp = Keypair.fromSecret(secretKey);
      const fee = String(await serverRef.current.fetchBaseFee());

      let builder = new TransactionBuilder(account, {
        fee,
        networkPassphrase: cfg.passphrase
      });

      if (!hasPoolShareTrustline) {
        const poolAsset = new Stellar.LiquidityPoolAsset(
          reserve0Asset,
          reserve1Asset,
          30
        );
        builder = builder.addOperation(
          Operation.changeTrust({
            asset: poolAsset,
            limit: '922337203685.4775807'
          })
        );
        await submitTx(builder, kp);

        const updatedAccount = await serverRef.current.loadAccount(publicKey);
        builder = new TransactionBuilder(updatedAccount, {
          fee,
          networkPassphrase: cfg.passphrase
        });
      }

      builder = builder.addOperation(
        Operation.liquidityPoolDeposit({
          liquidityPoolId,
          maxAmountA: canonicalMaxAmountA,
          maxAmountB: canonicalMaxAmountB,
          minPrice,
          maxPrice
        })
      );

      await submitTx(builder, kp);
    } catch (e: any) {
      console.error('[joinLiquidityPool] Error:', e);
      if (e.response?.data) {
        console.error('[joinLiquidityPool] Horizon error details:', e.response.data);
        console.error('[joinLiquidityPool] Result codes:', e.response.data.extras?.result_codes);
      }
      const errorMessage = e.message || 'Failed to join liquidity pool';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const leaveLiquidityPool = async ({
    poolId,
    sharesAmount,
    minAmountA,
    minAmountB
  }: {
    poolId: string;
    sharesAmount: string;
    minAmountA?: string;
    minAmountB?: string;
  }) => {
    if (!secretKey || !publicKey) throw new Error('Wallet not loaded');
    if (!serverRef.current) throw new Error('Server not initialized');

    try {
      setLoading(true);
      setError(null);

      if (!poolId || !/^[0-9a-f]{64}$/i.test(poolId)) {
        throw new Error('Invalid liquidity pool ID');
      }

      const sharesNum = parseFloat(sharesAmount);
      if (isNaN(sharesNum) || sharesNum <= 0) {
        throw new Error('Shares amount must be a positive number');
      }

      const formattedSharesAmount = sharesNum.toFixed(7);

      const poolResponse = await serverRef.current
        .liquidityPools()
        .liquidityPoolId(poolId)
        .call();

      if (!poolResponse.reserves || poolResponse.reserves.length !== 2) {
        throw new Error(`Invalid pool reserves for pool ID ${poolId}`);
      }

      const totalShares = parseFloat(poolResponse.total_shares);

      let calculatedMinAmountA: string;
      let calculatedMinAmountB: string;

      if (minAmountA && minAmountB) {
        calculatedMinAmountA = parseFloat(minAmountA).toFixed(7);
        calculatedMinAmountB = parseFloat(minAmountB).toFixed(7);
      } else {
        const reserveAAmount = parseFloat(poolResponse.reserves[0].amount);
        const reserveBAmount = parseFloat(poolResponse.reserves[1].amount);
        
        const shareRatio = sharesNum / totalShares;
        const expectedAmountA = shareRatio * reserveAAmount;
        const expectedAmountB = shareRatio * reserveBAmount;
        
        calculatedMinAmountA = (expectedAmountA * 0.95).toFixed(7);
        calculatedMinAmountB = (expectedAmountB * 0.95).toFixed(7);
      }

      const account = await serverRef.current.loadAccount(publicKey);

      const freshBalances: BalanceLine[] = account.balances;
      const poolBalance = freshBalances.find(
        b => b.asset_type === 'liquidity_pool_shares' && b.liquidity_pool_id === poolId
      );

      if (!poolBalance) {
        throw new Error('You do not have shares in this liquidity pool');
      }

      const availableShares = parseFloat(poolBalance.balance);
      if (sharesNum > availableShares) {
        throw new Error(`Insufficient pool shares. Available: ${availableShares}, Requested: ${sharesNum}`);
      }

      const kp = Keypair.fromSecret(secretKey);
      const fee = String(await serverRef.current.fetchBaseFee());

      const builder = new TransactionBuilder(account, {
        fee,
        networkPassphrase: cfg.passphrase
      });

      builder.addOperation(
        Operation.liquidityPoolWithdraw({
          liquidityPoolId: poolId,
          amount: formattedSharesAmount,
          minAmountA: calculatedMinAmountA,
          minAmountB: calculatedMinAmountB
        })
      );

      await submitTx(builder, kp);
    } catch (e: any) {
      console.error('[leaveLiquidityPool] Error:', e);
      if (e.response?.data) {
        console.error('[leaveLiquidityPool] Horizon error details:', e.response.data);
        console.error('[leaveLiquidityPool] Result codes:', e.response.data.extras?.result_codes);
      }
      const errorMessage = e.message || 'Failed to leave liquidity pool';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const swapAssets = async ({
    sourceAssetCode,
    sourceAssetIssuer,
    destAssetCode,
    destAssetIssuer,
    sendAmount,
    destMin
  }: {
    sourceAssetCode: string;
    sourceAssetIssuer: string | null;
    destAssetCode: string;
    destAssetIssuer: string | null;
    sendAmount: string;
    destMin: string;
  }) => {
    if (!secretKey || !publicKey) throw new Error('Wallet not loaded');
    if (!serverRef.current) throw new Error('Server not initialized');

    try {
      setLoading(true);
      setError(null);

      if (isNaN(parseFloat(sendAmount)) || parseFloat(sendAmount) <= 0) {
        throw new Error('Send amount must be a positive number');
      }
      if (isNaN(parseFloat(destMin)) || parseFloat(destMin) <= 0) {
        throw new Error('Minimum destination amount must be a positive number');
      }

      const sourceAsset = sourceAssetCode === 'XLM' 
        ? Asset.native() 
        : new Asset(sourceAssetCode, sourceAssetIssuer!);
      
      const destAsset = destAssetCode === 'XLM' 
        ? Asset.native() 
        : new Asset(destAssetCode, destAssetIssuer!);

      const account = await serverRef.current.loadAccount(publicKey);
      
      const sourceBalance = account.balances.find((b: any) => 
        (sourceAssetCode === 'XLM' && b.asset_type === 'native') ||
        (b.asset_code === sourceAssetCode && b.asset_issuer === sourceAssetIssuer)
      );

      if (!sourceBalance) {
        throw new Error(`You don't have a trustline for ${sourceAssetCode}`);
      }

      const availableBalance = parseFloat(sourceBalance.balance);
      
      let requiredAmount = parseFloat(sendAmount);
      if (sourceAssetCode === 'XLM') {
        const numSubentries = account.subentry_count || 0;
        const minBalance = 2 + numSubentries * 0.5 + 0.5;
        if (availableBalance - requiredAmount < minBalance) {
          throw new Error(`Insufficient XLM. You need to keep at least ${minBalance.toFixed(2)} XLM as minimum balance. Available for swap: ${(availableBalance - minBalance).toFixed(7)}`);
        }
      } else {
        if (availableBalance < requiredAmount) {
          throw new Error(`Insufficient balance. Available: ${availableBalance}, Needed: ${sendAmount}`);
        }
      }

      if (destAssetCode !== 'XLM') {
        const destBalance = account.balances.find((b: any) => 
          b.asset_code === destAssetCode && b.asset_issuer === destAssetIssuer
        );

        if (!destBalance) {
          throw new Error(`You need to add a trustline for ${destAssetCode} before swapping`);
        }
      }

      const fee = String(await serverRef.current.fetchBaseFee());
      
      const kp = Keypair.fromSecret(secretKey);
      
      const builder = new TransactionBuilder(account, {
        fee,
        networkPassphrase: cfg.passphrase
      });

      builder.addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset: sourceAsset,
          sendAmount: sendAmount,
          destination: publicKey,
          destAsset: destAsset,
          destMin: destMin
        })
      );

      await submitTx(builder, kp);

      console.log('Swap successful!');
    } catch (e: any) {
      console.error('[swapAssets] Error:', e);
      
      let errorMessage = e.message || 'Failed to swap assets';
      
      if (e.response?.data?.extras?.result_codes) {
        const codes = e.response.data.extras.result_codes;
        
        if (codes.operations?.includes('op_under_dest_min')) {
          errorMessage = 'Swap failed: Amount received would be less than minimum specified. Try increasing slippage tolerance.';
        } else if (codes.operations?.includes('op_too_few_offers')) {
          errorMessage = 'Swap failed: Not enough liquidity available for this trade pair.';
        } else if (codes.operations?.includes('op_over_source_max')) {
          errorMessage = 'Swap failed: Would require more source asset than specified.';
        }
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
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
    leaveLiquidityPool,
    swapAssets,
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