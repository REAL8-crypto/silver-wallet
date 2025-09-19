import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';

// REAL8 asset definition
const REAL8 = {
  code: 'REAL8',
  issuer: 'GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD'
};

// Curated asset list for grid with official issuer addresses
export const PAIRS = [
  { code: 'XLM', issuer: null },
  { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' }, // circle.com
  { code: 'EURC', issuer: 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2' }, // circle.com
  { code: 'SLVR', issuer: 'GBZVELEQUD3WBN3R3VAG64HVBDOZ76ZL6QPLSFGKWPFED33Q3234NSLVR' }, // mintx.co
  { code: 'GOLD', issuer: 'GBC5ZGK6MQU3XG5Y72SXPA7P5R5NHYT2475SNEJB2U3EQ6J56QLVGOLD' }, // mintx.co
];

type PriceResult = {
  [code: string]: number | null;
};

// Fetch last close price from Horizon (same function as in useReal8Stats)
async function fetchLastClosePrice(
  horizonBase: string, 
  base: { type: 'native' | 'credit_alphanum4' | 'credit_alphanum12'; code?: string; issuer?: string }, 
  counter: { type: 'native' | 'credit_alphanum4' | 'credit_alphanum12'; code?: string; issuer?: string }
): Promise<number | null> {
  const end = Date.now();
  const start = end - 24 * 60 * 60 * 1000; // 24h
  const search = new URLSearchParams();
  
  search.set('base_asset_type', base.type);
  if (base.type !== 'native') {
    search.set('base_asset_code', base.code as string);
    search.set('base_asset_issuer', base.issuer as string);
  }
  
  search.set('counter_asset_type', counter.type);
  if (counter.type !== 'native') {
    search.set('counter_asset_code', counter.code as string);
    search.set('counter_asset_issuer', counter.issuer as string);
  }
  
  search.set('resolution', String(900_000)); // 15m
  search.set('start_time', String(start));
  search.set('end_time', String(end));
  search.set('limit', '200');
  search.set('order', 'asc');
  const url = `${horizonBase}/trade_aggregations?${search.toString()}`;
  
  try {
    const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
    if (!res.ok) return null;
    
    const json = await res.json();
    const records: any[] = json?._embedded?.records || [];
    
    // Find the most recent record with actual trades
    for (let i = records.length - 1; i >= 0; i--) {
      const r = records[i];
      const tc = Number(r.trade_count || 0);
      const bv = parseFloat(r.base_volume || '0');
      const cv = parseFloat(r.counter_volume || '0');
      
      if (tc > 0 && bv > 0 && cv > 0) {
        const close = parseFloat(r.close);
        if (!Number.isNaN(close)) return close;
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to fetch price for ${base.code || 'XLM'}/${counter.code || 'XLM'}:`, error);
    return null;
  }
}

export const useReal8Pairs = () => {
  const { isTestnet } = useWallet();
  // Always use mainnet for market prices since they're public data
  const horizonBase = 'https://horizon.stellar.org';
  
  const [prices, setPrices] = useState<PriceResult>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const newPrices: PriceResult = {};
      
      // First, fetch REAL8/XLM price as our base rate
      let real8XlmPrice: number | null = null;
      try {
        real8XlmPrice = await fetchLastClosePrice(
          horizonBase,
          { type: 'credit_alphanum4', code: REAL8.code, issuer: REAL8.issuer },
          { type: 'native' }
        );
        newPrices['XLM'] = real8XlmPrice;
      } catch (error) {
        console.warn('Failed to fetch REAL8/XLM price:', error);
      }
      
      // Fetch direct pairs for USDC and EURC
      for (const pair of PAIRS.filter(p => ['USDC', 'EURC'].includes(p.code))) {
        try {
          if (pair.issuer) {
            const price = await fetchLastClosePrice(
              horizonBase,
              { type: 'credit_alphanum4', code: REAL8.code, issuer: REAL8.issuer },
              { type: 'credit_alphanum4', code: pair.code, issuer: pair.issuer }
            );
            newPrices[pair.code] = price;
          } else {
            newPrices[pair.code] = null;
          }
        } catch (error) {
          console.warn(`Failed to fetch REAL8/${pair.code} price:`, error);
          newPrices[pair.code] = null;
        }
      }
      
      // For SLVR and GOLD, fetch their XLM prices and calculate indirect rates
      if (real8XlmPrice) {
        for (const pair of PAIRS.filter(p => ['SLVR', 'GOLD'].includes(p.code))) {
          try {
            // Only proceed if issuer is not null
            if (pair.issuer) {
              // Fetch ASSET/XLM price (e.g., SLVR/XLM)
              const assetXlmPrice = await fetchLastClosePrice(
                horizonBase,
                { type: 'credit_alphanum4', code: pair.code, issuer: pair.issuer },
                { type: 'native' }
              );
              
              if (assetXlmPrice && assetXlmPrice > 0) {
                // Calculate REAL8/ASSET = (REAL8/XLM) / (ASSET/XLM)
                const real8AssetPrice = real8XlmPrice / assetXlmPrice;
                newPrices[pair.code] = real8AssetPrice;
                console.log(`Calculated REAL8/${pair.code} price: ${real8AssetPrice} (REAL8/XLM: ${real8XlmPrice}, ${pair.code}/XLM: ${assetXlmPrice})`);
              } else {
                console.warn(`No ${pair.code}/XLM price available for indirect calculation`);
                newPrices[pair.code] = null;
              }
            } else {
              console.warn(`No issuer found for ${pair.code}`);
              newPrices[pair.code] = null;
            }
          } catch (error) {
            console.warn(`Failed to fetch ${pair.code}/XLM price for indirect calculation:`, error);
            newPrices[pair.code] = null;
          }
        }
      } else {
        // If we don't have REAL8/XLM price, we can't calculate indirect rates
        newPrices['SLVR'] = null;
        newPrices['GOLD'] = null;
      }
      
      setPrices(newPrices);
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (e: any) {
      console.error('Failed to fetch REAL8 pair prices:', e);
      setError(e?.message || 'Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  }, [horizonBase]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return { prices, lastUpdated, error, loading };
};
