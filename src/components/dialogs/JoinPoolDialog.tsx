import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Alert, Box, Typography, MenuItem
} from '@mui/material';
import { useWallet } from '../../contexts/WalletContext';

interface JoinPoolDialogProps {
  open: boolean;
  onClose: () => void;
  defaultIssuer?: string;
}

const JoinPoolDialog: React.FC<JoinPoolDialogProps> = ({ open, onClose }) => {
  const { joinLiquidityPool, unfunded, balance, balances } = useWallet();
  const [assetA, setAssetA] = useState('XLM');
  const [assetB, setAssetB] = useState('REAL8');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [error, setError] = useState('');

  const real8Balance = balances.find(b => b.asset_code === 'REAL8')?.balance || '0';

  const handleJoin = async () => {
    if (!amountA || !amountB) {
      setError('Enter both amounts');
      return;
    }
    try {
      // Placeholder: adapt to your actual pool logic.
      // The refactored context currently logs / sets error.
      // If you had real logic before, reinsert it there.
      // For now we just call it with symbolic params.
      // @ts-ignore
      await joinLiquidityPool(assetA, assetB, amountA, amountB);
      setError('');
      onClose();
    } catch {
      setError('Failed to join pool');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Join Liquidity Pool</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {unfunded && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Fund the account first.
          </Alert>
        )}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption">
            XLM: {balance} • REAL8: {real8Balance}
          </Typography>
        </Box>
        <TextField
          fullWidth select label="Asset A" margin="dense"
          value={assetA} onChange={e => setAssetA(e.target.value)}
        >
          <MenuItem value="XLM">XLM</MenuItem>
          <MenuItem value="REAL8">REAL8</MenuItem>
        </TextField>
        <TextField
          fullWidth select label="Asset B" margin="dense"
          value={assetB} onChange={e => setAssetB(e.target.value)}
        >
          <MenuItem value="REAL8">REAL8</MenuItem>
            <MenuItem value="XLM">XLM</MenuItem>
        </TextField>
        <TextField
          fullWidth margin="dense" label={`Amount (${assetA})`}
          value={amountA} onChange={e => setAmountA(e.target.value)}
        />
        <TextField
          fullWidth margin="dense" label={`Amount (${assetB})`}
          value={amountB} onChange={e => setAmountB(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleJoin}
          variant="contained"
          disabled={unfunded}
        >
          Join
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JoinPoolDialog;