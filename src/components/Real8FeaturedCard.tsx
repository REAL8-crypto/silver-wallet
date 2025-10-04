import React from 'react';
import {
  Box, Paper, Typography, Button, Stack, Chip, Tooltip, CircularProgress
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { REAL8 } from '../constants/real8Asset';
import { useWallet } from '../contexts/WalletContext';
import { useReal8Stats, formatNumber } from '../hooks/useReal8Stats';

interface Real8FeaturedCardProps {
  onSend: () => void;
  onReceive: () => void;
  onAddTrustline: () => void;
  loadingPrice?: boolean;
  priceUsd?: number | null;
  compact?: boolean;
}

const Real8FeaturedCard: React.FC<Real8FeaturedCardProps> = ({
  onSend,
  onReceive,
  onAddTrustline,
  loadingPrice,
  priceUsd,
  compact
}) => {
  const { t } = useTranslation();
  const { balances, unfunded } = useWallet();
  const stats = useReal8Stats();

  const trustline = balances.find(b => b.asset_code === REAL8.CODE);
  const hasTrustline = !!trustline;
  const balance = trustline?.balance || '0';

  // Updated stat definitions as requested
  const statDefinitions = [
    {
      key: 'totalSupply',
      label: 'TOTAL SUPPLY',
      value: formatNumber(stats.totalSupply)
    },
    {
      key: 'circulating',
      label: 'CIRCULATING',
      value: formatNumber(stats.totalSupply) // Same as total supply
    },
    {
      key: 'trustlines',
      label: 'TRUSTLINES',
      value: '163 / 155'
    },
    {
      key: 'totalTrades',
      label: 'TOTAL TRADES',
      value: '8,559'
    }
  ];

  let statusLabel = 'Active';
  let statusColor: 'default' | 'warning' | 'success' = 'success';
  if (!hasTrustline) {
    statusLabel = t('trustlineMissing');
    statusColor = 'warning';
  } else if (parseFloat(balance) === 0) {
    statusLabel = t('noBalance');
    statusColor = 'default';
  }

  const fiatDisplay =
    priceUsd && hasTrustline
      ? `≈ $${(parseFloat(balance) * priceUsd).toFixed(2)}`
      : '';

  const gradient = REAL8.GRADIENT;

  return (
    <Paper
      elevation={compact ? 2 : 4}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: compact ? 2 : 2.5,
        mb: 3,
        borderRadius: 3,
        background: gradient,
        color: 'white'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.08,
          background:
            'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)'
        }}
      />
      
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Chip
              size="small"
              label={statusLabel}
              color={statusColor}
              variant={statusColor === 'default' ? 'outlined' : 'filled'}
              sx={{
                bgcolor:
                  statusColor === 'default'
                    ? 'rgba(255,255,255,0.15)'
                    : undefined,
                color: statusColor === 'default' ? 'white' : undefined,
                borderColor: 'rgba(255,255,255,0.4)'
              }}
            />
          </Stack>
          
          <Typography
            variant={compact ? 'h5' : 'h4'}
            sx={{ fontWeight: 600, lineHeight: 1.15, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
          >
            {balance}{' '}
            <Typography component="span" variant={compact ? 'subtitle1' : 'h6'}>
              REAL8
            </Typography>
          </Typography>
          
          {!!fiatDisplay && (
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5, fontWeight: 500 }}>
              {loadingPrice ? (
                <CircularProgress color="inherit" size={14} sx={{ mr: 1 }} />
              ) : (
                fiatDisplay
              )}
            </Typography>
          )}
          
          {!hasTrustline && !unfunded && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              {t('addTrustlineToReceiveReal8')}
            </Typography>
          )}
          
          {unfunded && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              {t('fundBeforeAddingTrustlines')}
            </Typography>
          )}
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 2 }}>
            {!hasTrustline ? (
              <Button
                variant="contained"
                color="secondary"
                onClick={onAddTrustline}
                disabled={unfunded}
                sx={{
                  fontWeight: 600,
                  textTransform: 'none',
                  background: 'rgba(255,255,255,0.15)',
                  '&:hover': { background: 'rgba(255,255,255,0.25)' }
                }}
              >
                {t('addTrustline')}
              </Button>
            ) : (
              <>
                <Tooltip
                  title={
                    unfunded
                      ? t('fundBeforeAddingTrustlines')
                      : parseFloat(balance) === 0
                        ? t('noBalanceToSend')
                        : ''
                  }
                  disableHoverListener={
                    !(unfunded || parseFloat(balance) === 0)
                  }
                >
                  <span>
                    <Button
                      variant="contained"
                      disabled={unfunded || parseFloat(balance) === 0}
                      onClick={onSend}
                      sx={{
                        fontWeight: 600,
                        textTransform: 'none',
                        background: 'rgba(255,255,255,0.15)',
                        '&:hover': { background: 'rgba(255,255,255,0.25)' }
                      }}
                    >
                      {t('send')}
                    </Button>
                  </span>
                </Tooltip>
                <Button
                  variant="outlined"
                  disabled={unfunded || !hasTrustline}
                  onClick={onReceive}
                  sx={{
                    fontWeight: 600,
                    textTransform: 'none',
                    borderColor: 'rgba(255,255,255,0.5)',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      background: 'rgba(255,255,255,0.12)'
                    }
                  }}
                >
                  {t('receive')}
                </Button>
              </>
            )}
          </Stack>
        </Box>
        
        {/* Stats grid on the right */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: { xs: 1, sm: 1.25 },
            maxWidth: 420,
            alignSelf: 'stretch'
          }}
        >
          {statDefinitions.map((stat) => (
            <Paper
              key={stat.key}
              variant="outlined"
              elevation={0}
              sx={{
                borderColor: 'rgba(255,255,255,0.5)',
                background: 'transparent',
                p: { xs: 1, sm: 1.25 }
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: 0.6,
                  color: 'white',
                  opacity: 0.9
                }}
              >
                {stat.label}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  lineHeight: 1.15,
                  fontWeight: 500,
                  wordWrap: 'break-word',
                  // Smaller font size for large numbers to prevent wrapping
                  fontSize: stat.key === 'totalSupply' || stat.key === 'circulating' 
                    ? { xs: '0.85rem', sm: '1rem' } 
                    : undefined
                }}
              >
                {stat.value}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Stack>
    </Paper>
  );
};

export default Real8FeaturedCard;
