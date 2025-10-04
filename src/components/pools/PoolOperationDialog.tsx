import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Box,
  CircularProgress,
  Typography,
  IconButton,
  InputAdornment
} from '@mui/material';
import { SwapVert as SwapIcon } from '@mui/icons-material';
import type { PoolDialogData, PoolDef } from '../../types/pools';

interface PoolOperationDialogProps {
  open: boolean;
  dialogData: PoolDialogData;
  pool?: PoolDef;
  loading: boolean;
  isSpanish: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDataChange: (data: Partial<PoolDialogData>) => void;
}

export const PoolOperationDialog: React.FC<PoolOperationDialogProps> = ({
  open,
  dialogData,
  pool,
  loading,
  isSpanish,
  onClose,
  onConfirm,
  onDataChange
}) => {
  const [lastEdited, setLastEdited] = useState<'A' | 'B' | null>(null);

  const getTitle = () => {
    switch (dialogData.action) {
      case 'join':
        return isSpanish ? 'Unirse al Fondo' : 'Join Pool';
      case 'add':
        return isSpanish ? 'Agregar Liquidez' : 'Add Liquidity';
      case 'remove':
        return isSpanish ? 'Retirar Liquidez' : 'Remove Liquidity';
      default:
        return isSpanish ? 'Operación de Fondo' : 'Pool Operation';
    }
  };

  const assetAName = pool?.assetA.code || 'A';
  const assetBName = pool?.assetB.code || 'B';

  // Calculate pool ratio
  const getPoolRatio = (): number | null => {
    if (!pool || !pool.reserveA || !pool.reserveB) return null;
    const reserveA = parseFloat(pool.reserveA);
    const reserveB = parseFloat(pool.reserveB);
    if (reserveA === 0 || reserveB === 0) return null;
    return reserveB / reserveA; // B per A
  };

  // Auto-calculate the other amount when one is changed
  useEffect(() => {
    if (!pool || loading) return;
    
    const ratio = getPoolRatio();
    if (ratio === null) return;

    if (lastEdited === 'A' && dialogData.amountA) {
      const amountA = parseFloat(dialogData.amountA);
      if (!isNaN(amountA) && amountA > 0) {
        const calculatedB = (amountA * ratio).toFixed(7);
        if (calculatedB !== dialogData.amountB) {
          onDataChange({ amountB: calculatedB });
        }
      }
    } else if (lastEdited === 'B' && dialogData.amountB) {
      const amountB = parseFloat(dialogData.amountB);
      if (!isNaN(amountB) && amountB > 0) {
        const calculatedA = (amountB / ratio).toFixed(7);
        if (calculatedA !== dialogData.amountA) {
          onDataChange({ amountA: calculatedA });
        }
      }
    }
  }, [dialogData.amountA, dialogData.amountB, lastEdited, pool, loading]);

  const handleAmountAChange = (value: string) => {
    setLastEdited('A');
    onDataChange({ amountA: value });
  };

  const handleAmountBChange = (value: string) => {
    setLastEdited('B');
    onDataChange({ amountB: value });
  };

  const ratio = getPoolRatio();
  const ratioText = ratio 
    ? `1 ${assetAName} = ${ratio.toFixed(7)} ${assetBName}`
    : isSpanish ? 'Ratio no disponible' : 'Ratio unavailable';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {getTitle()}
        {pool && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {pool.assetA.code}/{pool.assetB.code}
          </Typography>
        )}
        {ratio && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {ratioText}
          </Typography>
        )}
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label={isSpanish ? `Cantidad de ${assetAName}` : `Amount of ${assetAName}`}
            value={dialogData.amountA}
            onChange={(e) => handleAmountAChange(e.target.value)}
            type="number"
            disabled={loading}
            inputProps={{ min: 0, step: 'any' }}
            helperText={isSpanish 
              ? `Ingrese la cantidad de ${assetAName} a depositar` 
              : `Enter the amount of ${assetAName} to deposit`
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="caption" color="text.secondary">
                    {assetAName}
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
            label={isSpanish ? `Cantidad de ${assetBName}` : `Amount of ${assetBName}`}
            value={dialogData.amountB}
            onChange={(e) => handleAmountBChange(e.target.value)}
            type="number"
            disabled={loading}
            inputProps={{ min: 0, step: 'any' }}
            helperText={isSpanish 
              ? `Ingrese la cantidad de ${assetBName} a depositar` 
              : `Enter the amount of ${assetBName} to deposit`
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="caption" color="text.secondary">
                    {assetBName}
                  </Typography>
                </InputAdornment>
              )
            }}
          />
          
          <TextField
            fullWidth
            label={isSpanish ? 'Deslizamiento (%)' : 'Slippage (%)'}
            value={dialogData.slippage}
            onChange={(e) => onDataChange({ slippage: e.target.value })}
            type="number"
            disabled={loading}
            inputProps={{ min: 0, max: 100, step: 0.1 }}
            helperText={isSpanish ? 'Tolerancia al deslizamiento de precio' : 'Price slippage tolerance'}
          />
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {isSpanish ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained" 
          disabled={loading || !dialogData.amountA || !dialogData.amountB}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading 
            ? (isSpanish ? 'Procesando...' : 'Processing...')
            : (isSpanish ? 'Confirmar' : 'Confirm')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};