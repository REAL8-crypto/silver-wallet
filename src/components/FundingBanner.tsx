import React from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';

interface FundingBannerProps {
  publicKey: string | null;
  unfunded?: boolean;
  // Support both legacy + new naming (either pair can be used)
  onCopy?: () => void;
  copied?: boolean;
  onCopyAddress?: () => void;
  copiedAddress?: boolean;
}

const FundingBanner: React.FC<FundingBannerProps> = ({
  publicKey,
  unfunded,
  onCopy,
  copied,
  onCopyAddress,
  copiedAddress
}) => {
  const { isTestnet } = useWallet();
  if (!publicKey) return null;
  if (typeof unfunded === 'boolean' && !unfunded) return null;

  // Normalize handlers (prefer new naming if provided)
  const handleCopy = onCopyAddress || onCopy;
  const isCopied = copiedAddress ?? copied ?? false;

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

          {handleCopy && (
            <Button
              size="small"
              variant="outlined"
              onClick={handleCopy}
              disabled={isCopied}
            >
              {isCopied ? 'Copied!' : 'Copy Address'}
            </Button>
          )}
        </Stack>

        <Typography
            variant="caption"
            sx={{ wordBreak: 'break-all', opacity: 0.8 }}
        >
          {publicKey}
        </Typography>
      </Stack>
    </Alert>
  );
};

export default FundingBanner;
