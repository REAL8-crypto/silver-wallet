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
    <Box 
      sx={{ 
        maxWidth: 940, 
        mx: 'auto', 
        px: { xs: 1, sm: 2 } 
      }}
    >
      {/* Cards container with responsive wrapping */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: { xs: 1.5, sm: 2 },
          justifyContent: 'center'
        }}
      >
        {/* PRICE (XLM) Card */}
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            minWidth: { xs: 140, sm: 160 }, 
            flex: { xs: '1 1 140px', sm: '0 1 160px' },
            textAlign: 'center'
          }}
        >
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ fontWeight: 600, letterSpacing: 0.5 }}
          >
            PRICE (XLM)
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ lineHeight: 1.1, fontWeight: 500, mt: 0.5 }}
          >
            {formatPrice(stats.priceXlm, { currency: 'XLM' })}
          </Typography>
        </Paper>

        {/* PRICE (USD) Card */}
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            minWidth: { xs: 140, sm: 160 }, 
            flex: { xs: '1 1 140px', sm: '0 1 160px' },
            textAlign: 'center'
          }}
        >
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ fontWeight: 600, letterSpacing: 0.5 }}
          >
            PRICE (USD)
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ lineHeight: 1.1, fontWeight: 500, mt: 0.5 }}
          >
            {formatPrice(stats.priceUsd, { currency: 'USD' })}
          </Typography>
        </Paper>

        {/* TOTAL SUPPLY Card */}
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            minWidth: { xs: 140, sm: 160 }, 
            flex: { xs: '1 1 140px', sm: '0 1 160px' },
            textAlign: 'center'
          }}
        >
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ fontWeight: 600, letterSpacing: 0.5 }}
          >
            TOTAL SUPPLY
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ lineHeight: 1.1, fontWeight: 500, mt: 0.5 }}
          >
            {formatNumber(stats.totalSupply)}
          </Typography>
        </Paper>

        {/* CIRCULATING Card */}
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            minWidth: { xs: 140, sm: 160 }, 
            flex: { xs: '1 1 140px', sm: '0 1 160px' },
            textAlign: 'center'
          }}
        >
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ fontWeight: 600, letterSpacing: 0.5 }}
          >
            CIRCULATING
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ lineHeight: 1.1, fontWeight: 500, mt: 0.5 }}
          >
            {formatNumber(stats.circulating)}
          </Typography>
        </Paper>
      </Box>

      {/* Error message - full width below cards */}
      {!stats.loading && stats.error && (
        <Typography 
          variant="caption" 
          color="error" 
          sx={{ 
            width: '100%', 
            display: 'block', 
            textAlign: 'center', 
            mt: 1 
          }}
        >
          {stats.error}
        </Typography>
      )}

      {/* Updated time - full width below cards */}
      {stats.updatedAt && (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            width: '100%', 
            display: 'block', 
            textAlign: 'center', 
            mt: stats.error ? 0.5 : 1 
          }}
        >
          Updated {stats.updatedAt.toLocaleTimeString()}
        </Typography>
      )}
    </Box>
  );
};

export default Real8StatsGrid;