import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Stack,
  Button,
  Divider,
  Chip,
  Alert,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../contexts/WalletContext';
import { 
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  Hub as NetworkIcon,
  Notifications as NotificationsIcon,
  Backup as BackupIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import PrivateKeyWarningDialog from '../dialogs/PrivateKeyWarningDialog';

const SettingsPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { publicKey, secretKey, networkMode, setNetworkMode, disconnect } = useWallet();
  const isSpanish = i18n.language.startsWith('es');
  
  // Local settings state (in real app these might be stored in localStorage/context)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showBalanceOnStartup, setShowBalanceOnStartup] = useState(true);
  const [confirmTransactions, setConfirmTransactions] = useState(true);
  const [backupReminder, setBackupReminder] = useState(true);

  // Private key viewing state
  const [openPkWarning, setOpenPkWarning] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // simple gating: only enable export if a secret is available locally
  const hasSecret = Boolean(
    secretKey ||
    localStorage.getItem('WALLET_SECRET') ||
    localStorage.getItem('stellar_secret_key')
  );

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleNetworkChange = (newNetwork: 'public' | 'testnet') => {
    setNetworkMode(newNetwork);
  };

  const handleExportSettings = () => {
    const settings = {
      language: i18n.language,
      networkMode,
      notificationsEnabled,
      autoRefresh,
      showBalanceOnStartup,
      confirmTransactions,
      backupReminder,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wallet-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySecret = () => {
    const localSecret =
      secretKey ||
      localStorage.getItem('WALLET_SECRET') ||
      localStorage.getItem('stellar_secret_key');
    if (!localSecret) return;
    navigator.clipboard.writeText(localSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 1800);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        {isSpanish ? 'Configuración' : 'Settings'}
      </Typography>

      <Stack spacing={3}>
        {/* Network Settings */}
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <NetworkIcon color="primary" />
            <Typography variant="h6">
              {isSpanish ? 'Configuración de Red' : 'Network Settings'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '250px' } }}>
              <FormControl fullWidth size="small">
                <InputLabel>{isSpanish ? 'Red Stellar' : 'Stellar Network'}</InputLabel>
                <Select
                  value={networkMode}
                  label={isSpanish ? 'Red Stellar' : 'Stellar Network'}
                  onChange={(e) => handleNetworkChange(e.target.value as 'public' | 'testnet')}
                >
                  <MenuItem value="public">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="MAINNET" size="small" color="success" />
                      <span>{isSpanish ? 'Red Principal' : 'Public Network'}</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="testnet">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="TESTNET" size="small" color="warning" />
                      <span>{isSpanish ? 'Red de Prueba' : 'Test Network'}</span>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {networkMode === 'public' 
                  ? (isSpanish ? 'Usando la red principal de Stellar con activos reales.' : 'Using Stellar mainnet with real assets.')
                  : (isSpanish ? 'Usando la red de prueba de Stellar con activos de prueba.' : 'Using Stellar testnet with test assets.')
                }
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Language Settings */}
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LanguageIcon color="primary" />
            <Typography variant="h6">
              {isSpanish ? 'Idioma' : 'Language'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '250px' } }}>
              <FormControl fullWidth size="small">
                <InputLabel>{isSpanish ? 'Seleccionar Idioma' : 'Select Language'}</InputLabel>
                <Select
                  value={i18n.language}
                  label={isSpanish ? 'Seleccionar Idioma' : 'Select Language'}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                >
                  <MenuItem value="en">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>🇺🇸</span>
                      <span>English</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="es">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>🇪🇸</span>
                      <span>Español</span>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Paper>

        {/* Security Settings */}
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SecurityIcon color="primary" />
            <Typography variant="h6">
              {isSpanish ? 'Seguridad' : 'Security'}
            </Typography>
          </Box>
          
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch 
                  checked={confirmTransactions} 
                  onChange={(e) => setConfirmTransactions(e.target.checked)}
                />
              }
              label={isSpanish ? 'Confirmar todas las transacciones' : 'Confirm all transactions'}
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={backupReminder} 
                  onChange={(e) => setBackupReminder(e.target.checked)}
                />
              }
              label={isSpanish ? 'Recordatorios de respaldo' : 'Backup reminders'}
            />
            
            <Divider />
            
            <Box>
              <Typography variant="body1" gutterBottom>
                {isSpanish ? 'Gestión de Billetera' : 'Wallet Management'}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<BackupIcon />}
                  onClick={() => setOpenPkWarning(true)}
                  disabled={!hasSecret}
                >
                  {isSpanish ? 'Exportar Clave Privada' : 'Export Private Key'}
                </Button>
                <Button variant="outlined" size="small" color="error" onClick={disconnect}>
                  {isSpanish ? 'Desconectar Billetera' : 'Disconnect Wallet'}
                </Button>
              </Stack>
              {!hasSecret && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {isSpanish
                    ? 'Clave privada no disponible (billetera sólo-lectura o respaldada externamente).'
                    : 'Private key not available (watch-only or externally backed wallet).'
                  }
                </Typography>
              )}
            </Box>
          </Stack>
        </Paper>

        {/* App Preferences */}
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h6">
              {isSpanish ? 'Preferencias de la Aplicación' : 'App Preferences'}
            </Typography>
          </Box>
          
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch 
                  checked={notificationsEnabled} 
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                />
              }
              label={isSpanish ? 'Habilitar notificaciones' : 'Enable notifications'}
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={autoRefresh} 
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label={isSpanish ? 'Actualización automática de balance' : 'Auto-refresh balance'}
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={showBalanceOnStartup} 
                  onChange={(e) => setShowBalanceOnStartup(e.target.checked)}
                />
              }
              label={isSpanish ? 'Mostrar balance al iniciar' : 'Show balance on startup'}
            />
          </Stack>
        </Paper>

        {/* Wallet Info */}
        {publicKey && (
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <InfoIcon color="primary" />
              <Typography variant="h6">
                {isSpanish ? 'Información de la Billetera' : 'Wallet Information'}
              </Typography>
            </Box>
            
            <Stack spacing={2}>
              <TextField
                label={isSpanish ? 'Clave Pública' : 'Public Key'}
                value={publicKey}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
                helperText={isSpanish ? 'Esta es tu dirección para recibir pagos' : 'This is your address for receiving payments'}
              />
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {isSpanish ? 'Red:' : 'Network:'} 
                    <Chip 
                      label={networkMode.toUpperCase()} 
                      size="small" 
                      color={networkMode === 'public' ? 'success' : 'warning'}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {isSpanish ? 'Estado:' : 'Status:'} 
                    <Chip 
                      label={isSpanish ? 'Conectado' : 'Connected'} 
                      size="small" 
                      color="success"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Paper>
        )}

        {/* Export/Import Settings */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {isSpanish ? 'Respaldo de Configuración' : 'Settings Backup'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isSpanish ? 'Exporta o importa la configuración de tu billetera.' : 'Export or import your wallet settings.'}
          </Typography>
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="outlined" onClick={handleExportSettings}>
              {isSpanish ? 'Exportar Configuración' : 'Export Settings'}
            </Button>
            <Button variant="outlined" disabled>
              {isSpanish ? 'Importar Configuración' : 'Import Settings'}
            </Button>
          </Stack>
        </Paper>

        {/* About */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {isSpanish ? 'Acerca de' : 'About'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {isSpanish ? 'Versión:' : 'Version:'} <strong>2.2.6</strong>
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {isSpanish ? 'Última actualización:' : 'Last updated:'} <strong>{new Date().toLocaleDateString()}</strong>
              </Typography>
            </Box>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              {isSpanish 
                ? 'Billetera REAL8 - Activos digitales de la Red Stellar.'
                : 'REAL8 Wallet - Stellar-based digital assets.'
              }
            </Typography>
          </Alert>
        </Paper>
      </Stack>

      {/* Private key warning dialog */}
      <PrivateKeyWarningDialog
        open={openPkWarning}
        onClose={() => setOpenPkWarning(false)}
        secretKey={
          secretKey ||
          localStorage.getItem('WALLET_SECRET') ||
          localStorage.getItem('stellar_secret_key') ||
          ''
        }
        showPrivateKey={showPrivateKey}
        setShowPrivateKey={setShowPrivateKey}
        onCopySecret={handleCopySecret}
        copiedSecret={copiedSecret}
      />
    </Box>
  );
};

export default SettingsPanel;
