/* Updated with REAL8 dedicated tab */
import React, { useState } from 'react';
import {
  Box, Typography, Button, IconButton, Menu, MenuItem, Divider,
  Paper, Alert, List, ListItem, ListItemText, Tab, Chip
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
  CompareArrows,
  Check as CheckIcon,
  ContentCopy as ContentCopyIcon,
  ShoppingCart as ShoppingCartIcon,
  NetworkCheck as NetworkCheckIcon
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
    networkMode,
    setNetworkMode
  } = useWallet();

  const [tabValue, setTabValue] = useState('real8'); // start on REAL8 for branding
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Dialog states
  const [openSend, setOpenSend] = useState(false);
  const [openReceive, setOpenReceive] = useState(false);
  const [openAddAsset, setOpenAddAsset] = useState(false);
  const [openJoinPool, setOpenJoinPool] = useState(false);
  const [openPkWarning, setOpenPkWarning] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // Copy flags
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // QR code
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrGenerating, setQrGenerating] = useState(false);

  const handleTabChange = (_: React.SyntheticEvent, v: string) => setTabValue(v);
  const changeLanguage = (lng: string) => i18n.changeLanguage(lng);

  const openMenu = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(e.currentTarget);
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

  const handleShowSecret = () => setOpenPkWarning(true);

  const confirmShowSecret = () => {
    setShowPrivateKey(true);
    setOpenPkWarning(false);
    setTimeout(() => setShowPrivateKey(false), 30_000);
  };

  const openReceiveDialog = async () => {
    if (publicKey) {
      setQrGenerating(true);
      try {
        const url = await QRCode.toDataURL(publicKey, {
          width: 200,
          margin: 2
        });
        setQrCodeUrl(url);
      } catch {
        setQrCodeUrl('');
      } finally {
        setQrGenerating(false);
      }
    }
    setOpenReceive(true);
  };

  const handleAddTrustline = () => setOpenAddAsset(true);

  const handleNetworkToggle = () => {
    const newNetworkMode = networkMode === 'testnet' ? 'public' : 'testnet';
    setNetworkMode(newNetworkMode);
  };

  // Filter out REAL8 for generic Assets list (it lives in its own tab now)
  const nonReal8Balances = balances.filter(
    b => b.asset_code !== REAL8.CODE
  );

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 1, sm: 2 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'nowrap'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <img
            src={real8Logo}
            alt="REAL8"
            style={{ height: 44, objectFit: 'contain' }}
          />
          <Chip
            label={networkMode === 'testnet' ? t('testnet') || 'TESTNET' : t('mainnet') || 'MAINNET'}
            size="small"
            color={networkMode === 'testnet' ? 'warning' : 'success'}
            variant="outlined"
            sx={{ fontSize: '0.7rem', fontWeight: 600 }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={() => changeLanguage('es')}
            sx={{ fontSize: '1.5rem', opacity: i18n.language === 'es' ? 1 : 0.5 }}
          >
            🇪🇸
          </IconButton>
          <IconButton
            onClick={() => changeLanguage('en')}
            sx={{ fontSize: '1.5rem', opacity: i18n.language === 'en' ? 1 : 0.5 }}
          >
            🇺🇸
          </IconButton>
          <IconButton onClick={openMenu}>
            <MoreIcon />
          </IconButton>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={closeMenu}>
            <MenuItem
              component="a"
              href={i18n.language === 'en' ? REAL8.BUY_EN : REAL8.BUY_ES}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
            >
              <ShoppingCartIcon fontSize="small" style={{ marginRight: 8 }} />
              {t('buyReal8') || 'Buy REAL8'}
            </MenuItem>
            <MenuItem onClick={() => { handleNetworkToggle(); closeMenu(); }}>
              <NetworkCheckIcon fontSize="small" style={{ marginRight: 8 }} />
              {networkMode === 'testnet' 
                ? (t('switchToMainnet') || 'Switch to Mainnet')
                : (t('switchToTestnet') || 'Switch to Testnet')
              }
            </MenuItem>
            <Divider />
            <MenuItem
              component="a"
              href={
                i18n.language === 'en'
                  ? 'https://real8.org/en/buy-real8/'
                  : 'https://real8.org/es/compra-venta-de-real8/'
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('help')}
            </MenuItem>
            <MenuItem
              component="a"
              href={
                i18n.language === 'en'
                  ? 'https://real8.org/en/contact/'
                  : 'https://real8.org/es/contactar/'
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('contact')}
            </MenuItem>
            <Divider />
            <MenuItem onClick={disconnect}>
              <LogoutIcon fontSize="small" style={{ marginRight: 8 }} />
              {t('disconnect')}
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Global Balance & Actions */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, textAlign: 'center' }}>
        <Typography variant="subtitle2" color="textSecondary">
          {t('totalBalance') || 'Total Balance'}
        </Typography>
        <Typography
          variant="h3"
          sx={{
            fontSize: { xs: '2.3rem', sm: '3.2rem' },
            wordBreak: 'break-word'
          }}
        >
          {nativeBalance} XLM
        </Typography>

        <FundingBanner publicKey={publicKey} unfunded={unfunded} />

        <Box
          sx={{
            mt: 2,
            display: 'flex',
            gap: { xs: 1, sm: 2 },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'center'
          }}
        >
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => setOpenSend(true)}
            disabled={unfunded}
          >
            {t('send') || 'Send'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<SwapIcon />}
            onClick={openReceiveDialog}
          >
            {t('receive') || 'Receive'}
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TabContext value={tabValue}>
          <TabList
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mb: 1,
              '& .MuiTab-root': {
                minHeight: 70,
                minWidth: 80,
                fontSize: { xs: 11, sm: 13 }
              }
            }}
          >
            <Tab
              value="real8"
              icon={
                <img 
                  src={real8Icon} 
                  alt="REAL8" 
                  style={{ width: 30, height: 30, objectFit: 'contain' }} 
                />
              }
              iconPosition="top"
              aria-label="REAL8"
            />
            <Tab
              value="assets"
              icon={<AccountBalanceWallet sx={{ fontSize: 30 }} />}
              iconPosition="top"
              aria-label={t('assets') || 'Assets'}
            />
            <Tab
              value="transactions"
              icon={<CompareArrows sx={{ fontSize: 30 }} />}
              iconPosition="top"
              aria-label={t('transactions') || 'Transactions'}
            />
            <Tab
              value="pools"
              icon={<PoolIcon sx={{ fontSize: 30 }} />}
              iconPosition="top"
              aria-label={t('pools') || 'Pools'}
            />
            <Tab
              value="settings"
              icon={<SettingsIcon sx={{ fontSize: 30 }} />}
              iconPosition="top"
              aria-label={t('settings') || 'Settings'}
            />
          </TabList>

          <TabPanel value="real8" sx={{ px: 0 }}>
            <Real8Tab
              onSend={() => {
                // Preselect REAL8 by opening AddAsset if needed first:
                const hasTrustline = balances.some(
                  b => b.asset_code === REAL8.CODE
                );
                if (!hasTrustline) {
                  setOpenAddAsset(true);
                  return;
                }
                setOpenSend(true);
              }}
              onReceive={openReceiveDialog}
              onAddTrustline={handleAddTrustline}
            />
          </TabPanel>

          <TabPanel value="assets" sx={{ px: 0, pt: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1
              }}
            >
              <Typography variant="h6">
                {t('myAssets') || 'My Assets'}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setOpenAddAsset(true)}
                disabled={unfunded}
              >
                {t('addAsset') || 'Add Asset'}
              </Button>
            </Box>
            <List dense>
              {nonReal8Balances.map((b, i) => {
                const isNative =
                  b.asset_type === 'native' || b.asset_code === 'XLM';
                const code = isNative ? 'XLM' : b.asset_code || '—';
                return (
                  <React.Fragment
                    key={`${code}-${b.asset_issuer || 'native'}-${i}`}
                  >
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            {isNative ? (
                              <img
                                src="https://s3.amazonaws.com/cdn.coindisco.com/currencies/logo/xlm_stellar.png"
                                alt="XLM"
                                width={22}
                                height={22}
                                onError={e => {
                                  (e.currentTarget as HTMLImageElement).style.display =
                                    'none';
                                }}
                              />
                            ) : code === REAL8.CODE ? (
                              <img
                                src={real8Icon}
                                alt="REAL8"
                                width={22}
                                height={22}
                                onError={e => {
                                  (e.currentTarget as HTMLImageElement).style.display =
                                    'none';
                                }}
                              />
                            ) : null}
                            <Typography variant="body2">
                              {isNative ? 'Stellar Lumens (XLM)' : code}
                            </Typography>
                          </Box>
                        }
                        secondary={`${b.balance} ${code}`}
                      />
                    </ListItem>
                    {i < nonReal8Balances.length - 1 && (
                      <Divider component="li" />
                    )}
                  </React.Fragment>
                );
              })}
              {nonReal8Balances.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {unfunded
                    ? 'Account unfunded – fund to see balances.'
                    : 'No balances found.'}
                </Alert>
              )}
            </List>
          </TabPanel>

          <TabPanel value="transactions">
            <Typography variant="h6" gutterBottom>
              {t('recentTransactions') || 'Recent Transactions'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {t('noTransactions') || 'No transactions yet.'}
            </Typography>
          </TabPanel>

          <TabPanel value="pools">
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1
              }}
            >
              <Typography variant="h6">
                {t('liquidityPools') || 'Liquidity Pools'}
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenJoinPool(true)}
                disabled={unfunded}
              >
                {t('joinPool') || 'Join Pool'}
              </Button>
            </Box>
            <Alert severity="info">
              {t('noLiquidityPools') || 'No pools joined yet.'}
            </Alert>
          </TabPanel>

          <TabPanel value="settings">
            <Typography variant="h6" gutterBottom>
              {t('settings') || 'Settings'}
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              {t('publicKey') || 'Public Key'}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 2,
                gap: 1,
                flexDirection: { xs: 'column', sm: 'row' }
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  flex: 1
                }}
              >
                {publicKey}
              </Typography>
              <IconButton onClick={handleCopyAddress} size="small">
                {copiedAddress ? <CheckIcon /> : <ContentCopyIcon />}
              </IconButton>
            </Box>

            <Box
              sx={{
                p: 2,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                bgcolor: '#fafafa',
                mb: 2
              }}
            >
              <Typography variant="subtitle2" gutterBottom color="error">
                {t('privateKey') || 'Private Key'}
              </Typography>
              {!showPrivateKey ? (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={handleShowSecret}
                >
                  {t('showPrivateKey') || 'Show Private Key'}
                </Button>
              ) : (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      p: 1,
                      bgcolor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: 1,
                      mb: 1
                    }}
                  >
                    {secretKey ||
                      localStorage.getItem('WALLET_SECRET') ||
                      localStorage.getItem('stellar_secret_key') ||
                      '—'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={
                        copiedSecret ? <CheckIcon /> : <ContentCopyIcon />
                      }
                      onClick={handleCopySecret}
                    >
                      {copiedSecret
                        ? t('copied') || 'Copied'
                        : t('copyPrivateKey') || 'Copy'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setShowPrivateKey(false)}
                    >
                      {t('hidePrivateKey') || 'Hide'}
                    </Button>
                  </Box>
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ display: 'block', mt: 1 }}
                  >
                    ⚠ {t('autoHideWarning') || 'Will auto-hide after timeout.'}
                  </Typography>
                </Box>
              )}
            </Box>

            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={disconnect}
            >
              {t('disconnect') || 'Disconnect'}
            </Button>
          </TabPanel>
        </TabContext>
      </Paper>

      {/* Dialogs */}
      <SendDialog
        open={openSend}
        onClose={() => setOpenSend(false)}
        defaultIssuer={REAL8.ISSUER}
      />
      <ReceiveDialog
        open={openReceive}
        onClose={() => setOpenReceive(false)}
        publicKey={publicKey}
        qrCodeUrl={qrCodeUrl}
        onCopy={handleCopyAddress}
        copied={copiedAddress}
        generating={qrGenerating}
      />
      <AddAssetDialog
        open={openAddAsset}
        onClose={() => setOpenAddAsset(false)}
        defaultAssetCode={REAL8.CODE}
        defaultIssuer={REAL8.ISSUER}
      />
      <JoinPoolDialog
        open={openJoinPool}
        onClose={() => setOpenJoinPool(false)}
        defaultIssuer={REAL8.ISSUER}
      />
      <PrivateKeyWarningDialog
        open={openPkWarning}
        onCancel={() => setOpenPkWarning(false)}
        onConfirm={confirmShowSecret}
      />
    </Box>
  );
};

export default WalletDashboard;