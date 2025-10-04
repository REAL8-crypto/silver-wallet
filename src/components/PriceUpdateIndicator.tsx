import React from 'react';
import { Box, CircularProgress, Typography, Fade } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface PriceUpdateIndicatorProps {
  updating: boolean;
  message?: string;
}

export const PriceUpdateIndicator: React.FC<PriceUpdateIndicatorProps> = ({ 
  updating, 
  message = 'Updating prices...' 
}) => {
  return (
    <Fade in={updating}>
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          boxShadow: 2
        }}
      >
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </Box>
    </Fade>
  );
};