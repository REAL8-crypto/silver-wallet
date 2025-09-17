import React from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useReal8Pairs } from '../hooks/useReal8Pairs';
import { formatPrice } from '../hooks/useReal8Stats';

const assets = [
  { code: 'XLM', label: 'REAL8/XLM' },
  { code: 'USDC', label: 'REAL8/USDC' },
  { code: 'EURC', label: 'REAL8/EURC' },
  { code: 'SLVR', label: 'REAL8/SLVR' },
  { code: 'GOLD', label: 'REAL8/GOLD' },
];

const MarketPricesGrid: React.FC<{ prices?: Record<string, number | string> }> = ({ prices }) => {
  const { prices: pairPrices } = useReal8Pairs();
  
  // Get actual price data from useReal8Pairs hook
  const getPriceValue = (assetCode: string) => {
    // Use passed-in prices first, then pairPrices from hook
    if (prices?.[assetCode] !== undefined) {
      return prices[assetCode];
    }
    
    const price = pairPrices[assetCode];
    if (price !== null && price !== undefined) {
      // Format based on asset type
      if (assetCode === 'USDC' || assetCode === 'EURC') {
        return formatPrice(price, 'USD'); // Use USD formatting for fiat
      } else {
        return formatPrice(price); // Use default formatting for XLM, SLVR, GOLD
      }
    }
    
    return '—';
  };

  return (
    <Box sx={{ maxWidth: 920, mx: 'auto' }}>
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
