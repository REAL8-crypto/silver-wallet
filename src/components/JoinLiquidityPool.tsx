import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
const JoinLiquidityPool: React.FC = () => {
  const { balances, joinLiquidityPool, loading } = useWallet();
  const [assetA, setAssetA] = useState<string>('XLM');
  const [assetB, setAssetB] = useState<string>('');
  const [amountA, setAmountA] = useState<string>('');
  const [amountB, setAmountB] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getAsset = (code: string) => {
    if (code === 'XLM') return { code: 'XLM', isNative: true };
    const line = balances.find(b => b.asset_code === code);
    if (!line) return null;
    return { code, issuer: line.asset_issuer };
  };

  const handleJoin = async () => {
    setLocalError(null);
    const a = getAsset(assetA);
    const b = getAsset(assetB);
    if (!a || !b) {
      setLocalError('Invalid asset selection');
      return;
    }
    setSubmitting(true);
    try {
      // Use correct API interface
      await joinLiquidityPool({
        assetACode: a.code,
        assetAIssuer: a.code === 'XLM' ? '' : a.issuer,
        assetBCode: b.code,
        assetBIssuer: b.code === 'XLM' ? '' : b.issuer,
        maxAmountA: amountA,
        maxAmountB: amountB
      });
      setAmountA('');
      setAmountB('');
    } catch (err: any) {
      setLocalError(err?.message || 'Join failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Your existing UI for selecting assets and amounts */}
      {localError && <div style={{ color: 'red' }}>{localError}</div>}
      <button disabled={loading || submitting} onClick={handleJoin}>
        {submitting ? 'Joining...' : 'Join Pool'}
      </button>
    </div>
  );
};

export default JoinLiquidityPool;