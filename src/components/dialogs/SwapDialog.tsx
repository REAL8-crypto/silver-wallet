import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  MenuItem,
  InputAdornment,
  Snackbar
} from '@mui/material';
import { SwapVert as SwapIcon, Close as CloseIcon } from '@mui/icons-material';
import { useWallet } from '../../contexts/WalletContext';
import { useTranslation } from 'react-i18next';
import * as StellarSdk from '@stellar/stellar-sdk';

interface SwapDialogProps {
  open: boolean;
  onClose: () => void;
}

interface Asset {
  code: string;
  issuer: string | null;
  balance: string;
}

const SwapDialog: React.FC<SwapDialogProps> = ({ open, onClose }) => {
  const { i18n } = useTranslation();
  const { publicKey, balances, networkMode, swapAssets } = useWallet();
  const isSpanish = i18n.language.startsWith('es');

  const [fromAsset, setFromAsset] = useState<Asset | null>(null);
  const [toAsset, setToAsset] = useState<Asset | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [slippage, setSlippage] = useState('1.0');
  const [successMessage, setSuccessMessage] = useState(false);

  // Get available assets from balances
  const availableAssets: Asset[] = balances
    .filter(b => parseFloat(b.balance) > 0)
    .map(b => ({
      code: b.asset_type === 'native' ? 'XLM' : b.asset_code || '',
      issuer: b.asset_type === 'native' ? null : b.asset_issuer || null,
      balance: b.balance
    }));

  // Initialize default assets
  useEffect(() => {
    if (availableAssets.length > 0 && !fromAsset) {
      setFromAsset(availableAssets[0]);
      if (availableAssets.length > 1) {
        setToAsset(availableAssets[1]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableAssets.length]);

  // Fetch price function
  const fetchPrice = useCallback(async () => {
    if (!fromAsset || !toAsset || !fromAmount) return;

    try {
      setPriceLoading(true);
      setError(null);

      // Create server instance
      const serverUrl = networkMode === 'testnet' 
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org';
      
      const server = new StellarSdk.Horizon.Server(serverUrl);

      const sourceAsset = fromAsset.code === 'XLM'
        ? StellarSdk.Asset.native()
        : new StellarSdk.Asset(fromAsset.code, fromAsset.issuer!);

      const destAsset = toAsset.code === 'XLM'
        ? StellarSdk.Asset.native()
        : new StellarSdk.Asset(toAsset.code, toAsset.issuer!);

      // Use Stellar's path payment strict send to find the best path
      const paths = await server
        .strictSendPaths(sourceAsset, fromAmount, [destAsset])
        .call();

      if (paths.records.length > 0) {
        const bestPath = paths.records[0];
        setToAmount(parseFloat(bestPath.destination_amount).toFixed(7));
      } else {
        setError(isSpanish 
          ? 'No se encontró ruta de intercambio' 
          : 'No swap path found');
        setToAmount('');
      }
    } catch (err: any) {
      console.error('Error fetching price:', err);
      setError(isSpanish 
        ? 'Error al obtener precio' 
        : 'Error fetching price');
    } finally {
      setPriceLoading(false);
    }
  }, [fromAsset, toAsset, fromAmount, networkMode, isSpanish]);

  // Fetch price and calculate toAmount when fromAmount changes
  useEffect(() => {
    if (fromAsset && toAsset && fromAmount && parseFloat(fromAmount) > 0) {
      fetchPrice();
    } else {
      setToAmount('');
    }
  }, [fromAmount, fromAsset, toAsset, fetchPrice]);

  const handleSwapAssets = () => {
    const tempAsset = fromAsset;
    setFromAsset(toAsset);
    setToAsset(tempAsset);
    setFromAmount(toAmount);
    setToAmount('');
  };

  const handleSwap = async () => {
    if (!publicKey || !fromAsset || !toAsset || !fromAmount || !toAmount) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Calculate minimum amount with slippage
      const slippageDecimal = parseFloat(slippage) / 100;
      const minAmount = (parseFloat(toAmount) * (1 - slippageDecimal)).toFixed(7);

      // Call the swap function from context
      await swapAssets({
        sourceAssetCode: fromAsset.code,
        sourceAssetIssuer: fromAsset.issuer,
        destAssetCode: toAsset.code,
        destAssetIssuer: toAsset.issuer,
        sendAmount: fromAmount,
        destMin: minAmount
      });

      // Success!
      setSuccessMessage(true);
      
      // Reset form
      setFromAmount('');
      setToAmount('');
      
      // Close dialog after brief delay
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err: any) {
      console.error('Swap error:', err);
      setError(err.message || (isSpanish 
        ? 'Error al realizar intercambio' 
        : 'Error performing swap'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFromAmount('');
    setToAmount('');
    setError(null);
    setSuccessMessage(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isSpanish ? 'Intercambiar Activos' : 'Swap Assets'}
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Alert severity="info">
              {isSpanish
                ? 'Los intercambios se ejecutan directamente en la red Stellar DEX usando la mejor ruta disponible.'
                : 'Swaps are executed directly on the Stellar DEX using the best available path.'}
            </Alert>

            {/* From Asset */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                {isSpanish ? 'Desde' : 'From'}
              </Typography>
              <TextField
                select
                fullWidth
                value={fromAsset ? `${fromAsset.code}-${fromAsset.issuer || 'native'}` : ''}
                onChange={(e) => {
                  const selected = availableAssets.find(
                    a => `${a.code}-${a.issuer || 'native'}` === e.target.value
                  );
                  setFromAsset(selected || null);
                }}
                size="small"
              >
                {availableAssets.map((asset) => (
                  <MenuItem key={`${asset.code}-${asset.issuer || 'native'}`} value={`${asset.code}-${asset.issuer || 'native'}`}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Typography>{asset.code}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {parseFloat(asset.balance).toFixed(4)}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* From Amount */}
            <TextField
              label={isSpanish ? 'Cantidad' : 'Amount'}
              type="number"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              fullWidth
              disabled={loading}
              InputProps={{
                endAdornment: fromAsset && (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={() => {
                        // For XLM, leave some for fees and minimum balance
                        if (fromAsset.code === 'XLM') {
                          const available = parseFloat(fromAsset.balance);
                          const reserve = 3; // Keep 3 XLM for fees and minimum balance
                          const maxAmount = Math.max(0, available - reserve);
                          setFromAmount(maxAmount.toFixed(7));
                        } else {
                          setFromAmount(fromAsset.balance);
                        }
                      }}
                    >
                      MAX
                    </Button>
                  </InputAdornment>
                )
              }}
            />

            {/* Swap Direction Button */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <IconButton 
                onClick={handleSwapAssets}
                disabled={loading}
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                <SwapIcon />
              </IconButton>
            </Box>

            {/* To Asset */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                {isSpanish ? 'Para' : 'To'}
              </Typography>
              <TextField
                select
                fullWidth
                value={toAsset ? `${toAsset.code}-${toAsset.issuer || 'native'}` : ''}
                onChange={(e) => {
                  const selected = availableAssets.find(
                    a => `${a.code}-${a.issuer || 'native'}` === e.target.value
                  );
                  setToAsset(selected || null);
                }}
                size="small"
              >
                {availableAssets
                  .filter(a => fromAsset ? `${a.code}-${a.issuer}` !== `${fromAsset.code}-${fromAsset.issuer}` : true)
                  .map((asset) => (
                    <MenuItem key={`${asset.code}-${asset.issuer || 'native'}`} value={`${asset.code}-${asset.issuer || 'native'}`}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <Typography>{asset.code}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {parseFloat(asset.balance).toFixed(4)}
                        </Typography>
                      </Box>
                    </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* To Amount (calculated) */}
            <TextField
              label={isSpanish ? 'Recibirás (estimado)' : 'You will receive (estimated)'}
              type="text"
              value={priceLoading ? (isSpanish ? 'Calculando...' : 'Calculating...') : toAmount}
              fullWidth
              disabled
              InputProps={{
                endAdornment: priceLoading && (
                  <InputAdornment position="end">
                    <CircularProgress size={20} />
                  </InputAdornment>
                )
              }}
            />

            {/* Slippage Tolerance */}
            <TextField
              label={isSpanish ? 'Tolerancia de deslizamiento (%)' : 'Slippage Tolerance (%)'}
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              size="small"
              inputProps={{ step: 0.1, min: 0.1, max: 50 }}
              helperText={isSpanish 
                ? 'Protección contra cambios de precio durante la transacción' 
                : 'Protection against price changes during transaction'}
            />

            {/* Exchange Rate Info */}
            {fromAmount && toAmount && (
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {isSpanish ? 'Tasa de cambio' : 'Exchange Rate'}
                </Typography>
                <Typography variant="body2">
                  1 {fromAsset?.code} ≈ {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(7)} {toAsset?.code}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {isSpanish ? 'Mínimo a recibir: ' : 'Minimum to receive: '}
                  {(parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toFixed(7)} {toAsset?.code}
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>
            {isSpanish ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button
            variant="contained"
            onClick={handleSwap}
            disabled={
              loading ||
              priceLoading ||
              !fromAsset ||
              !toAsset ||
              !fromAmount ||
              !toAmount ||
              parseFloat(fromAmount) <= 0 ||
              parseFloat(fromAmount) > parseFloat(fromAsset?.balance || '0')
            }
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              isSpanish ? 'Intercambiar' : 'Swap'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(false)}
        message={isSpanish ? '¡Intercambio exitoso!' : 'Swap successful!'}
      />
    </>
  );
};

export default SwapDialog;