import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Send as SendIcon,
  SwapHoriz as SwapIcon
} from '@mui/icons-material';
import { useWallet } from '../contexts/WalletContext';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';

const TabPanel = ({ children, value, index }: any) => (
  <div hidden={value !== index}>{value === index && children}</div>
);

const TabContext = React.createContext({});

const WalletDashboard: React.FC = () => {
  const { t } = useTranslation();
  const {
    publicKey,
    balance,
    disconnect,
    addTrustline,
    sendPayment,
    joinLiquidityPool,
    loading,
    error
  } = useWallet();

  const [activeTab, setActiveTab] = useState('assets');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showPrivateKeyDialog, setShowPrivateKeyDialog] = useState(false);

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

  React.useEffect(() => {
    if (showPrivateKeyDialog && publicKey) {
      generateQRCode();
    }
  }, [showPrivateKeyDialog, publicKey]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4">{t('Wallet Dashboard')}</Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <Typography>{t('Public Key')}: {publicKey}</Typography>
          <Typography>{t('Balance')}: {balance}</Typography>

          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={() => setShowPrivateKeyDialog(true)}
          >
            {t('Send Payment')}
          </Button>

          <Dialog open={showPrivateKeyDialog} onClose={() => setShowPrivateKeyDialog(false)}>
            <DialogTitle>{t('Your QR Code')}</DialogTitle>
            <DialogContent>
              {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" />}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowPrivateKeyDialog(false)}>{t('Close')}</Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default WalletDashboard;
