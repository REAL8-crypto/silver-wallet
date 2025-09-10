import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Paper,
  Alert,
  Tab,
  Chip,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Logout as LogoutIcon,
  MoreVert as MoreIcon,
  Send as SendIcon,
  SwapHoriz as SwapIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Pool as PoolIcon,
  AccountBalanceWallet,
  CompareArrows
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
import real8Logo from '../assets/real8-logo.png';
import real8Icon from '../assets/real8-icon.png';
import QRCode from 'qrcode';
import Real8Tab from './real8/Real8Tab';
import { REAL8 } from '../constants/real8Asset';

const WalletDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    publicKey,
    secretKey,
    balance: nativeBalance,
    balances,
    disconnect,
    unfunded,
    isTestnet,
    networkMode,
    setNetworkMode
  } = useWallet();

  const [tabValue, setTabValue] = useState('real8'); // focus branding first
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
  const buyLabel = isSpanish ? REAL8.BUY_ES : REAL8.BUY_EN;
  const networkToggleLabel = isSpanish
    ? networkMode === 'testnet'
      ? 'Cambiar a Mainnet'
      : 'Cambiar a Testnet'
    : networkMode === 'testnet'
      ? 'Switch to Mainnet'
      : 'Switch to Testnet';

  const toggleNetwork = () =>
    setNetworkMode(networkMode === 'testnet' ? 'public' : 'testnet');

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1300, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img
            src={real8Logo}
            alt="REAL8"
            height={34}
            style={{ objectFit: 'contain', display: 'block' }}
          />
          {networkMode === 'testnet' && (
            <Chip
              label="TESTNET"
              color="warning"
              size="small"
              sx={{ ml: 1, fontWeight: 600 }}
            />
          )}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={openMenu} aria-label="Menu">
          <MoreIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={!!anchorEl}
          onClose={closeMenu}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem
            onClick={() => {
              window.open(isSpanish ? REAL8.BUY_ES : REAL8.BUY_EN, '_blank', 'noopener');
              closeMenu();
            }}
          >
            {buyLabel}
          </MenuItem>
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
            <LogoutIcon fontSize="small" style={{ marginRight: 8 }} />
            {isSpanish ? 'Cerrar Sesión' : 'Logout'}
          </MenuItem>
        </Menu>
      </Stack>

      {unfunded && (
        <FundingBanner
          onCopy={handleCopyAddress}
          copied={copiedAddress}
          publicKey={publicKey}
        />
      )}

      <Paper
        elevation={3}
        sx={{
          p: 1.5,
          mb: 3,
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        <TabContext value={tabValue}>
          <TabList
            onChange={handleTabChange}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                minHeight: 48,
                minWidth: 44,
                padding: '6px 10px'
              }
            }}
          >
            <Tab
              icon={<img src={real8Icon} alt="REAL8" width={22} height={22} style={{ objectFit: 'contain' }} />}
              value="real8"
              aria-label="REAL8"
            />
            <Tab
              icon={<AccountBalanceWallet fontSize="small" />}
              value="wallet"
              aria-label={isSpanish ? 'Billetera' : 'Wallet'}
            />
            <Tab
              icon={<SendIcon fontSize="small" />}
              value="send"
              aria-label={isSpanish ? 'Enviar' : 'Send'}
            />
            <Tab
              icon={<AddIcon fontSize="small" />}
              value="assets"
              aria-label={isSpanish ? 'Activos' : 'Assets'}
            />
            <Tab
              icon={<PoolIcon fontSize="small" />}
              value="pools"
              aria-label={isSpanish ? 'Pools' : 'Pools'}
            />
            <Tab
              icon={<SettingsIcon fontSize="small" />}
              value="settings"
              aria-label={isSpanish ? 'Configuración' : 'Settings'}
            />
          </TabList>

          <TabPanel value="real8" sx={{ px: 0, pt: 2 }}>
            <Real8Tab
              onSend={() => setOpenSend(true)}
              onReceive={() => setOpenReceive(true)}
              onAddTrustline={() => setOpenAddAsset(true)}
            />
          </TabPanel>

          <TabPanel value="wallet" sx={{ px: 0, pt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {isSpanish ? 'Resumen de Billetera' : 'Wallet Overview'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isSpanish
                ? 'Contenido pendiente de migración.'
                : 'Content placeholder – migrate existing wallet summary here.'}
            </Typography>
          </TabPanel>

          <TabPanel value="send" sx={{ px: 0, pt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {isSpanish
                ? 'Usa la acción Enviar (icono) o abre el diálogo.'
                : 'Use the Send icon action or open the dialog.'}
            </Typography>
          </TabPanel>

          <TabPanel value="assets" sx={{ px: 0, pt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {isSpanish
                ? 'Gestión de activos pendiente.'
                : 'Assets management placeholder.'}
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
                {isSpanish
                  ? 'Configuraciones adicionales aquí.'
                  : 'Additional settings here.'}
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
