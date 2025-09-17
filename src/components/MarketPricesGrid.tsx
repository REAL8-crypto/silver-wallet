import React from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useReal8Stats, formatPrice } from '../hooks/useReal8Stats';

const assets = [
  { code: 'XLM', label: 'REAL8/XLM' },
  { code: 'USDC', label: 'REAL8/USDC' },
  { code: 'EURC', label: 'REAL8/EURC' },
  { code: 'SLVR', label: 'REAL8/SLVR' },
  { code: 'GOLD', label: 'REAL8/GOLD' },
];

const MarketPricesGrid: React.FC<{ prices?: Record<string, number | string> }> = ({ prices }) => {
  const stats = useReal8Stats();
  
  // Get actual price data - for now using the same data from Real8Stats for XLM and USDC
  const getPriceValue = (assetCode: string) => {
    if (prices?.[assetCode] !== undefined) {
      return prices[assetCode];
    }
    
    // Use Real8Stats data for available pairs
    switch (assetCode) {
      case 'XLM':
        return formatPrice(stats.priceXlm, 'XLM');
      case 'USDC':
        return formatPrice(stats.priceUsd, 'USD');
      default:
        return '—'; // Placeholder for EURC, SLVR, GOLD until price feeds are available
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Grid container spacing={2} sx={{ my: 1 }}>
        {assets.map(asset => (
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={asset.code}>
            <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {asset.label}
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.5 }}>
                {getPriceValue(asset.code)}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default MarketPricesGrid;
