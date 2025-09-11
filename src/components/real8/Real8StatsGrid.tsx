import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
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

async function fetchLastClosePrice(params: {
  horizonBase: string;
  base: { type: 'native' | 'credit_alphanum4' | 'credit_alphanum12'; code?: string; issuer?: string };
  counter: { type: 'native' | 'credit_alphanum4' | 'credit_alphanum12'; code?: string; issuer?: string };
  resolution?: number;    // ms (default 15m)
  lookbackMs?: number;    // ms (default 24h)
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

  // last non-empty bucket
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    const tradeCount = Number(r.trade_count || 0);
    const baseVol = parseFloat(r.base_volume || '0');
    const counterVol = parseFloat(r.counter_volume || '0');
    if (tradeCount > 0 && baseVol > 0 && counterVol > 0) {
      const close = parseFloat(r.close);
      if (!Number.isNaN(close)) return close;
    }
  }
  return null;
}

const Real8StatsGrid: React.FC = () => {
  const { networkMode } = useWallet();
  const isPublic = networkMode === 'public';
  const horizonBase = isPublic ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org';

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
      // Supply via /assets
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
            // Circulating: use total as conservative fallback
            circulating = total;
          }
        }
      }

      // Prices only on public network to avoid testnet 404
      let priceReal8InXlm: number | null = null;
      let priceXlmInUsd: number | null = null;
      if (isPublic) {
        priceReal8InXlm = await fetchLastClosePrice({
          horizonBase,
          base: { type: 'credit_alphanum4', code: REAL8.code, issuer: REAL8.issuer },
          counter: { type: 'native' }
        });

        // XLM priced in USDC (1 XLM -> ? USDC)
        const xlmInUsdc = await fetchLastClosePrice({
          horizonBase,
            base: { type: 'native' },
          counter: { type: 'credit_alphanum4', code: USDC_PUBLIC.code, issuer: USDC_PUBLIC.issuer }
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

  const statsItems = [
    { label: 'PRICE (XLM)', value: formatPrice(stats.priceXlm, { currency: 'XLM' }) },
    { label: 'PRICE (USD)', value: formatPrice(stats.priceUsd, { currency: 'USD' }) },
    { label: 'TOTAL SUPPLY', value: formatNumber(stats.totalSupply) },
    { label: 'CIRCULATING', value: formatNumber(stats.circulating) }
  ];

  return (
    <Box sx={{ mt: 1.75 }}>
      <Box
        sx={{
          maxWidth: { xs: '100%', md: 760, lg: 880 }, // match width pattern of box above
          mx: 'auto',
          px: { xs: 0.5, sm: 1 }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: { xs: 1.25, sm: 1.75 },
            justifyContent: 'center',
            alignItems: 'stretch',
            textAlign: 'center'
          }}
        >
          {statsItems.map(item => (
            <Paper
              key={item.label}
              variant="outlined"
              elevation={0}
              sx={{
                flex: '1 1 180px',
                minWidth: 180,
                maxWidth: 220,
                p: { xs: 1.25, sm: 1.5 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, letterSpacing: 0.6, opacity: 0.75 }}
              >
                {item.label}
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontWeight: 500, lineHeight: 1.15, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}
              >
                {loading ? '—' : item.value}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Box sx={{ mt: 1, textAlign: 'center' }}>
          {stats.updatedAt && !loading && (
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.7 }}>
              Updated {stats.updatedAt.toLocaleTimeString()}
            </Typography>
          )}
          {error && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
              {error}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Real8StatsGrid;