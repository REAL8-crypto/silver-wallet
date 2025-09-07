import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../contexts/WalletContext';
import { Box, Button, TextField, Typography, Paper, Alert, IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import real8Logo from '../assets/real8-logo.png';

type SetupStep = 'welcome' | 'create' | 'import' | 'backup';

const WalletSetup: React.FC = () => {
  const { t } = useTranslation();
  const { createWallet, importWallet, publicKey, secretKey } = useWallet();
  const [step, setStep] = useState<SetupStep>('welcome');
  const [importKey, setImportKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleCreateWallet = () => {
    createWallet();
    setStep('backup');
  };

  const handleImportWallet = () => {
    try {
      importWallet(importKey);
      setStep('welcome');
    } catch (err) {
      setError(t('error.invalidSecretKey') || 'Invalid secret key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = () => {
    setStep('welcome');
    setError('');
  };

  if (step === 'welcome') {
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', mt: 8, p: { xs: 2, sm: 3 }, width: '100%' }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          {/* REAL8 Logo */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <img 
              src={real8Logo} 
              alt="REAL8 Logo" 
              style={{ 
                height: 80, 
                maxWidth: '300px',
                objectFit: 'contain'
              }} 
            />
          </Box>

          <Typography variant="h4" gutterBottom>
            {t('welcome')}
          </Typography>
          <Typography variant="body1" paragraph>
            {t('createOrImportWallet')}
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 4 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => setStep('create')}
              fullWidth
            >
              {t('createNewWallet')}
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              onClick={() => setStep('import')}
              fullWidth
            >
              {t('importExistingWallet')}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (step === 'create') {
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', mt: 8, p: { xs: 2, sm: 3 }, width: '100%' }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleBack} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5">{t('createNewWallet')}</Typography>
          </Box>
          
          <Typography variant="body1" paragraph>
            {t('createWalletDescription')}
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleCreateWallet}
            fullWidth
            sx={{ mt: 2 }}
          >
            {t('createWallet')}
          </Button>
        </Paper>
      </Box>
    );
  }

  if (step === 'import') {
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', mt: 8, p: { xs: 2, sm: 3 }, width: '100%' }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleBack} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5">{t('importExistingWallet')}</Typography>
          </Box>
          
          <TextField
            label={t('secretKey')}
            value={importKey}
            onChange={(e) => setImportKey(e.target.value)}
            fullWidth
            margin="normal"
            type="password"
            placeholder={t('enterSecretKey') || 'Enter your secret key'}
          />
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleImportWallet}
            fullWidth
            sx={{ mt: 2 }}
            disabled={!importKey}
          >
            {t('importWallet')}
          </Button>
        </Paper>
      </Box>
    );
  }

  if (step === 'backup' && secretKey) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, p: { xs: 2, sm: 3 }, width: '100%' }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            {t('walletCreated')}
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 3 }}>
            {t('saveSecretKey')}
          </Alert>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {t('publicKey')}
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                {publicKey}
              </Typography>
              <IconButton
                onClick={() => copyToClipboard(publicKey || '')}
                size="small"
                color={copied ? 'success' : 'default'}
              >
                {copied ? <CheckIcon /> : <ContentCopyIcon />}
              </IconButton>
            </Box>
            
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {t('secretKey')}
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                {secretKey}
              </Typography>
              <IconButton
                onClick={() => copyToClipboard(secretKey || '')}
                size="small"
                color={copied ? 'success' : 'default'}
              >
                {copied ? <CheckIcon /> : <ContentCopyIcon />}
              </IconButton>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <input
              type="checkbox"
              id="savedCheckbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <label htmlFor="savedCheckbox">
              <Typography variant="body2">
                {t('iHaveSaved')}
              </Typography>
            </label>
          </Box>
          
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => setStep('welcome')}
            fullWidth
            disabled={!saved}
          >
            {t('continueToWallet')}
          </Button>
        </Paper>
      </Box>
    );
  }

  return null;
};

export default WalletSetup;