import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Button,
  MenuItem,
  Alert,
  CircularProgress,
  Typography
} from '@mui/material';
import { useWallet } from '../../contexts/WalletContext';

interface SendDialogProps {
  open: boolean;
  onClose: () => void;
  defaultIssuer?: string;
  presetAssetCode?: string;
}

const SendDialog: React.FC<SendDialogProps> = ({
  open,
  onClose,
  defaultIssuer,
  presetAssetCode
}) => {
  const { balances, sendPayment, loading } = useWallet();

  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [assetCode, setAssetCode] = useState(presetAssetCode || 'XLM');
  const [issuer, setIssuer] = useState(defaultIssuer || '');
  const [memoText, setMemoText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(false);
      if (presetAssetCode) setAssetCode(presetAssetCode);
      if (defaultIssuer) setIssuer(defaultIssuer);
    }
  }, [open, presetAssetCode, defaultIssuer]);

  const issuedAssets = balances.filter(
    b => b.asset_type !== 'native' && b.asset_code
  );

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    if (!destination.trim() || !amount.trim()) {
      setError('Destination and amount required.');
      return;
    }
    if (assetCode !== 'XLM' && !issuer) {
      setError('Issuer required for non-native asset.');
      return;
    }
    setSubmitting(true);
    try {
      await sendPayment({
        destination: destination.trim(),
        amount: amount.trim(),
        assetCode: assetCode,
        issuer: assetCode === 'XLM' ? undefined : issuer.trim() || undefined,
        memoText: memoText.trim() || undefined
      });
      setSuccess(true);
      setDestination('');
      setAmount('');
      setMemoText('');
      if (assetCode !== 'XLM' && !presetAssetCode) {
        setIssuer('');
      }
      // You can auto-close: setTimeout(onClose, 900);
    } catch (e: any) {
      setError(e?.message || 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const disableSubmit =
    submitting ||
    loading ||
    !destination ||
    !amount ||
    parseFloat(amount) <= 0 ||
    (assetCode !== 'XLM' && !issuer);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Send Payment</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && (
            <Alert severity="success" onClose={() => setSuccess(false)}>
              Sent successfully
            </Alert>
          )}

          <TextField
            label="Destination (Public Key)"
            value={destination}
            onChange={e => setDestination(e.target.value)}
            fullWidth
            size="small"
            placeholder="G..."
          />

          <Stack direction="row" spacing={1}>
            <TextField
              label="Amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              size="small"
              fullWidth
              placeholder="0.0"
              type="number"
              inputProps={{ min: 0, step: 'any' }}
            />
            <TextField
              select
              label="Asset"
              value={assetCode}
              onChange={e => {
                setAssetCode(e.target.value);
                if (e.target.value === 'XLM') setIssuer('');
              }}
              size="small"
              sx={{ minWidth: 110 }}
            >
              <MenuItem value="XLM">XLM</MenuItem>
              {issuedAssets.map(line => (
                <MenuItem
                  key={`${line.asset_code}-${line.asset_issuer}`}
                  value={line.asset_code}
                >
                  {line.asset_code}
                </MenuItem>
              ))}
              {!issuedAssets.length && (
                <MenuItem value="" disabled>
                  No assets
                </MenuItem>
              )}
            </TextField>
          </Stack>

          {assetCode !== 'XLM' && (
            <TextField
              label="Issuer"
              value={issuer}
              onChange={e => setIssuer(e.target.value)}
              size="small"
              fullWidth
              placeholder="G...ISSUER"
            />
          )}

          <TextField
            label="Memo (optional)"
            value={memoText}
            onChange={e => setMemoText(e.target.value)}
            size="small"
            fullWidth
            inputProps={{ maxLength: 28 }}
            helperText={`${memoText.length}/28`}
          />

          <Typography variant="caption" color="text.secondary">
            For REAL8 or other tokens, ensure the trustline exists before
            sending.
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
          disabled={disableSubmit}
          startIcon={
            submitting ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
        >
          {submitting ? 'Sending...' : 'Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SendDialog;