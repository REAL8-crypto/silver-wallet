import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Button, Typography
} from '@mui/material';
import { useWallet } from '../../contexts/WalletContext';

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
  const [assetCode, setAssetCode] = useState(defaultAssetCode || 'REAL8');
  const [issuer, setIssuer] = useState(defaultIssuer || '');
  const [error, setError] = useState('');
  const nativeBalance = parseFloat(nativeBalanceStr || '0');

  // Auto-fill REAL8 issuer on open
  useEffect(() => {
    if (open) {
      setAssetCode(defaultAssetCode || 'REAL8');
      // Auto-fill REAL8 issuer if assetCode is REAL8 and no defaultIssuer provided
      if (defaultIssuer) {
        setIssuer(defaultIssuer);
      } else if ((defaultAssetCode || 'REAL8') === 'REAL8') {
        setIssuer('GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD');
      } else {
        setIssuer('');
      }
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
      <DialogTitle>Add Trustline</DialogTitle>
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
          fullWidth label="Asset Code" margin="dense"
          value={assetCode} onChange={e => setAssetCode(e.target.value)}
        />
        <TextField
          fullWidth label="Issuer" margin="dense"
          value={issuer} onChange={e => setIssuer(e.target.value)}
          placeholder="Issuer public key"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={nativeBalance < 2 || unfunded}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddAssetDialog;