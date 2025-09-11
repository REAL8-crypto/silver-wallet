import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useReal8Stats } from '../../hooks/useReal8Stats';

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

const Real8StatsGrid: React.FC = () => {
  const stats = useReal8Stats();

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 1.75 }}>
      {/* Stats cards in a responsive grid */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, 
        gap: 2, 
        mb: 1.5 
      }}>
        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
            PRICE (XLM)
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.1, fontWeight: 500 }}>
            {stats.loading ? '...' : formatPrice(stats.priceXlm)}
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
            PRICE (USD)
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.1, fontWeight: 500 }}>
            {stats.loading ? '...' : formatPrice(stats.priceUsd, { currency: 'USD' })}
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
            TOTAL SUPPLY
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.1, fontWeight: 500 }}>
            {stats.loading ? '...' : formatNumber(stats.totalSupply)}
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
            CIRCULATING
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.1, fontWeight: 500 }}>
            {stats.loading ? '...' : formatNumber(stats.circulating)}
          </Typography>
        </Paper>
      </Box>

      {/* Updated time and error beneath cards */}
      {stats.error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', textAlign: 'center', mb: 0.5 }}>
          {stats.error}
        </Typography>
      )}
      {stats.updatedAt && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
          Updated {stats.updatedAt.toLocaleTimeString()}
        </Typography>
      )}
    </Box>
  );
};

export default Real8StatsGrid;