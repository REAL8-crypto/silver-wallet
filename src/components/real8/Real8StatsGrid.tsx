import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box, Alert } from '@mui/material';

interface Real8Stats {
  priceUsd: number | null;
  totalSupply: number | null;
  circulating: number | null;
  updatedAt: string | null;
}

interface StatBoxProps {
  label: string;
  value?: string | number | null;
  loading?: boolean;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value }) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        borderRadius: 2,
        flex: '1 1 140px',
        minWidth: 140,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, letterSpacing: 0.5, mb: 0.5 }}
      >
        {label.toUpperCase()}
      </Typography>
      <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
        {value ?? '—'}
      </Typography>
    </Paper>
  );
};

const Real8StatsGrid: React.FC = () => {
  const [stats, setStats] = useState<Real8Stats>({
    priceUsd: null,
    totalSupply: null,
    circulating: null,
    updatedAt: null
  });
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      
      // Fetch from Horizon API
      const horizonResponse = await fetch(
        'https://horizon.stellar.org/assets?asset_code=REAL8&asset_issuer=GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD'
      );
      
      let totalSupply: number | null = null;
      let circulating: number | null = null;

      if (horizonResponse.ok) {
        const horizonData = await horizonResponse.json();
        if (horizonData.records && horizonData.records.length > 0) {
          const amount = parseFloat(horizonData.records[0].amount);
          if (!isNaN(amount)) {
            totalSupply = amount;
            circulating = amount; // fallback until distinct metric available
          }
        }
      }

      // Fetch from Stellar.expert API
      const stellarExpertResponse = await fetch(
        'https://api.stellar.expert/explorer/public/asset/REAL8-GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD'
      );

      let priceUsd: number | null = null;

      if (stellarExpertResponse.ok) {
        const expertData = await stellarExpertResponse.json();
        
        // Extract price
        if (expertData.price) {
          const price = typeof expertData.price === 'number' 
            ? expertData.price 
            : (typeof expertData.price.usd === 'number' ? expertData.price.usd : null);
          if (price !== null && !isNaN(price)) {
            priceUsd = price;
          }
        }

        // Override supply data if available
        if (expertData.supply) {
          if (typeof expertData.supply.total === 'number' && !isNaN(expertData.supply.total)) {
            totalSupply = expertData.supply.total;
          }
          if (typeof expertData.supply.circulating === 'number' && !isNaN(expertData.supply.circulating)) {
            circulating = expertData.supply.circulating;
          }
        }
      }

      setStats({
        priceUsd,
        totalSupply,
        circulating,
        updatedAt: new Date().toISOString()
      });

    } catch (err) {
      console.error('Error fetching REAL8 stats:', err);
      setError('Failed to fetch current market data');
    }
  };

  useEffect(() => {
    fetchStats(); // Initial fetch

    const interval = setInterval(fetchStats, 60000); // 60s refresh interval

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number | null): string => {
    if (price === null) return '—';
    
    if (price < 0.0001) {
      return `$${price.toFixed(6)}`;
    } else {
      return `$${price.toFixed(4)}`;
    }
  };

  const formatSupply = (supply: number | null): string => {
    if (supply === null) return '—';
    return supply.toLocaleString();
  };

  const formatTime = (timestamp: string | null): string => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <>
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3
        }}
      >
        <StatBox
          label="Price (USD)"
          value={formatPrice(stats.priceUsd)}
        />
        <StatBox
          label="Total Supply"
          value={formatSupply(stats.totalSupply)}
        />
        <StatBox
          label="Circulating"
          value={formatSupply(stats.circulating)}
        />
        <StatBox
          label="Updated"
          value={formatTime(stats.updatedAt)}
        />
      </Box>
    </>
  );
};

export default Real8StatsGrid;