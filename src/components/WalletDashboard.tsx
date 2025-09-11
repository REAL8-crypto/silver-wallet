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
  Tab
} from '@mui/material';
import {
  Logout as LogoutIcon,
  MoreVert as MoreIcon,
  Send as SendIcon,
  Pool as PoolIcon,
  Settings as SettingsIcon,
  AccountBalanceWallet as WalletIcon,
  CompareArrows as AssetsIcon
} from '@mui/icons-material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../contexts/WalletContext';
import FundingBanner from './FundingBanner';
import SendDialog from './dialogs/SendDialog';
import ReceiveDialog from './dialogs/ReceiveDialog';
import AddAssetDialog from './dialogs/AddAssetDialog';
import JoinPoolDialog from './dialogs/JoinPoolDialog';
import PrivateKeyWarningDialog from './dialogs/PrivateKeyWarningDialog';
import QRCode from 'qrcode';
import Real8Tab from './real8/Real8Tab';
import { REAL8 } from '../constants/real8Asset';

const WalletDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    publicKey,
    secretKey,
    disconnect,
    unfunded,
    networkMode,
    setNetworkMode
  } = useWallet();

  const [tabValue, setTabValue] = useState('real8');
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

  const handleTabChange = (_: React.SyntheticEvent, v: string) => setTabValue(v);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

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

  const isSpanish = i18n.language.startsWith('es');

  // Use 'public' to match WalletContext NetworkMode ('testnet' | 'public')
  const toggleNetwork = () => {
    setNetworkMode(networkMode === 'testnet' ? 'public' : 'testnet');
  };

  // URLs per your instructions
  const helpLink = isSpanish
    ? 'https://real8.org/es/compra-venta-de-real8/'
    : 'https://real8.org/en/buy-real8/';
  const buyDirectLink = isSpanish
    ? 'https://real8.org/es/producto/esp/compra-real8/'
    : 'https://real8.org/en/producto/eng/buy-real8/';
  const contactLink = isSpanish
    ? 'https://real8.org/es/contact/'
    : 'https://real8.org/en/contact/';

  // Safe translation fallback helper
  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  const networkToggleLabel = isSpanish
    ? networkMode === 'testnet'
      ? 'Cambiar a Red Pública'
      : 'Cambiar a Testnet'
    : networkMode === 'testnet'
      ? 'Switch to Public Network'
      : 'Switch to Testnet';

  // Try a brand logo if provided by constants; fallback to brand name
  const logoSrc = (REAL8 as any).LOGO_SRC || (REAL8 as any).LOGO_URL || '';

  return (
    <Box sx={{ mt: 2 }}>
      {unfunded && (
        <FundingBanner
          publicKey={publicKey}
          onCopyAddress={handleCopyAddress}
          copiedAddress={copiedAddress}
          unfunded={unfunded}
        />
      )}

      <Paper
        elevation={4}
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 3
        }}
      >
        {/* Header row with left-aligned logo, right-aligned flags and menu */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={`${REAL8.BRAND_NAME} logo`}
                style={{ height: 28, width: 'auto', display: 'block' }}
              />
            ) : (
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {REAL8.BRAND_NAME}
              </Typography>
            )}
            <Typography variant="h6" sx={{ fontWeight: 600, opacity: 0.85 }}>
              Wallet
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Language flags OUTSIDE the menu, immediately to the left of the menu icon */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 0.5 }}>
            <Tooltip title="Español">
              <IconButton
                size="small"
                onClick={() => i18n.changeLanguage('es')}
                color={isSpanish ? 'primary' : 'default'}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>🇪🇸</span>
              </IconButton>
            </Tooltip>
            <Tooltip title="English">
              <IconButton
                size="small"
                onClick={() => i18n.changeLanguage('en')}
                color={!isSpanish ? 'primary' : 'default'}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>🇺🇸</span>
              </IconButton>
            </Tooltip>
          </Box>

          <Tooltip title={isSpanish ? 'Menú' : 'Menu'}>
            <IconButton onClick={openMenu} size="large">
              <MoreIcon />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={closeMenu}
            MenuListProps={{ dense: false }}
            PaperProps={{
              sx: {
                minWidth: 235,
                '& a': { textDecoration: 'none' }
              }
            }}
          >
            <MenuItem
              component="a"
              href={helpLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
            >
              {tr('help', isSpanish ? 'Ayuda' : 'Help')}
            </MenuItem>
            <MenuItem
              component="a"
              href={contactLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
            >
              {tr('contact', isSpanish ? 'Contacto' : 'Contact')}
            </MenuItem>
            <MenuItem
              component="a"
              href={buyDirectLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
            >
              {tr('buyDirect', isSpanish ? 'Compra Directa' : 'Buy Direct')}
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                toggleNetwork();
                closeMenu();
              }}
            >
              {networkToggleLabel}
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                disconnect();
                closeMenu();
              }}
            >
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              {tr('disconnect', isSpanish ? 'Desconectar' : 'Disconnect Wallet')}
            </MenuItem>
          </Menu>
        </Box>

        {/* Icon-only, responsive tabs with tooltips */}
        <TabContext value={tabValue}>
          <TabList
            onChange={handleTabChange}
            variant="scrollable"
            allowScrollButtonsMobile
            scrollButtons
            sx={{
              mb: 1,
              '.MuiTabs-flexContainer': {
                alignItems: 'center'
              },
              '.MuiTab-root': {
                minHeight: { xs: 56, sm: 64 },
                py: { xs: 0.5, sm: 1 },
                minWidth: { xs: 56, sm: 72 }
              },
              '.MuiTab-root .MuiSvgIcon-root': {
                fontSize: { xs: 24, sm: 30, md: 36 }
              }
            }}
          >
            <Tooltip title={isSpanish ? 'REAL8' : 'REAL8'}>
              <Tab icon={<SendIcon />} value="real8" aria-label="REAL8" />
            </Tooltip>
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

          <TabPanel value="real8" sx={{ px: 0, pt: 2 }}>
            <Real8Tab
              onSend={() => setOpenSend(true)}
              onReceive={() => setOpenReceive(true)}
              onAddTrustline={() => setOpenAddAsset(true)}
            />
          </TabPanel>

          <TabPanel value="wallet" sx={{ px: 0, pt: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              {isSpanish ? 'Resumen de Billetera' : 'Wallet Overview'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isSpanish
                ? 'Contenido pendiente de migración.'
                : 'Content placeholder – migrate existing wallet summary here.'}
            </Typography>
          </TabPanel>

          <TabPanel value="assets" sx={{ px: 0, pt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {isSpanish ? 'Gestión de activos pendiente.' : 'Assets management placeholder.'}
            </Typography>
          </TabPanel>

          <TabPanel value="pools" sx={{ px: 0, pt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {isSpanish
                ? 'Participación en pools en esta sección.'
                : 'Liquidity pool participation will appear here.'}
            </Typography>
          </TabPanel>

          <TabPanel value="settings" sx={{ px: 0, pt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {isSpanish ? 'Configuraciones adicionales aquí.' : 'Additional settings here.'}
            </Typography>
          </TabPanel>
        </TabContext>
      </Paper>

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
