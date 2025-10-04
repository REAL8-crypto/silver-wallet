import React from 'react';
import { Paper, Typography, Stack, Alert } from '@mui/material';
import { PoolCard } from './PoolCard';
import type { PoolDef } from '../../types/pools';

interface PoolsListProps {
  pools: PoolDef[];
  isSpanish: boolean;
  hasWallet: boolean;
  onPoolAction: (poolId: string, action: 'join' | 'add' | 'remove') => void;
  onNavigateToTab?: (tab: string) => void;
}

export const PoolsList: React.FC<PoolsListProps> = ({
  pools,
  isSpanish,
  hasWallet,
  onPoolAction,
  onNavigateToTab
}) => {
  if (pools.length === 0 && hasWallet) {
    return (
      <Alert severity="warning">
        <Typography variant="body2">
          {isSpanish 
            ? 'No se encontraron pools de liquidez REAL8. Los pools pueden crearse cuando haya demanda.'
            : 'No REAL8 liquidity pools found. Pools can be created when there is demand.'
          }
        </Typography>
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {isSpanish ? 'Fondos REAL8 Disponibles' : 'Available REAL8 Pools'}
      </Typography>
      <Stack spacing={2}>
        {pools.map((pool) => (
          <PoolCard
            key={pool.poolId}
            pool={pool}
            isSpanish={isSpanish}
            onAction={onPoolAction}
            onNavigateToTab={onNavigateToTab}
          />
        ))}
      </Stack>
    </Paper>
  );
};