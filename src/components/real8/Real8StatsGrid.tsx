import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';

type Real8Stats = {
  priceUsd: number | null;        // remains for UI continuity; now “—” (no external CORS calls)
  totalSupply: number | null;
  circulating: number | null;
  updatedAt: Date | null;
};

// Horizon endpoint for REAL8 asset supply
const horizonUrl =
  'https://horizon.stellar.org/assets?asset_code=REAL8&asset_issuer=GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD';

function formatPrice(p: number | null): string {
  if (p == null || Number.isNaN(p)) return '—';
  if (p < 0.01) return '$' + p.toFixed(6);
  return '$' + p.toFixed(4);
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
      flex: '1 1 140px',
      minWidth: 140,
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

const Real8StatsGrid: React.FC = () => {
  const [stats, setStats] = useState<Real8Stats>({
    priceUsd: null,
    totalSupply: null,
    circulating: null,
    updatedAt: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const fetchStats = async () => {
    try {
      // Use Horizon to get supply; avoid any stellar.expert calls (CORS)
      const hRes = await fetch(horizonUrl, { cache: 'no-store', mode: 'cors' });
      let totalSupply: number | null = stats.totalSupply;
      let circulating: number | null = stats.circulating;

      if (hRes.ok) {
        const hJson = await hRes.json();
        const record = hJson?.records?.[0];
        if (record?.amount) {
          const total = parseFloat(record.amount);
          if (!Number.isNaN(total)) {
            totalSupply = total;
            // Without a reliable “circulating” computation on-chain, default to total
            if (circulating == null) circulating = total;
          }
        }
      } else {
        // Horizon error (keep previous values)
        console.warn('[Real8StatsGrid] Horizon assets fetch failed:', hRes.status, hRes.statusText);
      }

      setStats({
        priceUsd: null, // intentionally null to avoid CORS; can compute from Horizon trades if desired
        totalSupply,
        circulating,
        updatedAt: new Date()
      });
      setError(null);
    } catch (e: any) {
      console.error('[Real8StatsGrid] fetchStats error:', e);
      setError(e?.message || 'Failed to load REAL8 stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
    // Refresh periodically
    intervalRef.current = window.setInterval(fetchStats, 60_000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <StatCard label="Price (USD)" value={formatPrice(stats.priceUsd)} />
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
