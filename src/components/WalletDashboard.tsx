import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Logout as LogoutIcon,
  Wallet as WalletIcon,
  MoreVert as MoreIcon,
  Language as LanguageIcon,
  Send as SendIcon,
  SwapHoriz as SwapIcon,
  AccountBalance as BalanceIcon,
  Receipt as ReceiptIcon,
  Pool as PoolIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Check as CheckIcon,
  ContentCopy as ContentCopyIcon,
  AccountBalanceWallet,
  CompareArrows
} from '@mui/icons-material';
import { useWallet } from '../contexts/WalletContext';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import real8Logo from '../assets/real8-logo.png';
import real8Icon from '../assets/real8-icon.png';

// Placeholder components for tabs
const TabPanel = ({ children, value, index }: any) => (
  <div hidden={value !== index}>{value === index && children}</div>
);

const TabContext = React.createContext({});

const WalletDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { 
    publicKey, 
    balance,
    balances,
    disconnect, 
    addTrustline, 
    sendPayment, 
    joinLiquidityPool,
    loading,
    error: walletError
  } = useWallet();
  
  const [activeTab, setActiveTab] = useState('assets');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showPrivateKeyDialog, setShowPrivateKeyDialog] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKeyCopied, setPrivateKeyCopied] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showAddAssetDialog, setShowAddAssetDialog] = useState(false);
  const [showPoolDialog, setShowPoolDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendForm, setSendForm] = useState({
    destination: '',
    amount: '',
    asset: 'XLM',
    memo: ''
  });
  const [trustlineForm, setTrustlineForm] = useState({
    assetCode: 'REAL8',
    issuer: 'GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD'
  });
  const [poolForm, setPoolForm] = useState({
    assetA: 'XLM',
    assetB: 'REAL8',
    amountA: '',
    amountB: ''
  });
  const [error, setError] = useState('');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPrivateKey = () => {
    const secretKey = localStorage.getItem('stellar_secret_key');
    if (secretKey) {
      navigator.clipboard.writeText(secretKey);
      setPrivateKeyCopied(true);
      setTimeout(() => setPrivateKeyCopied(false), 2000);
    }
  };

  const handleShowPrivateKey = () => {
    setShowPrivateKeyDialog(true);
  };

  const confirmShowPrivateKey = () => {
    setShowPrivateKey(true);
    setShowPrivateKeyDialog(false);
    // Auto-hide after 30 seconds
    setTimeout(() => {
      setShowPrivateKey(false);
    }, 30000);
  };

  const handleSend = async () => {
    if (!sendForm.destination || !sendForm.amount) {
      setError(t('fillAllFields') || 'Please fill in all fields');
      return;
    }
    
    try {
      await sendPayment(
        sendForm.destination,
        sendForm.amount,
        sendForm.asset,
        sendForm.asset === 'XLM' ? undefined : trustlineForm.issuer
      );
      setShowSendDialog(false);
      setSendForm({ destination: '', amount: '', asset: 'XLM', memo: '' });
      setError('');
    } catch (err) {
      console.error('Error sending payment:', err);
      setError(t('error.sendingPayment') || 'Error sending payment');
    }
  };

  const handleAddTrustline = async () => {
    if (!trustlineForm.assetCode || !trustlineForm.issuer) {
      setError(t('fillAllFields') || 'Please fill in all fields');
      return;
    }
    // Check if user has enough XLM for trustline (2 XLM minimum)
    const nativeBalanceItem = balances.find(b => b.asset_code === 'XLM');
    const currentBalance = nativeBalanceItem ? parseFloat(nativeBalanceItem.balance) : 0;
    if (currentBalance < 2) {
      setError(t('trustlineRequirement') || 'You need at least 2 XLM to add a trustline');
      return;
    }
    
    try {
      await addTrustline(trustlineForm.assetCode, trustlineForm.issuer);
      setShowAddAssetDialog(false);
      setTrustlineForm({ assetCode: 'REAL8', issuer: 'GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD' });
      setError('');
    } catch (err) {
      console.error('Error adding trustline:', err);
      setError(t('error.addingTrustline') || 'Error adding trustline');
    }
  };

  const handleJoinPool = async () => {
    if (!poolForm.amountA || !poolForm.amountB) {
      setError(t('fillAllFields') || 'Please fill in all fields');
      return;
    }
    
    try {
      await joinLiquidityPool(
        poolForm.assetA,
        poolForm.assetB,
        poolForm.amountA,
        poolForm.amountB
      );
      setShowPoolDialog(false);
      setPoolForm({
        assetA: 'XLM',
        assetB: 'REAL8',
        amountA: '',
        amountB: ''
      });
      setError('');
    } catch (err) {
      console.error('Error joining pool:', err);
      setError(t('error.joiningPool') || 'Error joining liquidity pool');
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Generate QR code when dialog opens
  React.useEffect(() => {
    const generateQRCode = async () => {
      if (publicKey) {
        try {
          const qrUrl = await QRCode.toDataURL(publicKey, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(qrUrl);
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
    };

    if (showReceiveDialog && publicKey) {
      generateQRCode();
    }
  }, [showReceiveDialog, publicKey]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      maxWidth: 800, 
      mx: 'auto', 
      p: { xs: 1, sm: 2 },
      width: '100%',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'nowrap',
        minWidth: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
          <img 
            src={real8Logo} 
            alt="REAL8" 
            style={{ 
              height: 40, 
              marginRight: 8,
              maxWidth: '200px',
              objectFit: 'contain'
            }} 
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Language Flags */}
          <IconButton 
            onClick={() => changeLanguage('es')}
            sx={{ 
              fontSize: '1.5rem',
              opacity: i18n.language === 'es' ? 1 : 0.6,
              '&:hover': { opacity: 1 }
            }}
          >
            🇪🇸
          </IconButton>
          <IconButton 
            onClick={() => changeLanguage('en')}
            sx={{ 
              fontSize: '1.5rem',
              opacity: i18n.language === 'en' ? 1 : 0.6,
              '&:hover': { opacity: 1 }
            }}
          >
            🇺🇸
          </IconButton>
          
          {/* Menu */}
          <IconButton onClick={handleMenuOpen} color="inherit">
            <MoreIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem 
              component="a" 
              href={i18n.language === 'en' ? "https://real8.org/en/buy-real8/" : "https://real8.org/es/compra-venta-de-real8/"} 
              target="_blank"
            >
              {t('help')}
            </MenuItem>
            <MenuItem 
              component="a" 
              href={i18n.language === 'en' ? "https://real8.org/en/contact/" : "https://real8.org/es/contactar/"} 
              target="_blank"
            >
              {t('contact')}
            </MenuItem>
            <MenuItem 
              component="a" 
              href={i18n.language === 'en' ? "https://real8.org/en/producto/eng/buy-real8/" : "https://real8.org/es/producto/esp/compra-real8/"} 
              target="_blank"
            >
              {t('buyDirect')}
            </MenuItem>
            <Divider />
            <MenuItem onClick={disconnect}>
              <LogoutIcon sx={{ mr: 1 }} />
              {t('disconnect')}
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Balance Card */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, textAlign: 'center' }}>
        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
          {t('totalBalance')}
        </Typography>
        <Typography variant="h3" gutterBottom sx={{ 
          wordBreak: 'break-word',
          fontSize: { xs: '2rem', sm: '3rem' }
        }}>
          {balance} XLM
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: { xs: 1, sm: 2 }, 
          mt: 2,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center'
        }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={() => setShowSendDialog(true)}
            sx={{ 
              minWidth: { sm: 120 },
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            {t('send')}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<SwapIcon />}
            onClick={() => setShowReceiveDialog(true)}
            sx={{ 
              minWidth: { sm: 120 },
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            {t('receive')}
          </Button>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{
            '& .MuiTab-root': {
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minWidth: { xs: 'auto', sm: 160 },
              padding: { xs: '6px 8px', sm: '12px 16px' }
            }
          }}
        >
          <Tab 
            icon={<AccountBalanceWallet sx={{ fontSize: { xs: 30, sm: 40 } }} />} 
            value="assets"
            iconPosition="top"
          />
          <Tab 
            icon={<CompareArrows sx={{ fontSize: { xs: 30, sm: 40 } }} />} 
            value="transactions"
            iconPosition="top"
          />
          <Tab 
            icon={<PoolIcon sx={{ fontSize: { xs: 30, sm: 40 } }} />} 
            value="pools"
            iconPosition="top"
          />
          <Tab 
            icon={<SettingsIcon sx={{ fontSize: { xs: 30, sm: 40 } }} />} 
            value="settings"
            iconPosition="top"
          />
        </Tabs>
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
          {activeTab === 'assets' && (
            <Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                mb: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 0 },
                alignItems: { xs: 'stretch', sm: 'center' }
              }}>
                <Typography variant="h6">{t('myAssets')}</Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setShowAddAssetDialog(true)}
                  variant="outlined"
                  sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}
                >
                  {t('addAsset')}
                </Button>
              </Box>
              
              <List>
                {balances.map((balanceItem, index) => (
                  <React.Fragment key={`${balanceItem.asset_code}-${balanceItem.asset_issuer || 'native'}`}>
                    <ListItem>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {balanceItem.asset_code === 'XLM' ? (
                              <img 
                                src="https://s3.amazonaws.com/cdn.coindisco.com/currencies/logo/xlm_stellar.png" 
                                alt="XLM" 
                                style={{ width: 24, height: 24 }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : balanceItem.asset_code === 'REAL8' ? (
                              <img 
                                src={real8Icon} 
                                alt="REAL8" 
                                style={{ width: 24, height: 24 }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : null}
                            {balanceItem.asset_code === 'XLM' 
                              ? 'Stellar Lumens (XLM)' 
                              : `${balanceItem.asset_code}`
                            }
                          </Box>
                        }
                        secondary={`${balanceItem.balance} ${balanceItem.asset_code}`} 
                      />
                    </ListItem>
                    {index < balances.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}
          {activeTab === 'transactions' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('recentTransactions')}
              </Typography>
              <Typography color="textSecondary">
                {t('noTransactions')}
              </Typography>
            </Box>
          )}
          {activeTab === 'pools' && (
            <Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                mb: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 0 },
                alignItems: { xs: 'stretch', sm: 'center' }
              }}>
                <Typography variant="h6">{t('liquidityPools')}</Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setShowPoolDialog(true)}
                  sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}
                >
                  {t('joinPool')}
                </Button>
              </Box>
              <Typography color="textSecondary">
                {t('noLiquidityPools')}
              </Typography>
            </Box>
          )}
          {activeTab === 'settings' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('settings')}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                {t('publicKey')}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1
              }}>
                <Typography variant="body2" sx={{ 
                  fontFamily: 'monospace', 
                  wordBreak: 'break-all',
                  flex: 1,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}>
                  {publicKey}
                </Typography>
                <IconButton onClick={() => copyToClipboard(publicKey || '')} size="small">
                  {copied ? <CheckIcon /> : <ContentCopyIcon />}
                </IconButton>
              </Box>
              
              {/* Private Key Section */}
              <Box sx={{ mt: 4, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fafafa' }}>
                <Typography variant="subtitle1" gutterBottom color="error">
                  {t('privateKey')}
                </Typography>
                
                {!showPrivateKey ? (
                  <Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {t('privateKeySecurelyStored')}
                    </Typography>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={handleShowPrivateKey}
                      startIcon={<SettingsIcon />}
                    >
                      {t('showPrivateKey')}
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" sx={{ 
                      fontFamily: 'monospace', 
                      wordBreak: 'break-all',
                      p: 2,
                      bgcolor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: 1,
                      mb: 2,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}>
                      {localStorage.getItem('stellar_secret_key')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={privateKeyCopied ? <CheckIcon /> : <ContentCopyIcon />}
                        onClick={copyPrivateKey}
                      >
                        {privateKeyCopied ? t('copied') : t('copyPrivateKey')}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setShowPrivateKey(false)}
                      >
                        {t('hidePrivateKey')}
                      </Button>
                    </Box>
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                      ⚠️ {t('autoHideWarning')}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={disconnect}
                sx={{ mt: 2 }}
              >
                {t('disconnect')}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onClose={() => setShowSendDialog(false)}>
        <DialogTitle>{t('send')}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            margin="dense"
            label={t('destination')}
            fullWidth
            value={sendForm.destination}
            onChange={(e) => setSendForm({...sendForm, destination: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label={t('amount')}
            type="number"
            fullWidth
            value={sendForm.amount}
            onChange={(e) => setSendForm({...sendForm, amount: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label={t('asset')}
            select
            fullWidth
            value={sendForm.asset}
            onChange={(e) => setSendForm({...sendForm, asset: e.target.value})}
            SelectProps={{ native: true }}
            sx={{ mb: 2 }}
          >
            <option value="XLM">XLM</option>
            <option value="REAL8">REAL8</option>
          </TextField>
          {sendForm.asset === 'REAL8' && (
            <TextField
              margin="dense"
              label={t('issuer')}
              fullWidth
              value={trustlineForm.issuer}
              onChange={(e) => setTrustlineForm({...trustlineForm, issuer: e.target.value})}
              sx={{ mb: 2 }}
              placeholder="Enter REAL8 issuer address"
            />
          )}
          <TextField
            margin="dense"
            label={t('memo')}
            fullWidth
            value={sendForm.memo}
            onChange={(e) => setSendForm({...sendForm, memo: e.target.value})}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSendDialog(false)}>{t('cancel')}</Button>
          <Button onClick={handleSend} variant="contained" color="primary">
            {t('send')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={showReceiveDialog} onClose={() => setShowReceiveDialog(false)}>
        <DialogTitle>{t('receive')}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            {t('shareThisAddress')}
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {publicKey}
            </Typography>
            <Button
              variant="outlined"
              startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
              onClick={() => copyToClipboard(publicKey || '')}
              sx={{ mt: 2 }}
            >
              {copied ? t('copied') : t('copyToClipboard')}
            </Button>
          </Box>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
            {t('scanQrCode')}
          </Typography>
          {/* QR Code */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            {qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                style={{ 
                  width: 200, 
                  height: 200, 
                  border: '1px solid #ddd',
                  borderRadius: 8
                }} 
              />
            ) : (
              <Box sx={{ width: 200, height: 200, bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="textSecondary">Generating QR Code...</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReceiveDialog(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Add Asset Dialog */}
      <Dialog open={showAddAssetDialog} onClose={() => setShowAddAssetDialog(false)}>
        <DialogTitle>{t('addTrustline')}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {/* Balance Warning */}
          {parseFloat(balance) < 2 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {t('insufficientBalance')}
              </Typography>
              <Typography variant="body2">
                {t('trustlineRequirement')}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {t('currentBalance')}: {balance} XLM
              </Typography>
            </Alert>
          )}
          
          <TextField
            margin="dense"
            label={t('assetCode')}
            fullWidth
            value={trustlineForm.assetCode}
            onChange={(e) => setTrustlineForm({...trustlineForm, assetCode: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label={t('issuer')}
            fullWidth
            value={trustlineForm.issuer}
            onChange={(e) => setTrustlineForm({...trustlineForm, issuer: e.target.value})}
            placeholder="Enter the asset issuer's public key"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddAssetDialog(false)}>{t('cancel')}</Button>
          <Button 
            onClick={handleAddTrustline} 
            variant="contained" 
            color="primary"
            disabled={parseFloat(balance) < 2}
          >
            {t('add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Join Pool Dialog */}
      <Dialog open={showPoolDialog} onClose={() => setShowPoolDialog(false)}>
        <DialogTitle>{t('joinPool')}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {/* Available Balances */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>{t('availableBalances')}:</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <img 
                  src="https://s3.amazonaws.com/cdn.coindisco.com/currencies/logo/xlm_stellar.png" 
                  alt="XLM" 
                  style={{ width: 20, height: 20 }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <Typography variant="body2">XLM: {balance}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <img 
                  src={real8Icon} 
                  alt="REAL8" 
                  style={{ width: 20, height: 20 }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <Typography variant="body2">REAL8: 0.00</Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>{t('assetPair')}</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                select
                value={poolForm.assetA}
                onChange={(e) => setPoolForm({...poolForm, assetA: e.target.value})}
                SelectProps={{ native: true }}
                fullWidth
              >
                <option value="XLM">XLM</option>
                <option value="REAL8">REAL8</option>
              </TextField>
              <TextField
                select
                value={poolForm.assetB}
                onChange={(e) => setPoolForm({...poolForm, assetB: e.target.value})}
                SelectProps={{ native: true }}
                fullWidth
              >
                <option value="REAL8">REAL8</option>
                <option value="XLM">XLM</option>
              </TextField>
            </Box>
            <TextField
              margin="dense"
              label={`${t('amount')} (${poolForm.assetA})`}
              type="number"
              fullWidth
              value={poolForm.amountA}
              onChange={(e) => setPoolForm({...poolForm, amountA: e.target.value})}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label={`${t('amount')} (${poolForm.assetB})`}
              type="number"
              fullWidth
              value={poolForm.amountB}
              onChange={(e) => setPoolForm({...poolForm, amountB: e.target.value})}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPoolDialog(false)}>{t('cancel')}</Button>
          <Button onClick={handleJoinPool} variant="contained" color="primary">
            {t('joinPool')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Private Key Warning Dialog */}
      <Dialog open={showPrivateKeyDialog} onClose={() => setShowPrivateKeyDialog(false)}>
        <DialogTitle color="error">{t('privateKeyWarningTitle')}</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {t('privateKeyWarning')}
          </Alert>
          <Typography variant="body2">
            {t('secureLocationWarning')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPrivateKeyDialog(false)}>{t('cancel')}</Button>
          <Button onClick={confirmShowPrivateKey} variant="contained" color="error">
            {t('iUnderstand')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WalletDashboard;