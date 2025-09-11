import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';

type Stats = {
  priceXlm: number | null;
  priceUsd: number | null;
  totalSupply: number | null;
  circulating: number | null;
  updatedAt: Date | null;
  loading: boolean;
  error: string | null;
};

const REAL8 = {
  code: 'REAL8',
  issuer: 'GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD'
};
const USDC_PUBLIC = {
  code: 'USDC',
  issuer: 'GA5ZSEJYB37JRC2FQI6WK4NDLPXUZL3AKOEDGOPYUFQHE2PDLJ4ALU8A'
};

async function fetchLastClosePrice(horizonBase: string, base: { type: 'native' | 'credit_alphanum4' | 'credit_alphanum12'; code?: string; issuer?: string }, counter: { type: 'native' | 'credit_alphanum4' | 'credit_alphanum12'; code?: string; issuer?: string }): Promise<number | null> {
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
  const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
  if (!res.ok) return null;
  const json = await res.json();
  const records: any[] = json?._embedded?.records || [];
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
}

// Formatting helpers
export function formatPrice(value: number | null, currency?: 'XLM' | 'USD'): string {
  if (value == null || Number.isNaN(value)) return '—';
  
  if (currency === 'USD') {
    if (value < 0.01) return '$' + value.toFixed(6);
    return '$' + value.toFixed(4);
  }
  
  // XLM or generic numbers
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
    totalSupply: null,
    circulating: null,
    updatedAt: null,
    loading: true,
    error: null
  });
  const timerRef = useRef<number | null>(null);

  const assetUrl = useMemo(() => {
    const u = new URL(`${horizonBase}/assets`);
    u.searchParams.set('asset_code', REAL8.code);
    u.searchParams.set('asset_issuer', REAL8.issuer);
    return u.toString();
  }, [horizonBase]);

  const poll = useCallback(async () => {
    try {
      // Supply via /assets (works on both networks)
      let totalSupply: number | null = null;
      let circulating: number | null = null;
      const aRes = await fetch(assetUrl, { cache: 'no-store', mode: 'cors' });
      if (aRes.ok) {
        const aJson = await aRes.json();
        const record = aJson?.records?.[0];
        if (record?.amount) {
          const total = parseFloat(record.amount);
          if (!Number.isNaN(total)) {
            totalSupply = total;
            circulating = total; // conservative fallback
          }
        }
      }

      // Prices only on Mainnet
      let priceXlm: number | null = null;
      let priceUsd: number | null = null;
      if (!isTestnet) {
        const px = await fetchLastClosePrice(horizonBase, { type: 'credit_alphanum4', code: REAL8.code, issuer: REAL8.issuer }, { type: 'native' });
        const xlmInUsdc = await fetchLastClosePrice(horizonBase, { type: 'native' }, { type: 'credit_alphanum4', code: USDC_PUBLIC.code, issuer: USDC_PUBLIC.issuer });
        priceXlm = px;
        if (px != null && xlmInUsdc != null) priceUsd = px * xlmInUsdc;
      }

      setState({
        priceXlm,
        priceUsd,
        totalSupply,
        circulating,
        updatedAt: new Date(),
        loading: false,
        error: null
      });
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e?.message || 'Failed to fetch stats' }));
    }
  }, [assetUrl, isTestnet, horizonBase]);

  useEffect(() => {
    setState(s => ({ ...s, loading: true, error: null }));
    void poll();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(poll, 60_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]); // now includes poll as dependency

  return state;
}
