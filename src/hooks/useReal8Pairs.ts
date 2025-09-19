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
  { code: 'SLVR', issuer: 'GBZVELEQD3WBN3R3VAG64HVBDOZ76ZL6QPLSFGKWPFED33Q3234NSLVR' }, // mintx.co
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
      
      // Add delay between requests to avoid rate limiting
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Fetch REAL8 prices against each asset with delays
      for (let i = 0; i < PAIRS.length; i++) {
        const pair = PAIRS[i];
        let price: number | null = null;
        
        try {
          if (pair.code === 'XLM') {
            // REAL8/XLM - REAL8 as base, XLM as counter
            price = await fetchLastClosePrice(
              horizonBase,
              { type: 'credit_alphanum4', code: REAL8.code, issuer: REAL8.issuer },
              { type: 'native' }
            );
          } else if (pair.issuer) {
            // All pairs now have real issuer addresses - fetch REAL8/ASSET prices
            price = await fetchLastClosePrice(
              horizonBase,
              { type: 'credit_alphanum4', code: REAL8.code, issuer: REAL8.issuer },
              { type: 'credit_alphanum4', code: pair.code, issuer: pair.issuer }
            );
          }
          
          newPrices[pair.code] = price;
          
          // Add delay between requests (except for the last one)
          if (i < PAIRS.length - 1) {
            await delay(500); // 500ms delay between requests
          }
        } catch (error: any) {
          console.warn(`Failed to fetch REAL8/${pair.code} price:`, error);
          newPrices[pair.code] = null;
          
          // Still add delay even on error to avoid overwhelming the API
          if (i < PAIRS.length - 1) {
            await delay(500);
          }
        }
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
    // Increase interval to 5 minutes to reduce API load
    const interval = setInterval(fetchPrices, 5 * 60 * 1000); // Update every 5 minutes
    
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return { prices, lastUpdated, error, loading };
};
