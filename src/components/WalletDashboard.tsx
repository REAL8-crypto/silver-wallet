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
  ListItemButton,
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
  AccountBalanceWallet as WalletIcon,
  CompareArrows as SwapIcon,
  Pool as PoolIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const WalletDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('assets');
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [networkDialogOpen, setNetworkDialogOpen] = useState(false);

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Top Title */}
      <Typography variant="h5" align="center" sx={{ mb: 3 }}>
        REAL8 Wallet
      </Typography>

      {/* Tabs Navigation */}
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

      {/* Content */}
      {activeTab === 'assets' && (
        <Box>
          <Typography variant="h6">Assets</Typography>
          {/* Original assets UI remains here */}
        </Box>
      )}
      {activeTab === 'transactions' && (
        <Box>
          <Typography variant="h6">Transactions</Typography>
          {/* Original transactions UI remains here */}
        </Box>
      )}
      {activeTab === 'pools' && (
        <Box>
          <Typography variant="h6">Pools</Typography>
          {/* Original pools UI remains here */}
        </Box>
      )}
      {activeTab === 'settings' && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Settings
          </Typography>
          <List>
            <ListItem>
              <ListItemButton onClick={() => setLanguageDialogOpen(true)}>
                <ListItemText primary="Language" />
              </ListItemButton>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemButton onClick={() => setNetworkDialogOpen(true)}>
                <ListItemText primary="Network" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      )}

      {/* Language Dialog */}
      <Dialog open={languageDialogOpen} onClose={() => setLanguageDialogOpen(false)}>
        <DialogTitle>Select Language</DialogTitle>
        <DialogContent>
          <MenuItem onClick={() => setLanguageDialogOpen(false)}>English</MenuItem>
          <MenuItem onClick={() => setLanguageDialogOpen(false)}>Español</MenuItem>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLanguageDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Network Dialog */}
      <Dialog open={networkDialogOpen} onClose={() => setNetworkDialogOpen(false)}>
        <DialogTitle>Select Network</DialogTitle>
        <DialogContent>
          <MenuItem onClick={() => setNetworkDialogOpen(false)}>Mainnet</MenuItem>
          <MenuItem onClick={() => setNetworkDialogOpen(false)}>Testnet</MenuItem>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNetworkDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WalletDashboard;
