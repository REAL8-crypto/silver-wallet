import React from 'react';
import Grid from '@mui/material/Grid'; // correct for MUI v7
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

const assets = [
  { code: 'XLM', label: 'PRICE (XLM)' },
  { code: 'USDC', label: 'PRICE (USDC)' },
  { code: 'EURC', label: 'PRICE (EURC)' },
  { code: 'SLVR', label: 'PRICE (SLVR)' },
  { code: 'GOLD', label: 'PRICE (GOLD)' },
];

const MarketPricesGrid: React.FC<{ prices?: Record<string, number | string> }> = ({ prices }) => (
  <Grid container spacing={2} sx={{ my: 1 }}>
    {assets.map(asset => (
      <Grid item={true} xs={12} sm={6} md={3} key={asset.code}>
        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {asset.label}
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.5 }}>
            {prices?.[asset.code] !== undefined ? prices[asset.code] : '—'}
          </Typography>
        </Paper>
      </Grid>
    ))}
  </Grid>
);

export default MarketPricesGrid;
