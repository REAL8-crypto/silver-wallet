import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useReal8Pairs } from '../hooks/useReal8Pairs';

type MarketCardDefinition = {
  key: string;
  label: string;
  value: string;
};

// Format price value for display
function formatPairPrice(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  
  // Format with appropriate precision based on magnitude
  if (value < 0.0001) return value.toFixed(8);
  if (value < 0.01) return value.toFixed(6);
  return value.toFixed(4);
}

const MarketPricesGrid: React.FC = () => {
  const pairs = useReal8Pairs();

  // Define the five market cards
  const marketDefinitions: MarketCardDefinition[] = [
    {
      key: 'xlm',
      label: 'PRICE (XLM)',
      value: formatPairPrice(pairs.xlm)
    },
    {
      key: 'usdc',
      label: 'PRICE (USDC)',
      value: formatPairPrice(pairs.usdc)
    },
    {
      key: 'eurc',
      label: 'PRICE (EURC)',
      value: formatPairPrice(pairs.eurc)
    },
    {
      key: 'slvr',
      label: 'PRICE (SLVR)',
      value: formatPairPrice(pairs.slvr)
    },
    {
      key: 'gold',
      label: 'PRICE (GOLD)',
      value: formatPairPrice(pairs.gold)
    }
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Outer Box spanning full width with centered container */}
      <Box
        sx={{
          mx: 'auto',
          maxWidth: 940,
          px: { xs: 1, sm: 2 }
        }}
      >
        {/* Cards container with responsive flex layout */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: { xs: 1.25, sm: 1.75 },
            justifyContent: 'center',
            mb: 1
          }}
        >
          {marketDefinitions.map((market) => (
            <Paper
              key={market.key}
              variant="outlined"
              elevation={0}
              sx={{
                flex: '1 1 150px',
                minWidth: 150,
                p: { xs: 1.25, sm: 1.5 },
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: 0.6
                }}
              >
                {market.label}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  lineHeight: 1.15,
                  fontWeight: 500,
                  wordWrap: 'break-word'
                }}
              >
                {market.value}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* Error and updated time as full-width centered lines below cards */}
        {!pairs.loading && pairs.error && (
          <Typography
            variant="caption"
            color="error"
            sx={{
              width: '100%',
              textAlign: 'center',
              display: 'block'
            }}
          >
            {pairs.error}
          </Typography>
        )}
        {pairs.updatedAt && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              width: '100%',
              textAlign: 'center',
              display: 'block',
              mt: pairs.error ? 0.5 : 0
            }}
          >
            Updated {pairs.updatedAt.toLocaleTimeString()}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default MarketPricesGrid;