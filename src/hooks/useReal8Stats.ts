import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';

// Simple cache (shared with useAssetPrices if needed)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 2 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

const pendingRequests = new Map<string, Promise<any>>();

async function fetchWithRetry(url: string, maxRetries = 2): Promise<Response> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
      
      if (res.status === 429) {
        const delay = Math.min(1000 * Math.pow(2, i), 8000);
        console.warn(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      return res;
    } catch (err) {
      if (i === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}

async function fetchLastClosePrice(
  horizonBase: string,
  base: { type: string; code?: string; issuer?: string },
  counter: { type: string; code?: string; issuer?: string }
): Promise<number | null> {
  const cacheKey = `price_${base.code || 'XLM'}_${counter.code || 'XLM'}`;
  
  const cached = getCached<number>(cacheKey);
  if (cached !== null) return cached;
  
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  const promise = (async () => {
    const end = Date.now();
    const start = end - 24 * 60 * 60 * 1000;
    
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
    search.set('resolution', '900000');
    search.set('start_time', String(start));
    search.set('end_time', String(end));
    search.set('limit', '200');
    search.set('order', 'asc');
    
    const url = `${horizonBase}/trade_aggregations?${search.toString()}`;
    
    try {
      const res = await fetchWithRetry(url);
      if (!res.ok) return null;
      
      const json = await res.json();
      const records = json?._embedded?.records || [];
      
      for (let i = records.length - 1; i >= 0; i--) {
        const r = records[i];
        if (Number(r.trade_count || 0) > 0) {
          const close = parseFloat(r.close);
          if (!Number.isNaN(close)) {
            setCache(cacheKey, close);
            return close;
          }
        }
      }
      return null;
    } catch (error) {
      console.warn(`Price fetch failed`, error);
      return null;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();
  
  pendingRequests.set(cacheKey, promise);
  return promise;
}

type Stats = {
  priceXlm: number | null;
  priceUsd: number | null;
  totalSupply: number | null;
  circulating: number | null;
  updatedAt: Date | null;
  loading: boolean;
  updating: boolean;
  error: string | null;
};

const REAL8 = {
  code: 'REAL8',
  issuer: 'GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD',
  totalSupply: 8888888888
};

const USDC_PUBLIC = {
  code: 'USDC',
  issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
};

export function formatPrice(value: number | null, currency?: 'XLM' | 'USD'): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (currency === 'USD') {
    if (value < 0.01) return '$' + value.toFixed(6);
    return '$' + value.toFixed(4);
  }
  if (value < 0.0001) return value.toFixed(8);
  return value.toFixed(6);
}

export function formatNumber(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString();
}

export function useReal8Stats(): Stats {
  const { isTestnet } = useWallet();
  const horizonBase = isTestnet ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org';
  
  const [state, setState] = useState<Stats>({
    priceXlm: null,
    priceUsd: null,
    totalSupply: REAL8.totalSupply,
    circulating: null,
    updatedAt: null,
    loading: true,
    updating: false,
    error: null
  });
  
  const timerRef = useRef<number | null>(null);
  const hasInitialLoad = useRef(false);
  
  const assetUrl = useMemo(() => {
    const u = new URL(`${horizonBase}/assets`);
    u.searchParams.set('asset_code', REAL8.code);
    u.searchParams.set('asset_issuer', REAL8.issuer);
    return u.toString();
  }, [horizonBase]);
  
  const poll = useCallback(async () => {
    if (hasInitialLoad.current) {
      setState(s => ({ ...s, updating: true, error: null }));
    } else {
      setState(s => ({ ...s, loading: true, error: null }));
    }
    
    try {
      let circulating: number | null = null;
      
      try {
        const aRes = await fetchWithRetry(assetUrl);
        if (aRes.ok) {
          const aJson = await aRes.json();
          const record = aJson?._embedded?.records?.[0];
          if (record?.amount) {
            const amount = parseFloat(record.amount);
            if (!Number.isNaN(amount)) circulating = amount;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch circulating supply:', e);
      }
      
      let priceXlm: number | null = null;
      let priceUsd: number | null = null;
      
      if (!isTestnet) {
        const px = await fetchLastClosePrice(
          horizonBase,
          { type: 'credit_alphanum4', code: REAL8.code, issuer: REAL8.issuer },
          { type: 'native' }
        );
        
        const xlmInUsdc = await fetchLastClosePrice(
          horizonBase,
          { type: 'native' },
          { type: 'credit_alphanum4', code: USDC_PUBLIC.code, issuer: USDC_PUBLIC.issuer }
        );
        
        priceXlm = px;
        if (px != null && xlmInUsdc != null) priceUsd = px * xlmInUsdc;
      }
      
      setState({
        priceXlm,
        priceUsd,
        totalSupply: REAL8.totalSupply,
        circulating,
        updatedAt: new Date(),
        loading: false,
        updating: false,
        error: null
      });
      
      hasInitialLoad.current = true;
    } catch (e: any) {
      console.error('Error in useReal8Stats polling:', e);
      setState(s => ({ 
        ...s, 
        loading: false, 
        updating: false, 
        error: e?.message || 'Failed to fetch stats' 
      }));
    }
  }, [assetUrl, isTestnet, horizonBase]);
  
  useEffect(() => {
    void poll();
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(poll, 3 * 60 * 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);
  
  return state;
}