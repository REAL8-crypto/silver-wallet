import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useReal8Stats, formatPrice, formatNumber } from '../../hooks/useReal8Stats';

type StatDefinition = {
  key: string;
  label: string;
  value: string;
};

const Real8StatsGrid: React.FC = () => {
  const stats = useReal8Stats();

  // Define stats array for mapping to cards
  const statDefinitions: StatDefinition[] = [
    {
      key: 'priceXlm',
      label: 'PRICE (XLM)',
      value: formatPrice(stats.priceXlm, 'XLM')
    },
    {
      key: 'priceUsd',
      label: 'PRICE (USD)',
      value: formatPrice(stats.priceUsd, 'USD')
    },
    {
      key: 'totalSupply',
      label: 'TOTAL SUPPLY',
      value: formatNumber(stats.totalSupply)
    },
    {
      key: 'circulating',
      label: 'CIRCULATING',
      value: formatNumber(stats.circulating)
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
          {statDefinitions.map((stat) => (
            <Paper
              key={stat.key}
              variant="outlined"
              elevation={0}
              sx={{
                flex: '1 1 180px',
                minWidth: 180,
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
                {stat.label}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  lineHeight: 1.15,
                  fontWeight: 500,
                  wordWrap: 'break-word'
                }}
              >
                {stat.value}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* Error and updated time as full-width centered lines below cards */}
        {!stats.loading && stats.error && (
          <Typography
            variant="caption"
            color="error"
            sx={{
              width: '100%',
              textAlign: 'center',
              display: 'block'
            }}
          >
            {stats.error}
          </Typography>
        )}
        {stats.updatedAt && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              width: '100%',
              textAlign: 'center',
              display: 'block',
              mt: stats.error ? 0.5 : 0
            }}
          >
            Updated {stats.updatedAt.toLocaleTimeString()}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Real8StatsGrid;