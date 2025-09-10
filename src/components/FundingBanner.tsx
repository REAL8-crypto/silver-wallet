import React from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';

interface FundingBannerProps {
  publicKey: string | null;
  /**
   * Optional: caller can still pass unfunded; if not provided we just show whenever used.
   * In current usage you already gate with {unfunded && <FundingBanner .../>}
   */
  unfunded?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}

const FundingBanner: React.FC<FundingBannerProps> = ({
  publicKey,
  unfunded,
  onCopy,
  copied
}) => {
  const { isTestnet } = useWallet();

  if (!publicKey) return null;
  // If unfunded prop is explicitly provided and false, hide.
  if (typeof unfunded === 'boolean' && !unfunded) return null;

  const friendbotUrl = `https://friendbot.stellar.org/?addr=${publicKey}`;

  return (
    <Alert
      severity="warning"
      sx={{
        mt: 2,
        '& .MuiAlert-message': { width: '100%' }
      }}
    >
      <Stack spacing={1}>
        <Typography variant="body2" fontWeight={600}>
          This account is not funded yet.
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap">
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
            <Typography variant="caption" sx={{ alignSelf: 'center' }}>
              Send the minimum XLM reserve from an existing Stellar account to activate it.
            </Typography>
          )}

          {onCopy && (
            <Button
              size="small"
              variant="outlined"
              onClick={onCopy}
              disabled={copied}
            >
              {copied ? 'Copied!' : 'Copy Address'}
            </Button>
          )}
        </Stack>

        <Typography variant="caption" sx={{ wordBreak: 'break-all', opacity: 0.8 }}>
          {publicKey}
        </Typography>
      </Stack>
    </Alert>
  );
};

export default FundingBanner;
