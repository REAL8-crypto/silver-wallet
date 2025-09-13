import React, { useState, useCallback } from 'react';
import {
  Alert,
  Button,
  Stack,
  Typography,
  CircularProgress,
  Collapse
} from '@mui/material';
import { CheckCircle, ErrorOutline } from '@mui/icons-material';
import { useWallet } from '../contexts/WalletContext';

interface FundingBannerProps {
  publicKey: string | null;
  unfunded?: boolean;
  onCopyAddress?: () => void;
  copiedAddress?: boolean;
  // Backward compatibility (legacy props)
  onCopy?: () => void;
  copied?: boolean;
}

const FundingBanner: React.FC<FundingBannerProps> = ({
  publicKey,
  unfunded,
  onCopyAddress,
  copiedAddress,
  onCopy,
  copied
}) => {
  const { isTestnet } = useWallet();

  // Hooks must be at the top (before any early returns)
  const [funding, setFunding] = useState(false);
  const [fundedOk, setFundedOk] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);

  // Normalize handlers (not hooks)
  const handleCopy = onCopyAddress || onCopy;
  const isCopied = copiedAddress ?? copied ?? false;

  // Build URL only if we have a key; otherwise blank (won't be used)
  const friendbotUrl = publicKey
    ? `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`
    : '';

  const requestFunding = useCallback(async () => {
    if (!publicKey) return;
    if (funding || fundedOk) return;
    setFunding(true);
    setFundError(null);
    try {
      const res = await fetch(friendbotUrl, { method: 'GET', mode: 'cors' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Friendbot HTTP ${res.status}: ${text.slice(0, 140)}`);
      }
      // Friendbot returns JSON; ignore parsing errors gracefully
      await res.json().catch(() => ({}));
      setFundedOk(true);
    } catch (e: any) {
      setFundError(e.message || 'Unknown friendbot error');
    } finally {
      setFunding(false);
    }
  }, [publicKey, funding, fundedOk, friendbotUrl]);

  // Early returns AFTER hooks are declared
  if (!publicKey) return null;
  if (typeof unfunded === 'boolean' && !unfunded) return null;

  return (
    <Alert
      severity={fundError ? 'error' : fundedOk ? 'success' : 'warning'}
      sx={{
        mt: 2,
        '& .MuiAlert-message': { width: '100%' }
      }}
    >
      <Stack spacing={1}>
        <Typography variant="body2" fontWeight={600}>
          {fundError
            ? 'Funding failed. You can retry.'
            : fundedOk
              ? 'Funding transaction requested. Waiting for network confirmation...'
              : 'This account is not funded yet.'}
        </Typography>

        {isTestnet ? (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {!fundedOk && (
              <Button
                size="small"
                variant="contained"
                onClick={requestFunding}
                disabled={funding}
                startIcon={
                  funding ? <CircularProgress size={14} color="inherit" /> : undefined
                }
              >
                {funding ? 'Requesting...' : 'Fund via Friendbot'}
              </Button>
            )}
            {fundedOk && (
              <Button
                size="small"
                color="success"
                variant="contained"
                startIcon={<CheckCircle />}
                disabled
              >
                Requested
              </Button>
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
        ) : (
          <Typography variant="caption" sx={{ alignSelf: 'center' }}>
            Send the minimum XLM reserve from an existing Stellar account to activate it.
          </Typography>
        )}

        <Collapse in={!!fundError}>
          {fundError && (
            <Stack direction="row" spacing={1} alignItems="center">
              <ErrorOutline fontSize="small" color="error" />
              <Typography
                variant="caption"
                sx={{ color: 'error.main', wordBreak: 'break-all' }}
              >
                {fundError}
              </Typography>
            </Stack>
          )}
        </Collapse>

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
