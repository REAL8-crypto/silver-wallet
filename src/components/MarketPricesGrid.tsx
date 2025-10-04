import React from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useReal8Pairs } from '../hooks/useReal8Pairs';
import { formatPrice } from '../hooks/useReal8Stats';

const assets = [
  { code: 'XLM', label: 'XLM/REAL8' },
  { code: 'USDC', label: 'USDC/REAL8' },
  { code: 'EURC', label: 'EURC/REAL8' },
  { code: 'SLVR', label: 'SLVR/REAL8' },
  { code: 'GOLD', label: 'GOLD/REAL8' },
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

  // Create asset cards
  const createAssetCard = (asset: typeof assets[0]) => (
    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3 }} key={asset.code}>
      <Typography variant="subtitle2" fontWeight={600}>
        {asset.label}
      </Typography>
      <Typography variant="h6" sx={{ mt: 0.5 }}>
        {getPriceValue(asset.code)}
      </Typography>
    </Paper>
  );

  return (
    <Box sx={{ maxWidth: 920, mx: 'auto' }}>
      {/* Desktop layout: 5 columns */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Grid container spacing={2} sx={{ my: 1 }}>
          {assets.map(asset => (
            <Grid size={{ md: 2.4 }} key={asset.code}>
              {createAssetCard(asset)}
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Mobile layout: 3 rows as specified */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        {/* Row 1: REAL8/XLM (1 column, centered) */}
        <Grid container spacing={2} sx={{ my: 1 }}>
          <Grid size={{ xs: 12 }}>
            {createAssetCard(assets[0])} {/* XLM */}
          </Grid>
        </Grid>

        {/* Row 2: REAL8/USDC and REAL8/EURC (2 columns) */}
        <Grid container spacing={2} sx={{ my: 1 }}>
          <Grid size={{ xs: 6 }}>
            {createAssetCard(assets[1])} {/* USDC */}
          </Grid>
          <Grid size={{ xs: 6 }}>
            {createAssetCard(assets[2])} {/* EURC */}
          </Grid>
        </Grid>

        {/* Row 3: REAL8/SLVR and REAL8/GOLD (2 columns) */}
        <Grid container spacing={2} sx={{ my: 1 }}>
          <Grid size={{ xs: 6 }}>
            {createAssetCard(assets[3])} {/* SLVR */}
          </Grid>
          <Grid size={{ xs: 6 }}>
            {createAssetCard(assets[4])} {/* GOLD */}
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default MarketPricesGrid;
