import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Typography,
  Box,
  InputAdornment,
  FormControlLabel,
  Switch
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../contexts/WalletContext';

interface TransferDialogProps {
  open: boolean;
  onClose: () => void;
  defaultAssetCode?: string;
  defaultAssetIssuer?: string | null;
}

const TransferDialog: React.FC<TransferDialogProps> = ({
  open,
  onClose,
  defaultAssetCode = 'XLM',
  defaultAssetIssuer = null
}) => {
  const { t, i18n } = useTranslation();
  const { sendPayment, balances, loading } = useWallet();
  const isSpanish = i18n.language.startsWith('es');

  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [memoText, setMemoText] = useState('');
  const [includeMemo, setIncludeMemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Get current balance for the selected asset
  const currentBalance = balances.find(b => {
    if (defaultAssetCode === 'XLM') {
      return b.asset_type === 'native';
    }
    return b.asset_code === defaultAssetCode && b.asset_issuer === defaultAssetIssuer;
  });

  const availableBalance = currentBalance ? parseFloat(currentBalance.balance) : 0;

  // Calculate minimum balance for XLM (2 base + 0.5 per subentry + safety buffer)
  const minXLMBalance = defaultAssetCode === 'XLM' ? 2.5 : 0;
  const maxTransferable = defaultAssetCode === 'XLM' 
    ? Math.max(0, availableBalance - minXLMBalance)
    : availableBalance;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setDestination('');
      setAmount('');
      setMemoText('');
      setIncludeMemo(false);
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const validateForm = (): boolean => {
    setError(null);

    // Validate destination
    if (!destination.trim()) {
      setError(isSpanish ? 'La dirección de destino es requerida' : 'Destination address is required');
      return false;
    }

    // Basic Stellar address validation (starts with G, 56 chars)
    if (!destination.startsWith('G') || destination.length !== 56) {
      setError(isSpanish ? 'Formato de dirección inválido' : 'Invalid address format');
      return false;
    }

    // Validate amount
    if (!amount.trim()) {
      setError(isSpanish ? 'El monto es requerido' : 'Amount is required');
      return false;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(isSpanish ? 'El monto debe ser mayor que 0' : 'Amount must be greater than 0');
      return false;
    }

    // Check sufficient balance
    if (numAmount > maxTransferable) {
      if (defaultAssetCode === 'XLM') {
        setError(
          isSpanish 
            ? `Saldo insuficiente. Disponible: ${maxTransferable.toFixed(4)} XLM (después de reservas)`
            : `Insufficient balance. Available: ${maxTransferable.toFixed(4)} XLM (after reserves)`
        );
      } else {
        setError(
          isSpanish 
            ? `Saldo insuficiente. Disponible: ${maxTransferable.toFixed(4)} ${defaultAssetCode}`
            : `Insufficient balance. Available: ${maxTransferable.toFixed(4)} ${defaultAssetCode}`
        );
      }
      return false;
    }

    // Validate memo length (Stellar limit is 28 bytes)
    if (includeMemo && memoText.trim().length > 28) {
      setError(isSpanish ? 'El memo debe tener máximo 28 caracteres' : 'Memo must be 28 characters or less');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      await sendPayment({
        destination: destination.trim(),
        amount: amount.trim(),
        assetCode: defaultAssetCode === 'XLM' ? undefined : defaultAssetCode,
        issuer: defaultAssetIssuer || undefined,
        memoText: includeMemo && memoText.trim() ? memoText.trim() : undefined
      });

      setSuccess(true);
      
      // Close dialog after brief success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Transfer error:', err);
      setError(err.message || (isSpanish ? 'Error al enviar el pago' : 'Failed to send payment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetMaxAmount = () => {
    setAmount(maxTransferable.toFixed(7));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isSpanish ? 'Transferir' : 'Transfer'} {defaultAssetCode}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {/* Success Message */}
          {success && (
            <Alert severity="success">
              {isSpanish ? '¡Transferencia exitosa!' : 'Transfer successful!'}
            </Alert>
          )}

          {/* Error Message */}
          {error && !success && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Balance Info */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 1
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {isSpanish ? 'Balance disponible' : 'Available balance'}
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              {maxTransferable.toFixed(4)} {defaultAssetCode}
            </Typography>
            {defaultAssetCode === 'XLM' && (
              <Typography variant="caption" color="text.secondary">
                {isSpanish 
                  ? `(${minXLMBalance} XLM reservados para la cuenta)`
                  : `(${minXLMBalance} XLM reserved for account)`
                }
              </Typography>
            )}
          </Box>

          {/* Destination Address */}
          <TextField
            label={isSpanish ? 'Dirección de destino' : 'Destination address'}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="GXXX...XXXX"
            fullWidth
            required
            disabled={submitting || success}
            helperText={isSpanish ? 'Dirección pública Stellar (56 caracteres)' : 'Stellar public address (56 characters)'}
          />

          {/* Amount */}
          <TextField
            label={isSpanish ? 'Monto' : 'Amount'}
            value={amount}
            onChange={(e) => {
              // Only allow numbers and decimal point
              const value = e.target.value;
              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setAmount(value);
              }
            }}
            placeholder="0.00"
            fullWidth
            required
            disabled={submitting || success}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    size="small"
                    onClick={handleSetMaxAmount}
                    disabled={submitting || success}
                  >
                    {isSpanish ? 'Máx' : 'Max'}
                  </Button>
                </InputAdornment>
              )
            }}
            helperText={`${isSpanish ? 'Monto a transferir' : 'Amount to transfer'}`}
          />

          {/* Optional Memo Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={includeMemo}
                onChange={(e) => setIncludeMemo(e.target.checked)}
                disabled={submitting || success}
              />
            }
            label={isSpanish ? 'Incluir memo (opcional)' : 'Include memo (optional)'}
          />

          {/* Memo Field */}
          {includeMemo && (
            <TextField
              label={isSpanish ? 'Memo de texto' : 'Text memo'}
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder={isSpanish ? 'Nota opcional (máx. 28 caracteres)' : 'Optional note (max 28 characters)'}
              fullWidth
              disabled={submitting || success}
              inputProps={{ maxLength: 28 }}
              helperText={`${memoText.length}/28 ${isSpanish ? 'caracteres' : 'characters'}`}
            />
          )}

          {/* Warning for small XLM amounts */}
          {defaultAssetCode === 'XLM' && parseFloat(amount) > 0 && parseFloat(amount) < 1 && (
            <Alert severity="info">
              {isSpanish
                ? 'Nota: Algunas cuentas pueden requerir un saldo mínimo de 1 XLM para recibir pagos.'
                : 'Note: Some accounts may require a minimum balance of 1 XLM to receive payments.'}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting || success}>
          {isSpanish ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || success || !destination || !amount}
          startIcon={submitting ? <CircularProgress size={16} /> : null}
        >
          {submitting
            ? (isSpanish ? 'Enviando...' : 'Sending...')
            : (isSpanish ? 'Enviar' : 'Send')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransferDialog;