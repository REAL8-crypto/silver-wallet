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
  InputAdornment
} from '@mui/material';
import { SwapVert as SwapIcon } from '@mui/icons-material';
import { useWallet } from '../../contexts/WalletContext';
import { useTranslation } from 'react-i18next';

export interface JoinPoolDialogProps {
  open: boolean;
  onClose: () => void;
  poolId?: string;
}

const JoinPoolDialog: React.FC<JoinPoolDialogProps> = ({ open, onClose, poolId }) => {
  const { t, i18n } = useTranslation();
  const { joinLiquidityPool } = useWallet();
  
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEdited, setLastEdited] = useState<'A' | 'B' | null>(null);

  const isSpanish = i18n.language.startsWith('es');

  // Pool ratio for REAL8/XLM pool (from Horizon data)
  // 1 XLM = 25.68 REAL8 (calculated from 115.42 XLM / 2963.87 REAL8)
  const POOL_RATIO = 25.68;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setAmountA('');
      setAmountB('');
      setError(null);
      setLastEdited(null);
    }
  }, [open]);

  // Auto-calculate the other amount based on pool ratio
  useEffect(() => {
    if (loading) return;

    if (lastEdited === 'A' && amountA) {
      const amountANum = parseFloat(amountA);
      if (!isNaN(amountANum) && amountANum > 0) {
        const calculatedB = (amountANum * POOL_RATIO).toFixed(7);
        if (calculatedB !== amountB) {
          setAmountB(calculatedB);
        }
      }
    } else if (lastEdited === 'B' && amountB) {
      const amountBNum = parseFloat(amountB);
      if (!isNaN(amountBNum) && amountBNum > 0) {
        const calculatedA = (amountBNum / POOL_RATIO).toFixed(7);
        if (calculatedA !== amountA) {
          setAmountA(calculatedA);
        }
      }
    }
  }, [amountA, amountB, lastEdited, loading]);

  const handleAmountAChange = (value: string) => {
    setLastEdited('A');
    setAmountA(value);
    setError(null);
  };

  const handleAmountBChange = (value: string) => {
    setLastEdited('B');
    setAmountB(value);
    setError(null);
  };

  const handleJoinPool = async () => {
    if (!amountA || !amountB) {
      setError(isSpanish ? 'Por favor ingrese ambas cantidades' : 'Please enter both amounts');
      return;
    }

    const amountANum = parseFloat(amountA);
    const amountBNum = parseFloat(amountB);

    if (isNaN(amountANum) || isNaN(amountBNum) || amountANum <= 0 || amountBNum <= 0) {
      setError(isSpanish ? 'Las cantidades deben ser mayores a cero' : 'Amounts must be greater than zero');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the poolId if provided, otherwise use the default REAL8/XLM pool
      const targetPoolId = poolId || 'ff5c2c76062d1e750f89999dfceb8e2202c30a7e6672d2734262176e7e695f16';
      
      // Call joinLiquidityPool with the exact signature it expects
      await joinLiquidityPool?.({
        poolId: targetPoolId,
        maxAmountA: amountA,
        maxAmountB: amountB
      });

      // Success - close dialog
      onClose();
    } catch (err: any) {
      console.error('Error joining pool:', err);
      setError(err?.message || (isSpanish ? 'Error al unirse al fondo' : 'Error joining pool'));
    } finally {
      setLoading(false);
    }
  };

  const ratioText = `1 XLM = ${POOL_RATIO.toFixed(2)} REAL8`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isSpanish ? 'Unirse al Fondo REAL8/XLM' : 'Join REAL8/XLM Pool'}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          {ratioText}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label={isSpanish ? 'Cantidad de XLM' : 'Amount of XLM'}
            value={amountA}
            onChange={(e) => handleAmountAChange(e.target.value)}
            type="number"
            disabled={loading}
            inputProps={{ min: 0, step: 'any' }}
            helperText={isSpanish 
              ? 'Ingrese la cantidad de XLM a depositar' 
              : 'Enter the amount of XLM to deposit'
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="caption" color="text.secondary">
                    XLM
                  </Typography>
                </InputAdornment>
              )
            }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <SwapIcon color="action" />
          </Box>

          <TextField
            fullWidth
            label={isSpanish ? 'Cantidad de REAL8' : 'Amount of REAL8'}
            value={amountB}
            onChange={(e) => handleAmountBChange(e.target.value)}
            type="number"
            disabled={loading}
            inputProps={{ min: 0, step: 'any' }}
            helperText={isSpanish 
              ? 'Ingrese la cantidad de REAL8 a depositar' 
              : 'Enter the amount of REAL8 to deposit'
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="caption" color="text.secondary">
                    REAL8
                  </Typography>
                </InputAdornment>
              )
            }}
          />

          <Alert severity="info">
            <Typography variant="body2">
              {isSpanish 
                ? 'Al unirse al fondo, recibirá tokens LP que representan su participación. La tolerancia al deslizamiento es del 15%.'
                : 'When joining the pool, you will receive LP tokens representing your share. Slippage tolerance is 15%.'
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
          onClick={handleJoinPool}
          variant="contained"
          disabled={loading || !amountA || !amountB}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading 
            ? (isSpanish ? 'Procesando...' : 'Processing...')
            : (isSpanish ? 'Unirse al Fondo' : 'Join Pool')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JoinPoolDialog;