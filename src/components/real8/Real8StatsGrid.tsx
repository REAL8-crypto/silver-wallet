import React from 'react';
import { Paper, Typography, Skeleton, Box } from '@mui/material';
import { useReal8AssetData } from '../../hooks/useReal8AssetData';

interface StatBoxProps {
  label: string;
  value?: string | number | null;
  loading?: boolean;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, loading }) => {
  const content = loading ? (
    <Skeleton width="60%" />
  ) : (
    <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
      {value ?? '—'}
    </Typography>
  );

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
      {content}
    </Paper>
  );
};

const Real8StatsGrid: React.FC = () => {
  const { loading, data } = useReal8AssetData();

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
        loading={loading}
        value={data.priceUsd ? `$${data.priceUsd.toFixed(2)}` : null}
      />
      <StatBox
        label="Total Supply"
        loading={loading}
        value={data.totalSupply?.toLocaleString()}
      />
      <StatBox
        label="Circulating"
        loading={loading}
        value={data.circulating?.toLocaleString()}
      />
      <StatBox
        label="Updated"
        loading={loading}
        value={
          data.updatedAt
            ? new Date(data.updatedAt).toLocaleTimeString()
            : null
        }
      />
    </Box>
  );
};

export default Real8StatsGrid;