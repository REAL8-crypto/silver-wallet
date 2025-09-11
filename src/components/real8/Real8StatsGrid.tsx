import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useWallet } from '../../contexts/WalletContext';

type Real8Stats = {
  priceXlm: number | null;        // REAL8 priced in XLM
  priceUsd: number | null;        // REAL8 priced in USD (via USDC on Stellar)
  totalSupply: number | null;
  circulating: number | null;
  updatedAt: Date | null;
};

const REAL8 = {
  code: 'REAL8',
  issuer: 'GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD'
};

// Circle USDC on Stellar (public)
const USDC_PUBLIC = {
  code: 'USDC',
  issuer: 'GA5ZSEJYB37JRC2FQI6WK4NDLPXUZL3AKOEDGOPYUFQHE2PDLJ4ALU8A'
};

// If you have a USDC testnet asset, place it here; otherwise we skip USD pricing on testnet.
const USDC_TESTNET: { code: string; issuer: string } | null = null;

function formatPrice(p: number | null, opts?: { currency?: 'XLM' | 'USD' }) {
  if (p == null || Number.isNaN(p)) return '—';
  if (opts?.currency === 'USD') {
    if (p < 0.01) return '$' + p.toFixed(6);
    return '$' + p.toFixed(4);
  }
  // XLM or generic
  return p < 0.0001 ? p.toFixed(8) : p.toFixed(6);
}

function formatNumber(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Paper
    elevation={2}
    sx={{
      p: 2,
      borderRadius: 2,
      flex: '1 1 160px',
      minWidth: 160,
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5
    }}
  >
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ fontWeight: 600, letterSpacing: 0.5 }}
    >
      {label.toUpperCase()}
    </Typography>
    <Typography variant="h6" sx={{ lineHeight: 1.1, fontWeight: 500 }}>
      {value}
    </Typography>
  </Paper>
);

async function fetchLastClosePrice(params: {
  horizonBase: string;
  base: { type: 'native' | 'credit_alphanum4' | 'credit_alphanum12'; code?: string; issuer?: string };
  counter: { type: 'native' | 'credit_alphanum4' | 'credit_alphanum12'; code?: string; issuer?: string };
  // aggregation resolution in ms, e.g. 300000 (5m), 900000 (15m)
  resolution?: number;
  // lookback window in ms (default 24h)
  lookbackMs?: number;
}): Promise<number | null> {
  const {
    horizonBase,
    base,
    counter,
    resolution = 900_000, // 15 minutes
    lookbackMs = 24 * 60 * 60 * 1000
  } = params;

  const end = Date.now();
  const start = end - lookbackMs;

  const search = new URLSearchParams();
  // base
  search.set('base_asset_type', base.type);
  if (base.type !== 'native') {
    search.set('base_asset_code', base.code as string);
    search.set('base_asset_issuer', base.issuer as string);
  }
  // counter
  search.set('counter_asset_type', counter.type);
  if (counter.type !== 'native') {
    search.set('counter_asset_code', counter.code as string);
    search.set('counter_asset_issuer', counter.issuer as string);
  }

  search.set('resolution', String(resolution));
  search.set('start_time', String(start));
  search.set('end_time', String(end));
  search.set('limit', '200');
  search.set('order', 'asc');

  const url = `${horizonBase}/trade_aggregations?${search.toString()}`;
  const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
  if (!res.ok) return null;

  const json = await res.json();
  const records: any[] = json?._embedded?.records || [];
  if (!records.length) return null;

  // Find the last bucket with any trades
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    const tradeCount = Number(r.trade_count || 0);
    const baseVol = parseFloat(r.base_volume || '0');
    const counterVol = parseFloat(r.counter_volume || '0');
    if (tradeCount > 0 && baseVol > 0 && counterVol > 0) {
      // price fields (open/close/avg/high/low) are strings representing counter/base
      const close = parseFloat(r.close);
      if (!Number.isNaN(close)) return close;
    }
  }
  return null;
}

const Real8StatsGrid: React.FC = () => {
  const { networkMode } = useWallet();
  const isTestnet = networkMode !== 'public';
  const horizonBase = isTestnet ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org';

  const [stats, setStats] = useState<Real8Stats>({
    priceXlm: null,
    priceUsd: null,
    totalSupply: null,
    circulating: null,
    updatedAt: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const horizonAssetUrl = `${horizonBase}/assets?asset_code=${encodeURIComponent(
    REAL8.code
  )}&asset_issuer=${encodeURIComponent(REAL8.issuer)}`;

  const poll = async () => {
    setError(null);
    try {
      // 1) Total Supply / Circulating via Horizon assets
      let totalSupply: number | null = null;
      let circulating: number | null = null;

      const aRes = await fetch(horizonAssetUrl, { cache: 'no-store', mode: 'cors' });
      if (aRes.ok) {
        const aJson = await aRes.json();
        const record = aJson?.records?.[0];
        if (record?.amount) {
          const total = parseFloat(record.amount);
          if (!Number.isNaN(total)) {
            totalSupply = total;
            // Circulating is non-trivial on-chain; use total as a conservative fallback
            circulating = total;
          }
        }
      }

      // 2) REAL8/XLM via trade_aggregations
      const priceReal8InXlm = await fetchLastClosePrice({
        horizonBase,
        base: { type: 'credit_alphanum4', code: REAL8.code, issuer: REAL8.issuer },
        counter: { type: 'native' }
      });

      // 3) XLM/USDC (USDC per 1 XLM) via trade_aggregations, then multiply
      let priceXlmInUsd: number | null = null;
      const usdc = isTestnet ? USDC_TESTNET : USDC_PUBLIC;

      if (usdc) {
        const xlmInUsdc = await fetchLastClosePrice({
          horizonBase,
          base: { type: 'native' }, // 1 XLM
          counter: { type: 'credit_alphanum4', code: usdc.code, issuer: usdc.issuer } // priced in USDC
        });
        priceXlmInUsd = xlmInUsdc;
      }

      const priceUsd =
        priceReal8InXlm != null && priceXlmInUsd != null
          ? priceReal8InXlm * priceXlmInUsd
          : null;

      setStats({
        priceXlm: priceReal8InXlm ?? null,
        priceUsd,
        totalSupply,
        circulating,
        updatedAt: new Date()
      });
    } catch (e: any) {
      console.error('[Real8StatsGrid] poll error:', e);
      setError(e?.message || 'Failed to load data from Horizon');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void poll();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(poll, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkMode]);

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <StatCard label="Price (XLM)" value={formatPrice(stats.priceXlm, { currency: 'XLM' })} />
      <StatCard label="Price (USD)" value={formatPrice(stats.priceUsd, { currency: 'USD' })} />
      <StatCard label="Total Supply" value={formatNumber(stats.totalSupply)} />
      <StatCard label="Circulating" value={formatNumber(stats.circulating)} />
      {!loading && error && (
        <Typography variant="caption" color="error" sx={{ width: '100%' }}>
          {error}
        </Typography>
      )}
      {stats.updatedAt && (
        <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>
          Updated {stats.updatedAt.toLocaleTimeString()}
        </Typography>
      )}
    </Box>
  );
};

export default Real8StatsGrid;
