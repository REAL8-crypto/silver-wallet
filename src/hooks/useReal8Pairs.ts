import { useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '../contexts/WalletContext';

type PairPrices = {
  xlm: number | null;
  usdc: number | null;
  eurc: number | null;
  slvr: number | null;
  gold: number | null;
  updatedAt: Date | null;
  loading: boolean;
  error: string | null;
};

// Asset definitions based on the problem statement
const REAL8 = {
  code: 'REAL8',
  issuer: 'GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD'
};

// Updated issuers from the problem statement
const ASSETS = {
  USDC: { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' }, // circle.com
  EURC: { code: 'EURC', issuer: 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2' }, // circle.com
  SLVR: { code: 'SLVR', issuer: 'GBZVELEQD3WBN3R3VAG64HVBDOZ76ZL6QPLSFGKWPFED33Q3234NSLVR' }, // mintx.co
  GOLD: { code: 'GOLD', issuer: 'GBC5ZGK6MQU3XG5Y72SXPA7P5R5NHYT2475SNEJB2U3EQ6J56QLVGOLD' }  // mintx.co
};

// Fetch last close price from trade aggregations using 15-minute alignment
async function fetchLastClosePrice(
  horizonBase: string,
  base: { type: 'native' | 'credit_alphanum4'; code?: string; issuer?: string },
  counter: { type: 'native' | 'credit_alphanum4'; code?: string; issuer?: string }
): Promise<number | null> {
  try {
    // Align to 15-minute grid
    const resolution = 900_000; // 15 minutes in milliseconds
    const now = Date.now();
    const end = Math.floor(now / resolution) * resolution;
    const start = end - (24 * 60 * 60 * 1000); // 24 hours ago
    
    const search = new URLSearchParams();
    search.set('base_asset_type', base.type);
    if (base.type !== 'native') {
      search.set('base_asset_code', base.code!);
      search.set('base_asset_issuer', base.issuer!);
    }
    search.set('counter_asset_type', counter.type);
    if (counter.type !== 'native') {
      search.set('counter_asset_code', counter.code!);
      search.set('counter_asset_issuer', counter.issuer!);
    }
    search.set('resolution', String(resolution));
    search.set('start_time', String(start));
    search.set('end_time', String(end));
    search.set('limit', '200');
    search.set('order', 'asc');

    const url = `${horizonBase}/trade_aggregations?${search.toString()}`;
    const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
    if (!res.ok) return null;
    
    const json = await res.json();
    const records: any[] = json?._embedded?.records || [];
    
    // Find the last record with valid trade data
    for (let i = records.length - 1; i >= 0; i--) {
      const r = records[i];
      const tradeCount = Number(r.trade_count || 0);
      const baseVolume = parseFloat(r.base_volume || '0');
      const counterVolume = parseFloat(r.counter_volume || '0');
      
      if (tradeCount > 0 && baseVolume > 0 && counterVolume > 0) {
        const close = parseFloat(r.close);
        if (!Number.isNaN(close)) return close;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching price:', error);
    return null;
  }
}

export function useReal8Pairs(): PairPrices {
  const { isTestnet } = useWallet();
  const horizonBase = isTestnet ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org';
  
  const [state, setState] = useState<PairPrices>({
    xlm: null,
    usdc: null,
    eurc: null,
    slvr: null,
    gold: null,
    updatedAt: null,
    loading: true,
    error: null
  });
  
  const timerRef = useRef<number | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      setState(s => ({ ...s, loading: true, error: null }));
      
      // Fetch REAL8 prices against each counter asset
      const [xlmPrice, usdcPrice, eurcPrice, slvrPrice, goldPrice] = await Promise.all([
        // REAL8/XLM (REAL8 as base, XLM as counter)
        fetchLastClosePrice(
          horizonBase,
          { type: 'credit_alphanum4', code: REAL8.code, issuer: REAL8.issuer },
          { type: 'native' }
        ),
        // REAL8/USDC (REAL8 as base, USDC as counter)
        fetchLastClosePrice(
          horizonBase,
          { type: 'credit_alphanum4', code: REAL8.code, issuer: REAL8.issuer },
          { type: 'credit_alphanum4', code: ASSETS.USDC.code, issuer: ASSETS.USDC.issuer }
        ),
        // REAL8/EURC (REAL8 as base, EURC as counter)
        fetchLastClosePrice(
          horizonBase,
          { type: 'credit_alphanum4', code: REAL8.code, issuer: REAL8.issuer },
          { type: 'credit_alphanum4', code: ASSETS.EURC.code, issuer: ASSETS.EURC.issuer }
        ),
        // REAL8/SLVR (REAL8 as base, SLVR as counter)
        fetchLastClosePrice(
          horizonBase,
          { type: 'credit_alphanum4', code: REAL8.code, issuer: REAL8.issuer },
          { type: 'credit_alphanum4', code: ASSETS.SLVR.code, issuer: ASSETS.SLVR.issuer }
        ),
        // REAL8/GOLD (REAL8 as base, GOLD as counter)
        fetchLastClosePrice(
          horizonBase,
          { type: 'credit_alphanum4', code: REAL8.code, issuer: REAL8.issuer },
          { type: 'credit_alphanum4', code: ASSETS.GOLD.code, issuer: ASSETS.GOLD.issuer }
        )
      ]);

      setState({
        xlm: xlmPrice,
        usdc: usdcPrice,
        eurc: eurcPrice,
        slvr: slvrPrice,
        gold: goldPrice,
        updatedAt: new Date(),
        loading: false,
        error: null
      });
    } catch (error: any) {
      setState(s => ({
        ...s,
        loading: false,
        error: error?.message || 'Failed to fetch market prices'
      }));
    }
  }, [horizonBase]);

  useEffect(() => {
    void fetchPrices();
    
    // Poll every 60 seconds
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(fetchPrices, 60_000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchPrices]);

  return state;
}