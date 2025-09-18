import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useWallet } from '../../contexts/WalletContext';

interface WalletOverviewProps {
  onSend?: () => void;
  onReceive?: () => void;
}

const WalletOverview: React.FC<WalletOverviewProps> = ({ onSend, onReceive }) => {
  const { publicKey, balances } = useWallet();

  return (
    <Box>
      {/* TODO: Add GeneralWalletButtons component later */}
      
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Wallet Overview
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Public Key:
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            wordBreak: 'break-all', 
            mb: 2, 
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            bgcolor: 'grey.50',
            p: 1,
            borderRadius: 1
          }}
        >
          {publicKey || 'No wallet connected'}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Balances:
        </Typography>
        <Box>
          {balances && balances.length > 0 ? (
            balances.map((bal, idx) => (
              <Box 
                key={idx} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  py: 0.5,
                  borderBottom: idx < balances.length - 1 ? '1px solid' : 'none',
                  borderColor: 'grey.100'
                }}
              >
                <Typography variant="body2" fontWeight={500}>
                  {bal.asset_code || 'XLM'}
                </Typography>
                <Typography variant="body2">
                  {Number(bal.balance).toFixed(4)}
                </Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No balances found.
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default WalletOverview;
