import React from 'react';
import Grid from '@mui/material/Grid';
import { Card, CardContent, Typography } from '@mui/material';
import type { PoolDef } from '../../types/pools';
import { getTotalPoolsValue, getAverageAPY, getTotalVolume } from '../../utils/poolCalculations';

interface PoolStatisticsProps {
  pools: PoolDef[];
  isSpanish: boolean;
}

export const PoolStatistics: React.FC<PoolStatisticsProps> = ({ pools, isSpanish }) => {
  const totalTVL = getTotalPoolsValue(pools);
  const averageAPY = getAverageAPY(pools);
  const totalVolume = getTotalVolume(pools);

  const stats = [
    {
      value: pools.length.toString(),
      label: isSpanish ? 'Fondos Disponibles' : 'Available Pools',
      color: 'primary'
    },
    {
      value: `$${totalTVL.toLocaleString()}`,
      label: isSpanish ? 'TVL Total' : 'Total TVL',
      color: 'primary'
    },
    {
      value: `${averageAPY.toFixed(1)}%`,
      label: isSpanish ? 'APY Promedio' : 'Average APY',
      color: 'success.main'
    },
    {
      value: `$${totalVolume.toLocaleString()}`,
      label: isSpanish ? 'Volumen 24h' : '24h Volume',
      color: 'info.main'
    }
  ];

  return (
    <Grid container spacing={2}>
      {stats.map((stat, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography 
                variant="h4" 
                color={stat.color as any} 
                fontWeight={600}
              >
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};