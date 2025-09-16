import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';

// Example props, adjust as needed
interface PriceData {
  code: string;
  label: string;
  value: string | number;
}

const assets: PriceData[] = [
  { code: 'XLM', label: 'PRICE (XLM)', value: '—' },
  { code: 'USDC', label: 'PRICE (USDC)', value: '—' },
  { code: 'EURC', label: 'PRICE (EURC)', value: '—' },
  { code: 'SLVR', label: 'PRICE (SLVR)', value: '—' },
  { code: 'GOLD', label: 'PRICE (GOLD)', value: '—' },
];

const MarketPricesGrid: React.FC<{ prices?: Record<string, number | string> }> = ({ prices }) => (
  <Grid container spacing={2} sx={{ my: 1 }}>
    {assets.map(asset => (
      <Grid item xs={12} sm={6} md={2.4} key={asset.code}>
        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {asset.label}
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.5 }}>
            {prices && prices[asset.code] !== undefined ? prices[asset.code] : asset.value}
          </Typography>
        </Paper>
      </Grid>
    ))}
  </Grid>
);

export default MarketPricesGrid;
