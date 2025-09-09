import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import StellarSdk from '@stellar/stellar-sdk';

const { Asset } = StellarSdk;

const JoinLiquidityPool: React.FC = () => {
  const { balances, joinLiquidityPool, loading, error } = useWallet();
  const [assetA, setAssetA] = useState<string>('XLM');
  const [assetB, setAssetB] = useState<string>('');
  const [amountA, setAmountA] = useState<string>('');
  const [amountB, setAmountB] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const xlmBalance = balances.find((b) => b.asset_type === 'native');
    if (!xlmBalance || parseFloat(xlmBalance.balance) < 2) {
      alert('You need at least 2 XLM to join a liquidity pool.');
      return;
    }
    if (!assetA || !assetB) {
      alert('Please select two different assets.');
      return;
    }

    // Convert to Asset objects
    const getAsset = (code: string) => {
      if (code === 'XLM') return Asset.native();
      const found = balances.find((b) => b.asset_code === code);
      if (!found || !found.asset_issuer) throw new Error('Asset not found');
      return new Asset(found.asset_code!, found.asset_issuer!);
    };

    try {
      await joinLiquidityPool(getAsset(assetA), getAsset(assetB), amountA, amountB);
      setAmountA('');
      setAmountB('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="join-pool-container" style={{ maxWidth: '400px', margin: '20px auto' }}>
      <h2>Join Liquidity Pool</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Asset A:</label>
          <select value={assetA} onChange={(e) => setAssetA(e.target.value)}>
            <option value="XLM">XLM</option>
            {balances
              .filter((b) => b.asset_code)
              .map((b, i) => (
                <option key={i} value={b.asset_code}>
                  {b.asset_code}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label>Asset B:</label>
          <select value={assetB} onChange={(e) => setAssetB(e.target.value)}>
            <option value="">Select</option>
            {balances
              .filter((b) => b.asset_code && b.asset_code !== assetA)
              .map((b, i) => (
                <option key={i} value={b.asset_code}>
                  {b.asset_code}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label>Amount A:</label>
          <input
            type="number"
            value={amountA}
            onChange={(e) => setAmountA(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Amount B:</label>
          <input
            type="number"
            value={amountB}
            onChange={(e) => setAmountB(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Join Pool'}
        </button>
      </form>
    </div>
  );
};

export default JoinLiquidityPool;
