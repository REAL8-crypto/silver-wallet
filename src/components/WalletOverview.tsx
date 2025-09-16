import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';

const WalletOverview: React.FC = () => {
  const { publicKey, balances } = useWallet();

  return (
    <Paper sx={{ p: 3, mb: 2 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Wallet Overview
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Public Key:
      </Typography>
      <Typography variant="body1" sx={{ wordBreak: 'break-all', mb: 2 }}>
        {publicKey || 'No wallet connected'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Balances:
      </Typography>
      <Box>
        {balances && balances.length > 0 ? (
          balances.map((bal, idx) => (
            <Typography key={idx} variant="body2">
              {bal.asset_code || 'XLM'}: {Number(bal.balance).toFixed(4)}
            </Typography>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No balances found.
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default WalletOverview;
