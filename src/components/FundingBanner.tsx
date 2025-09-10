import React from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';

interface FundingBannerProps {
  publicKey: string | null;
  unfunded: boolean;
}

const FundingBanner: React.FC<FundingBannerProps> = ({ publicKey, unfunded }) => {
  const { isTestnet } = useWallet();
  if (!publicKey || !unfunded) return null;

  const friendbotUrl = `https://friendbot.stellar.org/?addr=${publicKey}`;

  return (
    <Alert severity="warning" sx={{ mt: 2 }}>
      <Stack spacing={1}>
        <Typography variant="body2" fontWeight={600}>
          This account is not funded yet.
        </Typography>
        {isTestnet ? (
          <Button
            size="small"
            variant="contained"
            href={friendbotUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Fund via Friendbot
          </Button>
        ) : (
          <Typography variant="caption">
            Send the minimum XLM reserve from an existing Stellar account to activate it.
          </Typography>
        )}
      </Stack>
    </Alert>
  );
};

export default FundingBanner;