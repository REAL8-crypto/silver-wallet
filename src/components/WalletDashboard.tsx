import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Paper,
  Tooltip,
  Tab,
  Alert,
  Stack,
  Button,
  TextField
} from '@mui/material';
import {
  Logout as LogoutIcon,
  MoreVert as MoreIcon,
  Pool as PoolIcon,
  Settings as SettingsIcon,
  AccountBalanceWallet as WalletIcon,
  CompareArrows as AssetsIcon
} from '@mui/icons-material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../contexts/WalletContext';
import SendDialog from './dialogs/SendDialog';
import ReceiveDialog from './dialogs/ReceiveDialog';
import AddAssetDialog from './dialogs/AddAssetDialog';
import JoinPoolDialog from './dialogs/JoinPoolDialog';
import PrivateKeyWarningDialog from './dialogs/PrivateKeyWarningDialog';
import QRCode from 'qrcode';
// This is the REAL8 content section with the icon and trustline CTA
import Real8Tab from './real8/Real8Tab';
import MarketPricesGrid from './MarketPricesGrid';
import { Typography as MuiTypography } from '@mui/material';
import real8Logo from '../assets/real8-logo.png';

// Tab components
import WalletOverview from './tabs/WalletOverview';
import AssetsManager from './tabs/AssetsManager';
import PoolsManager from './tabs/PoolsManager';
import SettingsPanel from './tabs/SettingsPanel';

const WalletDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    publicKey,
    secretKey,
    disconnect,
    isTestnet,
    generateWallet,
    importSecret,
    networkMode,
    setNetworkMode
  } = useWallet();

  const [tabValue, setTabValue] = useState('wallet');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [openSend, setOpenSend] = useState(false);
  const [openReceive, setOpenReceive] = useState(false);
  const [openAddAsset, setOpenAddAsset] = useState(false);
  const [openJoinPool, setOpenJoinPool] = useState(false);
  const [openPkWarning, setOpenPkWarning] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrGenerating, setQrGenerating] = useState(false);

  const [importKey, setImportKey] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const isSpanish = i18n.language.startsWith('es');

  const handleTabChange = (_: React.SyntheticEvent, v: string) => setTabValue(v);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const toggleNetwork = () => {
    const newMode = networkMode === 'public' ? 'testnet' : 'public';
    setNetworkMode(newMode);
  };

  const networkToggleLabel = networkMode === 'public' 
    ? (isSpanish ? 'Cambiar a Testnet' : 'Switch to Testnet')
    : (isSpanish ? 'Cambiar a Red Principal' : 'Switch to Public');

  const handleCopyAddress = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 1800);
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

  const generateQr = async () => {
    if (!publicKey) return;
    setQrGenerating(true);
    try {
      const url = await QRCode.toDataURL(publicKey);
      setQrCodeUrl(url);
    } finally {
      setQrGenerating(false);
    }
  };

  const helpLink = isSpanish
    ? 'https://real8.org/es/compra-venta-de-real8/'
    : 'https://real8.org/en/buy-real8/';
  const buyDirectLink = isSpanish
    ? 'https://real8.org/es/producto/esp/compra-real8/'
    : 'https://real8.org/en/producto/eng/buy-real8/';
  const contactLink = isSpanish
    ? 'https://real8.org/es/contact/'
    : 'https://real8.org/en/contact/';

  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  // Header + menu
  return (
    <Box sx={{ mt: 2 }}>
      <Paper
        elevation={4}
        sx={{
          mt: 2,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              component="img"
              src={real8Logo}
              alt="REAL8 logo"
              sx={{ height: { xs: 28, md: 56 }, width: 'auto', display: 'block' }}
            />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 0.5 }}>
            <Tooltip title="Español">
              <IconButton size="small" onClick={() => i18n.changeLanguage('es')} color={isSpanish ? 'primary' : 'default'}>
                <MuiTypography component="span" sx={{ fontSize: { xs: 20, md: 30 }, lineHeight: 1 }}>
                  🇪🇸
                </MuiTypography>
              </IconButton>
            </Tooltip>
            <Tooltip title="English">
              <IconButton size="small" onClick={() => i18n.changeLanguage('en')} color={!isSpanish ? 'primary' : 'default'}>
                <MuiTypography component="span" sx={{ fontSize: { xs: 20, md: 30 }, lineHeight: 1 }}>
                  🇺🇸
                </MuiTypography>
              </IconButton>
            </Tooltip>
          </Box>

          <Tooltip title={isSpanish ? 'Menú' : 'Menu'}>
            <IconButton onClick={openMenu} size="large" aria-label="Open menu">
              <MoreIcon />
            </IconButton>
          </Tooltip>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu} PaperProps={{ sx: { minWidth: 235, '& a': { textDecoration: 'none' } } }}>
            <MenuItem component="a" href={helpLink} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
              {tr('help', isSpanish ? 'Ayuda' : 'Help')}
            </MenuItem>
            <MenuItem component="a" href={contactLink} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
              {tr('contact', isSpanish ? 'Contacto' : 'Contact')}
            </MenuItem>
            <MenuItem component="a" href={buyDirectLink} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
              {tr('buyDirect', isSpanish ? 'Compra Directa' : 'Buy Direct')}
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { toggleNetwork(); closeMenu(); }}>
              {networkToggleLabel}
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { disconnect(); closeMenu(); }}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              {tr('disconnect', isSpanish ? 'Desconectar' : 'Disconnect Wallet')}
            </MenuItem>
          </Menu>
        </Box>

        {/* Inline wallet setup when no public key */}
        {!publicKey && (
          <Box sx={{ mb: 2 }}>
            {isTestnet && <Alert severity="info" sx={{ mb: 2 }}>Testnet Environment</Alert>}
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={600}>
                {t('welcome') || 'REAL8 Wallet'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('createOrImportWallet') || 'Create or import a wallet to get started'}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button variant="contained" onClick={() => generateWallet?.()}> {t('createWallet') || 'Create Wallet'} </Button>
                <TextField
                  label={t('secretKey') || 'Secret Key'}
                  value={importKey}
                  onChange={e => setImportKey(e.target.value)}
                  size="small"
                  placeholder="SA.."
                />
                <Button
                  variant="outlined"
                  onClick={() => {
                    setImportError(null);
                    try {
                      if (!importKey.trim()) throw new Error('Secret key required');
                      importSecret?.(importKey.trim());
                      setImportKey('');
                    } catch (e: any) {
                      setImportError(e?.message || 'Import failed');
                    }
                  }}
                >
                  {t('import') || 'Import'}
                </Button>
              </Stack>
              {importError && <Alert severity="error">{importError}</Alert>}
            </Stack>
          </Box>
        )}

        {/* REAL8 box ABOVE icons; border-only, rounded; no background */}
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            p: { xs: 1.5, sm: 2 },
            mb: { xs: 1.5, sm: 2 },
            backgroundColor: 'transparent'
          }}
        >
          {/* The original REAL8 section with the icon and trustline CTA */}
          <Real8Tab
            onSend={() => setOpenSend(true)}
            onReceive={() => setOpenReceive(true)}
            onAddTrustline={() => setOpenAddAsset(true)}
          />

          {/* Market prices grid section replacing the duplicate stats */}
          <MarketPricesGrid />
        </Box>

        {/* Icon tabs: desktop-only sizing changes and centered with wider margins */}
        <TabContext value={tabValue}>
          <Box
            sx={{
              maxWidth: { xs: '100%', md: 760, lg: 880 },
              mx: 'auto',
              px: { xs: 0.5, sm: 1, md: 6, lg: 8 }
            }}
          >
            <TabList
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                mb: { xs: 0.5, sm: 1 },
                '.MuiTabs-flexContainer': {
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: { xs: 0.5, sm: 0.75, md: 0.75, lg: 1 }
                },
                '.MuiTab-root': {
                  flex: { xs: 1, md: '0 0 auto' },
                  minWidth: { xs: 0, md: 72 },
                  minHeight: { xs: 56, sm: 64, md: 72 },
                  py: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                },
                '.MuiTab-root .MuiSvgIcon-root': {
                  fontSize: { xs: 26, sm: 30, md: 33, lg: 39 }
                }
              }}
            >
              <Tooltip title={isSpanish ? 'Billetera' : 'Wallet'}>
                <Tab icon={<WalletIcon />} value="wallet" aria-label="Wallet" />
              </Tooltip>
              <Tooltip title={isSpanish ? 'Activos' : 'Assets'}>
                <Tab icon={<AssetsIcon />} value="assets" aria-label="Assets" />
              </Tooltip>
              <Tooltip title={isSpanish ? 'Pools' : 'Pools'}>
                <Tab icon={<PoolIcon />} value="pools" aria-label="Pools" />
              </Tooltip>
              <Tooltip title={isSpanish ? 'Ajustes' : 'Settings'}>
                <Tab icon={<SettingsIcon />} value="settings" aria-label="Settings" />
              </Tooltip>
            </TabList>
          </Box>

          {/* Tab content with new components */}
          <TabPanel value="wallet" sx={{ px: 0, pt: 2 }}>
            <WalletOverview />
          </TabPanel>
          <TabPanel value="assets" sx={{ px: 0, pt: 2 }}>
            <AssetsManager />
          </TabPanel>
          <TabPanel value="pools" sx={{ px: 0, pt: 2 }}>
            <PoolsManager />
          </TabPanel>
            <TabPanel value="settings" sx={{ px: 0, pt: 2 }}>
            <SettingsPanel />
          </TabPanel>
        </TabContext>
      </Paper>

      {/* Dialogs remain mounted */}
      <SendDialog open={openSend} onClose={() => setOpenSend(false)} />
      <ReceiveDialog
        open={openReceive}
        onClose={() => setOpenReceive(false)}
        publicKey={publicKey}
        onCopyAddress={handleCopyAddress}
        copiedAddress={copiedAddress}
        qrCodeUrl={qrCodeUrl}
        generateQr={generateQr}
        qrGenerating={qrGenerating}
      />
      <AddAssetDialog open={openAddAsset} onClose={() => setOpenAddAsset(false)} />
      <JoinPoolDialog open={openJoinPool} onClose={() => setOpenJoinPool(false)} />
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

export default WalletDashboard;
