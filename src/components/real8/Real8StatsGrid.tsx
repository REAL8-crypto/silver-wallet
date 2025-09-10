import React, { useEffect, useRef, useState } from 'react';
import { Paper, Typography, Box, Alert, CircularProgress } from '@mui/material';

interface Real8Stats {
  priceUsd: number | null;
  totalSupply: number | null;
  circulating: number | null;
  updatedAt: Date | null;
}

const horizonUrl =
  'https://horizon.stellar.org/assets?asset_code=REAL8&asset_issuer=GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD';

const expertUrl =
  'https://api.stellar.expert/explorer/public/asset/REAL8-GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD';

function formatPrice(p: number | null): string {
  if (p == null || Number.isNaN(p)) return '—';
  if (p < 0.01) return '$' + p.toFixed(6);
  return '$' + p.toFixed(4);
}

function formatNumber(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

const StatCard: React.FC<{ label: string; value: string; }> = ({ label, value }) => (
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
  const firstLoadRef = useRef(true);

  async function fetchStats() {
    let next: Real8Stats = {
      priceUsd: stats.priceUsd,
      totalSupply: stats.totalSupply,
      circulating: stats.circulating,
      updatedAt: stats.updatedAt
    };

    try {
      // Horizon supply
      const hRes = await fetch(horizonUrl, { cache: 'no-store' });
      if (hRes.ok) {
        const hJson = await hRes.json();
        const record = hJson?.records?.[0];
        if (record?.amount) {
          const total = parseFloat(record.amount);
            if (!Number.isNaN(total)) {
            next.totalSupply = total;
            if (next.circulating == null) next.circulating = total; // fallback
          }
        }
      }

      // Stellar.expert price and (possibly better) supply
      const eRes = await fetch(expertUrl, { cache: 'no-store' });
      if (eRes.ok) {
        const eJson = await eRes.json();
        const priceObj = eJson?.price;
        const directPrice = typeof priceObj === 'number' ? priceObj : null;
        const nestedUsd = priceObj?.usd;
        const candidate =
          typeof nestedUsd === 'number'
            ? nestedUsd
            : directPrice;
        if (typeof candidate === 'number' && !Number.isNaN(candidate)) {
          next.priceUsd = candidate;
        }
        const supplyObj = eJson?.supply;
        if (supplyObj) {
          const total = parseFloat(supplyObj.total);
          if (!Number.isNaN(total)) next.totalSupply = total;
          const circ = parseFloat(supplyObj.circulating);
          if (!Number.isNaN(circ)) next.circulating = circ;
        }
      }

      next.updatedAt = new Date();
      setStats(next);
      setError(null);
    } catch (e: any) {
      if (firstLoadRef.current) {
        setError('REAL8 stats unavailable (network). Retrying...');
      }
      // keep old stats
    } finally {
      firstLoadRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
    intervalRef.current = window.setInterval(fetchStats, 60_000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ mb: 3 }}>
      {error && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <StatCard label="Price (USD)" value={formatPrice(stats.priceUsd)} />
        <StatCard label="Total Supply" value={formatNumber(stats.totalSupply)} />
        <StatCard label="Circulating" value={formatNumber(stats.circulating)} />
        <StatCard
          label="Updated"
          value={
            stats.updatedAt
              ? stats.updatedAt.toLocaleTimeString()
              : loading
                ? '...'
                : '—'
          }
        />
        {loading && (
          <Paper
            elevation={2}
            sx={{
              p: 2,
              borderRadius: 2,
              minWidth: 140,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CircularProgress size={28} />
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default Real8StatsGrid;
