import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const PoolsManager: React.FC = () => {
  return (
    <Paper sx={{ p: 3, mb: 2 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Pools Manager
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Pool management features coming soon.
      </Typography>
    </Paper>
  );
};

export default PoolsManager;
