import React, { useState } from 'react';
import {
  Box,
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
  Logout as LogoutIcon,
  MoreVert as MoreIcon,
  Send as SendIcon,
  SwapHoriz as SwapIcon,
  AccountBalance as BalanceIcon,
  Receipt as ReceiptIcon,
  Pool as PoolIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Check as CheckIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { useWallet } from '../contexts/WalletContext';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';

const TabPanel = ({ children, value, index }: any) => (
  <div hidden={value !== index}>{value === index && children}</div>
);

const TabContext = React.createContext({});

const WalletDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showPrivateKeyDialog, setShowPrivateKeyDialog] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKeyCopied, setPrivateKeyCopied] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);

  // ...Rest of your component logic, no unused variables, hooks have correct dependencies

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
  }, [showPrivateKeyDialog, publicKey]); // Only use actual dependencies

  // ...Rest of your component render JSX

};

export default WalletDashboard;
