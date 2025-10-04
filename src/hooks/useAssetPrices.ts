import { useEffect, useState, useCallback, useRef } from 'react';
import { POOL_ASSETS, CURRENT_PRICES } from '../constants/poolAssets';

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

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
      console.warn(`Price fetch failed for ${base.code || 'XLM'}/${counter.code || 'XLM'}:`, error);
      return null;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();
  
  pendingRequests.set(cacheKey, promise);
  return promise;
}

type ValidAssetCode = keyof typeof POOL_ASSETS;

function isValidAssetCode(code: string): code is ValidAssetCode {
  return code in POOL_ASSETS;
}

export const useAssetPrices = () => {
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitialLoad = useRef(false);
  
  const fetchAssetPrices = useCallback(async () => {
    if (hasInitialLoad.current) {
      setUpdating(true);
    } else {
      setLoading(true);
    }
    
    setError(null);
    
    try {
      const horizonBase = 'https://horizon.stellar.org';
      const newPrices: Record<string, number> = {};
      
      for (const assetCode of Object.keys(POOL_ASSETS)) {
        if (!isValidAssetCode(assetCode)) continue;
        
        try {
          let price: number | null = null;
          
          if (assetCode === 'XLM') {
            price = await fetchLastClosePrice(
              horizonBase,
              { type: 'native' },
              { type: 'credit_alphanum4', code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' }
            );
          } else {
            const asset = POOL_ASSETS[assetCode];
            price = await fetchLastClosePrice(
              horizonBase,
              { type: 'credit_alphanum4', code: asset.code, issuer: asset.issuer },
              { type: 'native' }
            );
          }
          
          newPrices[assetCode] = price !== null ? price : CURRENT_PRICES[assetCode];
          
          await new Promise(r => setTimeout(r, 200));
        } catch (e) {
          console.error(`Failed to fetch price for ${assetCode}:`, e);
          newPrices[assetCode] = CURRENT_PRICES[assetCode];
        }
      }
      
      Object.keys(newPrices).forEach(code => {
        CURRENT_PRICES[code] = newPrices[code];
      });
      
      hasInitialLoad.current = true;
    } catch (e: any) {
      console.error('Failed to fetch asset prices:', e);
      setError(e?.message || 'Failed to fetch asset prices');
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }, []);
  
  useEffect(() => {
    fetchAssetPrices();
    const interval = setInterval(fetchAssetPrices, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAssetPrices]);
  
  return { loading, updating, error };
};