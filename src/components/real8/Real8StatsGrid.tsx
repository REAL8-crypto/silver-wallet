import React from 'react';
import { Paper, Typography, Skeleton, Tooltip, Box } from '@mui/material';
import { useReal8Price } from '../../hooks/useReal8Price';
import { useReal8Supply } from '../../hooks/useReal8Supply';

interface StatBoxProps {
  label: string;
  value?: string | number | null;
  loading?: boolean;
  tooltip?: string;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, loading, tooltip }) => {
  const content = loading ? (
    <Skeleton width="60%" />
  ) : (
    <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
      {value ?? '—'}
    </Typography>
  );

  const inner = (
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
      {content}
    </Paper>
  );

  return tooltip ? <Tooltip title={tooltip}>{inner}</Tooltip> : inner;
};

const Real8StatsGrid: React.FC = () => {
  const { loading: priceLoading, priceUsd } = useReal8Price();
  const { loading: supplyLoading, data: supply } = useReal8Supply();

  return (
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
        loading={priceLoading}
        value={priceUsd ? `$${priceUsd.toFixed(2)}` : null}
        tooltip="Indicative placeholder price"
      />
      <StatBox
        label="Total Supply"
        loading={supplyLoading}
        value={supply.totalSupply?.toLocaleString()}
        tooltip="Static placeholder supply"
      />
      <StatBox
        label="Circulating"
        loading={supplyLoading}
        value={supply.circulating?.toLocaleString()}
        tooltip="Static placeholder circulating"
      />
      <StatBox
        label="Updated"
        loading={supplyLoading}
        value={
          supply.updatedAt
            ? new Date(supply.updatedAt).toLocaleTimeString()
            : null
        }
        tooltip="Last mock refresh time"
      />
    </Box>
  );
};

export default Real8StatsGrid;