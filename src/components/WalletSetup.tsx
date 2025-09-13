import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

type SetupStep = 'welcome' | 'created' | 'import';

const WalletSetup: React.FC = () => {
  const { t } = useTranslation();
  const {
    publicKey,
    secretKey,
    generateWallet,
    importSecret,
    isTestnet
  } = useWallet();

  const [step, setStep] = useState<SetupStep>('welcome');
  const [importKey, setImportKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setError(null);
    generateWallet();
    setStep('created');
  };

  const handleImport = () => {
    setError(null);
    if (!importKey.trim()) {
      setError('Secret key required');
      return;
    }
    try {
      importSecret(importKey.trim());
      setStep('created');
      setImportKey('');
    } catch (e: any) {
      setError(e?.message || 'Import failed');
    }
  };

  const copySecret = () => {
    if (!secretKey) return;
    navigator.clipboard.writeText(secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', p: 3 }}>
      {isTestnet && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Testnet Environment
        </Alert>
      )}

      {step === 'welcome' && (
        <Stack spacing={3}>
          <Typography variant="h5" fontWeight={600}>
            {t('welcome') || 'Welcome'}
          </Typography>
            <Typography variant="body2" color="text.secondary">
            {t('walletSetupIntro') ||
              'Create a new Stellar wallet or import an existing secret key.'}
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={handleCreate}>
              {t('createWallet') || 'Create Wallet'}
            </Button>
            <Button variant="outlined" onClick={() => setStep('import')}>
              {t('importWallet') || 'Import Wallet'}
            </Button>
          </Stack>
        </Stack>
      )}

      {step === 'import' && (
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={600}>
            {t('importWallet') || 'Import Wallet'}
          </Typography>
          <TextField
            label={t('secretKey') || 'Secret Key'}
            value={importKey}
            onChange={e => setImportKey(e.target.value)}
            fullWidth
            size="small"
            placeholder="SA.."
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={handleImport}>
              {t('import') || 'Import'}
            </Button>
            <Button variant="outlined" onClick={() => setStep('welcome')}>
              {t('back') || 'Back'}
            </Button>
          </Stack>
        </Stack>
      )}

      {step === 'created' && (
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={600}>
            {t('walletReady') || 'Wallet Ready'}
          </Typography>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {t('publicKey') || 'Public Key'}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                p: 1,
                bgcolor: 'background.paper',
                border: theme => `1px solid ${theme.palette.divider}`,
                borderRadius: 1
              }}
            >
              {publicKey}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom color="error">
              {t('privateKey') || 'Private Key'}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  flex: 1,
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  p: 1,
                  bgcolor: 'background.paper',
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: 1
                }}
              >
                {secretKey}
              </Typography>
              <Tooltip
                title={
                  copied
                    ? t('copied') || 'Copied'
                    : t('copyPrivateKey') || 'Copy'
                }
              >
                <IconButton
                  color={copied ? 'success' : 'default'}
                  onClick={copySecret}
                  size="small"
                >
                  {copied ? <CheckIcon /> : <ContentCopyIcon />}
                </IconButton>
              </Tooltip>
            </Box>
            <Typography
              variant="caption"
              color="error"
              sx={{ display: 'block', mt: 0.5 }}
            >
              {t('storeSecretWarning') ||
                'Store this secret securely. Anyone with it can control the wallet.'}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={() => setStep('welcome')}
            size="small"
          >
            {t('back') || 'Back'}
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default WalletSetup;