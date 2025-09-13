import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Alert, Box, Typography, MenuItem
} from '@mui/material';
import { useWallet } from '../../contexts/WalletContext';
import { REAL8 } from '../../constants/real8Asset'; // Added for issuer

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

  const real8Balance = balances.find(b => 
    b.asset_code === REAL8.CODE && b.asset_issuer === REAL8.ISSUER
  )?.balance || '0';

  const handleJoin = async () => {
    if (!amountA || !amountB) {
      setError('Enter both amounts');
      return;
    }
    
    // Parse and validate amountA/amountB as positive numbers
    const numAmountA = parseFloat(amountA);
    const numAmountB = parseFloat(amountB);
    
    if (isNaN(numAmountA) || isNaN(numAmountB) || numAmountA <= 0 || numAmountB <= 0) {
      setError('Amounts must be positive numbers');
      return;
    }
    
    if (assetA === assetB) {
      setError('Assets must be different');
      return;
    }
    
    try {
      await joinLiquidityPool({
        assetACode: assetA,
        assetAIssuer: assetA === 'REAL8' ? REAL8.ISSUER : '',
        assetBCode: assetB,
        assetBIssuer: assetB === 'REAL8' ? REAL8.ISSUER : '',
        maxAmountA: amountA,
        maxAmountB: amountB
      });
      setError('');
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to join pool');
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
