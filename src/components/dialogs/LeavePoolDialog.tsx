import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Box,
  InputAdornment,
  Slider
} from '@mui/material';
import { useWallet } from '../../contexts/WalletContext';
import { useTranslation } from 'react-i18next';

export interface LeavePoolDialogProps {
  open: boolean;
  onClose: () => void;
  poolId: string;
  poolName?: string;
  availableShares?: string;
}

const LeavePoolDialog: React.FC<LeavePoolDialogProps> = ({ 
  open, 
  onClose, 
  poolId,
  poolName = 'Liquidity Pool',
  availableShares = '0'
}) => {
  const { t, i18n } = useTranslation();
  const { leaveLiquidityPool } = useWallet();
  
  const [sharesAmount, setSharesAmount] = useState('');
  const [withdrawPercentage, setWithdrawPercentage] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSpanish = i18n.language.startsWith('es');
  const maxShares = parseFloat(availableShares);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSharesAmount('');
      setWithdrawPercentage(100);
      setError(null);
    } else {
      // Set default to withdraw all shares
      setSharesAmount(availableShares);
    }
  }, [open, availableShares]);

  // Update shares amount when percentage changes
  useEffect(() => {
    if (maxShares > 0) {
      const calculatedShares = (maxShares * withdrawPercentage / 100).toFixed(7);
      setSharesAmount(calculatedShares);
    }
  }, [withdrawPercentage, maxShares]);

  const handleSharesChange = (value: string) => {
    setSharesAmount(value);
    setError(null);
    
    // Update percentage slider
    if (maxShares > 0) {
      const shares = parseFloat(value);
      if (!isNaN(shares)) {
        const percentage = Math.min(100, (shares / maxShares) * 100);
        setWithdrawPercentage(Math.round(percentage));
      }
    }
  };

  const handlePercentageChange = (_event: Event, newValue: number | number[]) => {
    setWithdrawPercentage(newValue as number);
  };

  const handleWithdrawAll = () => {
    setSharesAmount(availableShares);
    setWithdrawPercentage(100);
  };

  const handleLeavePool = async () => {
    if (!sharesAmount) {
      setError(isSpanish ? 'Por favor ingrese la cantidad de acciones' : 'Please enter shares amount');
      return;
    }

    const sharesNum = parseFloat(sharesAmount);

    if (isNaN(sharesNum) || sharesNum <= 0) {
      setError(isSpanish ? 'La cantidad debe ser mayor a cero' : 'Amount must be greater than zero');
      return;
    }

    if (sharesNum > maxShares) {
      setError(isSpanish 
        ? `Acciones insuficientes. Disponible: ${maxShares}` 
        : `Insufficient shares. Available: ${maxShares}`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await leaveLiquidityPool?.({
        poolId,
        sharesAmount
      });

      // Success - close dialog
      onClose();
    } catch (err: any) {
      console.error('Error leaving pool:', err);
      setError(err?.message || (isSpanish ? 'Error al salir del fondo' : 'Error leaving pool'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isSpanish ? 'Retirar Liquidez' : 'Withdraw Liquidity'}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {poolName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {isSpanish ? 'Acciones Disponibles:' : 'Available Shares:'} <strong>{maxShares.toFixed(7)}</strong>
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" gutterBottom>
              {isSpanish ? 'Porcentaje a Retirar' : 'Percentage to Withdraw'}
            </Typography>
            <Slider
              value={withdrawPercentage}
              onChange={handlePercentageChange}
              disabled={loading}
              min={0}
              max={100}
              step={1}
              marks={[
                { value: 0, label: '0%' },
                { value: 25, label: '25%' },
                { value: 50, label: '50%' },
                { value: 75, label: '75%' },
                { value: 100, label: '100%' }
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
            />
          </Box>

          <TextField
            fullWidth
            label={isSpanish ? 'Cantidad de Acciones' : 'Shares Amount'}
            value={sharesAmount}
            onChange={(e) => handleSharesChange(e.target.value)}
            type="number"
            disabled={loading}
            inputProps={{ min: 0, max: maxShares, step: 'any' }}
            helperText={isSpanish 
              ? 'Ingrese la cantidad de acciones a retirar' 
              : 'Enter the amount of shares to withdraw'
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button 
                    size="small" 
                    onClick={handleWithdrawAll}
                    disabled={loading}
                  >
                    {isSpanish ? 'Todo' : 'Max'}
                  </Button>
                </InputAdornment>
              )
            }}
          />

          <Alert severity="info">
            <Typography variant="body2">
              {isSpanish 
                ? 'Al retirar liquidez, recibirá una cantidad proporcional de ambos activos según su participación en el fondo. La tolerancia al deslizamiento es del 5%.'
                : 'When withdrawing liquidity, you will receive a proportional amount of both assets based on your share of the pool. Slippage tolerance is 5%.'
              }
            </Typography>
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {isSpanish ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button 
          onClick={handleLeavePool}
          variant="contained"
          color="error"
          disabled={loading || !sharesAmount || parseFloat(sharesAmount) <= 0}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading 
            ? (isSpanish ? 'Procesando...' : 'Processing...')
            : (isSpanish ? 'Retirar Liquidez' : 'Withdraw Liquidity')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeavePoolDialog;