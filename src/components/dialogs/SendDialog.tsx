import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Stack,
  MenuItem,
  Typography,
  CircularProgress
} from '@mui/material';
import { useWallet } from '../../contexts/WalletContext';
import { REAL8 } from '../../constants/real8Asset';

interface SendDialogProps {
  open: boolean;
  onClose: () => void;
}

const SendDialog: React.FC<SendDialogProps> = ({ open, onClose }) => {
  const { sendPayment, balances, loading } = useWallet();
  const [assetCode, setAssetCode] = useState<string>('REAL8');
  const [issuer, setIssuer] = useState<string>(REAL8.ISSUER);
  const [destination, setDestination] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [memoText, setMemoText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Available non-native assets from account (to help choose issuer)
  const issuedAssets = useMemo(() => {
    const lines = balances.filter(b => b.asset_type !== 'native');
    return lines.map(l => ({
      code: l.asset_code || '',
      issuer: l.asset_issuer || ''
    }));
  }, [balances]);

  // Keep issuer in sync when assetCode changes to a known issuer (helpful UX)
  useEffect(() => {
    if (assetCode === 'REAL8') {
      setIssuer(REAL8.ISSUER);
      return;
    }
    const found = issuedAssets.find(a => a.code === assetCode);
    if (found) setIssuer(found.issuer);
    else if (assetCode === 'XLM') setIssuer('');
  }, [assetCode, issuedAssets]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setAssetCode('REAL8');  // Default to REAL8 for REAL8-focused wallet
      setIssuer(REAL8.ISSUER);
      setDestination('');
      setAmount('');
      setMemoText('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    console.log('send submit', { assetCode, issuer, destination, amount, memoText });
    
    try {
      // Basic client-side validation
      if (!destination || !destination.trim()) {
        setError('Destination required');
        return;
      }
      if (!amount || Number.isNaN(Number(amount)) || parseFloat(amount) <= 0) {
        setError('Enter a valid amount > 0');
        return;
      }
      if (assetCode !== 'XLM' && (!issuer || !issuer.trim())) {
        setError('Issuer required for token transfers');
        return;
      }

      await sendPayment({
        destination: destination.trim(),
        amount: amount.trim(),
        assetCode,
        issuer: assetCode === 'XLM' ? undefined : issuer,
        memoText: memoText.trim()
      });
      
      onClose();
    } catch (e: any) {
      console.error('[SendDialog] sendPayment failed', e);
      setError(e?.message || 'Send failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Get balance for selected asset
  const getSelectedAssetBalance = () => {
    if (assetCode === 'XLM') {
      const nativeBalance = balances.find(b => b.asset_type === 'native');
      return nativeBalance ? parseFloat(nativeBalance.balance).toFixed(4) : '0';
    } else {
      const assetBalance = balances.find(b => 
        b.asset_code === assetCode && b.asset_issuer === issuer
      );
      return assetBalance ? parseFloat(assetBalance.balance).toFixed(4) : '0';
    }
  };

  return (
    <Dialog open={open} onClose={() => { if (!submitting) onClose(); }} fullWidth maxWidth="xs">
      <DialogTitle>Send Payment</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          <TextField
            fullWidth
            label="Destination"
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="G... or federation ID"
            size="small"
          />
          
          <TextField
            select
            fullWidth
            label="Asset"
            value={assetCode}
            onChange={e => setAssetCode(e.target.value)}
            size="small"
            helperText={`Available: ${getSelectedAssetBalance()}`}
          >
            <MenuItem value="XLM">XLM</MenuItem>
            <MenuItem value={REAL8.CODE}>{REAL8.CODE}</MenuItem>
            {issuedAssets.map(a => (
              // Don't duplicate REAL8 if present
              a.code !== REAL8.CODE && (
                <MenuItem key={`${a.code}:${a.issuer}`} value={a.code}>
                  {a.code}
                </MenuItem>
              )
            ))}
          </TextField>
          
          {assetCode !== 'XLM' && (
            <TextField
              fullWidth
              label="Issuer"
              value={issuer}
              onChange={e => setIssuer(e.target.value)}
              placeholder="G...ISSUER"
              size="small"
            />
          )}
          
          <TextField
            fullWidth
            label="Amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            size="small"
            placeholder="0.0"
            type="number"
            inputProps={{ step: "0.0000001" }}
          />
          
          <TextField
            fullWidth
            label="Memo (optional)"
            value={memoText}
            onChange={e => setMemoText(e.target.value)}
            size="small"
            inputProps={{ maxLength: 28 }}
            helperText={`${memoText.length}/28 characters`}
          />
          
          <Typography variant="caption" color="text.secondary">
            For REAL8 or other tokens, ensure the trustline exists before sending.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || loading}
          startIcon={submitting ? <CircularProgress color="inherit" size={16} /> : undefined}
        >
          {submitting ? 'Sending...' : 'Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SendDialog;
