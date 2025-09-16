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
import Real8FeaturedCard from './Real8FeaturedCard';
import MarketPricesGrid from './MarketPricesGrid';
import WalletOverview from './WalletOverview';
import AssetsManager from './tabs/AssetsManager';
import PoolsManager from './PoolsManager';
import SettingsPanel from './SettingsPanel';
// ... any other imports, context, and state setup preserved ...

const WalletDashboard: React.FC = () => {
  // ... dashboard state and logic preserved ...
  const [tabValue, setTabValue] = useState('wallet');
  const [openSend, setOpenSend] = useState(false);
  const [openReceive, setOpenReceive] = useState(false);
  const [openAddAsset, setOpenAddAsset] = useState(false);
  const [openJoinPool, setOpenJoinPool] = useState(false);
  const [openPkWarning, setOpenPkWarning] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrGenerating, setQrGenerating] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const { t, i18n } = useTranslation();
  const { publicKey, secretKey } = useWallet();
  const isSpanish = i18n.language.startsWith('es');

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => setTabValue(newValue);

  // Example QR logic, you may already have this in your implementation
  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 1200);
    }
  };
  const generateQr = () => {
    if (publicKey) {
      setQrGenerating(true);
      QRCode.toDataURL(publicKey)
        .then(url => setQrCodeUrl(url))
        .finally(() => setQrGenerating(false));
    }
  };
  const handleCopySecret = () => {
    if (secretKey) {
      navigator.clipboard.writeText(secretKey);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 1200);
    }
  };

  return (
    <Box>
      {/* Top REAL8 card and market prices grid */}
      <Real8FeaturedCard
        onSend={() => setOpenSend(true)}
        onReceive={() => setOpenReceive(true)}
        onAddTrustline={() => setOpenAddAsset(true)}
      />
      {/* NEW: Market prices grid below featured card */}
      <MarketPricesGrid />

      {/* REMOVE duplicated Real8StatsGrid if present */}
      {/* ... rest of dashboard content preserved ... */}

      {/* Icon tabs and main sections */}
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

        {/* Tab content */}
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
      {/* Dialogs, etc. preserved */}
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
