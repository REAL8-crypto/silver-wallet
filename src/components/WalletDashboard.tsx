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
  AccountBalanceWallet as WalletIcon,
  Receipt as ReceiptIcon,
  Pool as PoolIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Check as CheckIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';

export default function WalletDashboard() {
  const [activeTab, setActiveTab] = useState('assets');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const handleSend = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAlert({ type: 'success', message: 'Transaction sent successfully!' });
      setSendDialogOpen(false);
      setAmount('');
      setRecipient('');
    }, 2000);
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">
          REAL8 Wallet
        </Typography>
        <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
          <MoreIcon />
        </IconButton>
      </Box>

      {/* Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem>
          <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Logout
        </MenuItem>
      </Menu>

      {/* Tabs with icons only */}
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{
            '& .MuiTab-root': {
              minWidth: { xs: 'auto', sm: 80 },
              padding: { xs: '8px', sm: '12px' }
            }
          }}
        >
          <Tab
            icon={<WalletIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />}
            value="assets"
            aria-label="Assets"
          />
          <Tab
            icon={<SwapIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />}
            value="transactions"
            aria-label="Transactions"
          />
          <Tab
            icon={<PoolIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />}
            value="pools"
            aria-label="Pools"
          />
          <Tab
            icon={<SettingsIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />}
            value="settings"
            aria-label="Settings"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        {activeTab === 'assets' && (
          <Box>
            <Typography variant="h6" mb={2}>
              Assets
            </Typography>
            <List>
              <ListItem>
                <ListItemText primary="REAL8" secondary="Balance: 1,000 R8" />
              </ListItem>
            </List>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              onClick={() => setSendDialogOpen(true)}
            >
              Send
            </Button>
          </Box>
        )}

        {activeTab === 'transactions' && (
          <Box>
            <Typography variant="h6" mb={2}>
              Transactions
            </Typography>
            <List>
              <ListItem>
                <ReceiptIcon sx={{ mr: 2 }} />
                <ListItemText primary="Sent 100 R8" secondary="To GABC123..." />
              </ListItem>
            </List>
          </Box>
        )}

        {activeTab === 'pools' && (
          <Box>
            <Typography variant="h6" mb={2}>
              Liquidity Pools
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />}>
              Add Liquidity
            </Button>
          </Box>
        )}

        {activeTab === 'settings' && (
          <Box>
            <Typography variant="h6" mb={2}>
              Settings
            </Typography>
            <List>
              <ListItem button>
                <ListItemText primary="Language" />
              </ListItem>
            </List>
          </Box>
        )}
      </Box>

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)}>
        <DialogTitle>Send REAL8</DialogTitle>
        <DialogContent>
          {alert && (
            <Alert severity={alert.type} sx={{ mb: 2 }}>
              {alert.message}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            margin="normal"
            type="number"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={loading} variant="contained" color="primary">
            {loading ? <CircularProgress size={24} /> : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
