import React from 'react';
import { useReal8Pairs } from '../hooks/useReal8Pairs';

const assets = [
  { code: 'XLM', label: 'Stellar Lumens' },
  { code: 'USDC', label: 'US Dollar Coin' },
  { code: 'EURC', label: 'Euro Coin' },
  { code: 'SLVR', label: 'Silver' },
  { code: 'GOLD', label: 'Gold' },
];

const MarketPricesGrid: React.FC = () => {
  const { prices, lastUpdated, error } = useReal8Pairs();

  return (
    <div className="market-prices-grid">
      <h3>REAL8 Market Prices</h3>
      <div className="grid">
        {assets.map(asset => (
          <div key={asset.code} className="market-price-card">
            <div>{asset.label}</div>
            <div>{prices[asset.code] ?? '—'}</div>
          </div>
        ))}
      </div>
      <div className="meta">
        <span>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : '—'}</span>
        {error && <span className="error">{error}</span>}
      </div>
    </div>
  );
};

export default MarketPricesGrid;
