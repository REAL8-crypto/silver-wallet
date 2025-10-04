import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Button, Typography
} from '@mui/material';
import { useWallet } from '../../contexts/WalletContext';
import { REAL8 } from '../../constants/real8Asset';

interface AddAssetDialogProps {
  open: boolean;
  onClose: () => void;
  defaultIssuer?: string;
  defaultAssetCode?: string;
}

const AddAssetDialog: React.FC<AddAssetDialogProps> = ({
  open, onClose, defaultIssuer, defaultAssetCode
}) => {
  const { addTrustline, balance: nativeBalanceStr, unfunded } = useWallet();
  // default asset code should remain REAL8, issuer defaults to official REAL8 issuer
  const [assetCode, setAssetCode] = useState(defaultAssetCode || REAL8.CODE);
  const [issuer, setIssuer] = useState(defaultIssuer || REAL8.ISSUER);
  const [error, setError] = useState('');
  const nativeBalance = parseFloat(nativeBalanceStr || '0');

  // Ensure dialog fields are reset to defaults each time the dialog is opened
  useEffect(() => {
    if (open) {
      setAssetCode(defaultAssetCode || REAL8.CODE);
      setIssuer(defaultIssuer || REAL8.ISSUER);
      setError('');
    }
  }, [open, defaultAssetCode, defaultIssuer]);

  const handleAdd = async () => {
    if (!assetCode || !issuer) {
      setError('All fields required');
      return;
    }
    if (nativeBalance < 2) {
      setError('Need at least 2 XLM for a new trustline');
      return;
    }

    try {
      await addTrustline(assetCode, issuer);
      setError('');
      onClose();
    } catch {
      setError('Failed to add trustline');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{unfunded ? 'Add Trustline' : 'Add Trustline'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {nativeBalance < 2 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="caption" fontWeight={600}>
              Minimum 2 XLM reserve required, you have {nativeBalance}.
            </Typography>
          </Alert>
        )}
        {unfunded && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Account is unfunded; fund it first.
          </Alert>
        )}
        <TextField
          fullWidth
          label="Asset Code"
          margin="dense"
          value={assetCode}
          onChange={e => setAssetCode(e.target.value)}
        />
        <TextField
          fullWidth
          label="Issuer"
          margin="dense"
          value={issuer}
          onChange={e => setIssuer(e.target.value)}
          placeholder="G...ISSUER"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleAdd} variant="contained">Add</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddAssetDialog;
