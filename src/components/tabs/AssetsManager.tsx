import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../contexts/WalletContext';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  CompareArrows as TransferIcon,
  TrendingUp as TrendingIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import { REAL8 } from '../../constants/real8Asset';
import TransferDialog from '../dialogs/TransferDialog';

// Import asset icons
import real8Icon from '../../assets/icons/real8-icon.jpg';
import wreal8Icon from '../../assets/icons/wreal8-icon.jpg';
import xlmIcon from '../../assets/icons/xlm-icon.jpg';
import usdcIcon from '../../assets/icons/usdc-icon.jpg';
import eurcIcon from '../../assets/icons/eurc-icon.jpg';
import slvrIcon from '../../assets/icons/slvr-icon.jpg';
import goldIcon from '../../assets/icons/gold-icon.jpg';

// Asset icon mapping
const assetIcons: Record<string, string> = {
  'REAL8': real8Icon,
  'wREAL8': wreal8Icon,
  'XLM': xlmIcon,
  'USDC': usdcIcon,
  'EURC': eurcIcon,
  'SLVR': slvrIcon,
  'GOLD': goldIcon
};

// Curated assets with correct issuer addresses
const curatedAssets = [
  {
    code: 'REAL8',
    issuer: REAL8.ISSUER,
    name: 'REAL8',
    description: 'Token backed by silver',
    verified: true,
    website: 'real8.org'
  },
  {
    code: 'wREAL8',
    issuer: 'GADYIWMD5P75ZHTVIIF6ADU6GYE5T7WRZIHAU4LPAZ4F5IMPD7NRK7V7',
    name: 'Wrapped REAL8',
    description: 'Bridgeable version of REAL8 for cross-chain transfers',
    verified: true,
    website: 'real8.org'
  },
  {
    code: 'XLM',
    issuer: null,
    name: 'Stellar Lumens',
    description: 'Native Stellar asset',
    verified: true,
    website: 'stellar.org'
  },
  {
    code: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    name: 'USD Coin',
    description: 'USD-backed stablecoin by Circle',
    verified: true,
    website: 'circle.com'
  },
  {
    code: 'EURC',
    issuer: 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2',
    name: 'Euro Coin',
    description: 'Euro-backed stablecoin by Circle',
    verified: true,
    website: 'circle.com'
  },
  {
    code: 'SLVR',
    issuer: 'GBZVELEQD3WBN3R3VAG64HVBDOZ76ZL6QPLSFGKWPFED33Q3234NSLVR',
    name: 'Digital Silver',
    description: 'Tokenized silver by MintX',
    verified: true,
    website: 'mintx.co'
  },
  {
    code: 'GOLD',
    issuer: 'GBC5ZGK6MQU3XG5Y72SXPA7P5R5NHYT2475SNEJB2U3EQ6J56QLVGOLD',
    name: 'Digital Gold',
    description: 'Tokenized gold by MintX',
    verified: true,
    website: 'mintx.co'
  }
];

interface CustomAssetForm {
  code: string;
  issuer: string;
}

interface TransferState {
  open: boolean;
  assetCode: string;
  assetIssuer: string | null;
}

const AssetsManager: React.FC = () => {
  const { i18n } = useTranslation();
  const { publicKey, balances, addTrustline, removeTrustline } = useWallet();
  const isSpanish = i18n.language.startsWith('es');
  
  const [loading, setLoading] = useState<string | null>(null);
  const [customAssetDialog, setCustomAssetDialog] = useState(false);
  const [customAssetForm, setCustomAssetForm] = useState<CustomAssetForm>({
    code: '',
    issuer: ''
  });
  const [error, setError] = useState<string | null>(null);
  
  // Transfer dialog state
  const [transferState, setTransferState] = useState<TransferState>({
    open: false,
    assetCode: 'XLM',
    assetIssuer: null
  });

  const handleAddTrustline = async (assetCode: string, issuer: string) => {
    try {
      setError(null);
      setLoading(`add-${assetCode}`);
      await addTrustline(assetCode, issuer);
    } catch (error: any) {
      console.error('Failed to add trustline:', error);
      setError(error.message || 'Failed to add trustline');
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveTrustline = async (assetCode: string, issuer: string) => {
    try {
      setError(null);
      setLoading(`remove-${assetCode}`);
      await removeTrustline(assetCode, issuer);
    } catch (error: any) {
      console.error('Failed to remove trustline:', error);
      setError(error.message || 'Failed to remove trustline');
    } finally {
      setLoading(null);
    }
  };

  const handleCustomAssetSubmit = async () => {
    if (!customAssetForm.code || !customAssetForm.issuer) {
      setError(isSpanish ? 'Por favor completa todos los campos' : 'Please fill in all fields');
      return;
    }

    // Validate issuer format (should be 56 characters)
    if (customAssetForm.issuer.length !== 56 || !customAssetForm.issuer.startsWith('G')) {
      setError(isSpanish ? 'Formato de emisor inválido' : 'Invalid issuer format');
      return;
    }

    await handleAddTrustline(customAssetForm.code, customAssetForm.issuer);
    
    if (!error) {
      setCustomAssetDialog(false);
      setCustomAssetForm({ code: '', issuer: '' });
    }
  };

  const handleOpenTransfer = (assetCode: string, assetIssuer: string | null) => {
    setTransferState({
      open: true,
      assetCode,
      assetIssuer
    });
  };

  const handleCloseTransfer = () => {
    setTransferState({
      open: false,
      assetCode: 'XLM',
      assetIssuer: null
    });
  };

  const handleSwap = () => {
    // TODO: Implement swap functionality or redirect to swap interface
    console.log('Swap functionality to be implemented');
  };

  // Get asset balances (excluding native XLM)
  const assetBalances = balances.filter(b => b.asset_type !== 'native');
  
  // Get XLM balance
  const xlmBalance = balances.find(b => b.asset_type === 'native');

  // Check if asset is already added
  const isAssetAdded = (code: string, issuer: string | null) => {
    if (code === 'XLM') {
      return true; // XLM is always available
    }
    return assetBalances.some(b => b.asset_code === code && b.asset_issuer === issuer);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        {isSpanish ? 'Gestión de Activos' : 'Assets Management'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!publicKey ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {isSpanish ? 'Conecta una billetera para gestionar activos' : 'Connect a wallet to manage assets'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {/* Current Assets */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {isSpanish ? 'Activos Actuales' : 'Current Assets'}
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{isSpanish ? 'Activo' : 'Asset'}</TableCell>
                    <TableCell align="right">{isSpanish ? 'Balance' : 'Balance'}</TableCell>
                    <TableCell align="right">{isSpanish ? 'Límite' : 'Limit'}</TableCell>
                    <TableCell align="center">{isSpanish ? 'Acciones' : 'Actions'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* XLM (Native) Balance */}
                  {xlmBalance && (
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {assetIcons['XLM'] && (
                            <img 
                              src={assetIcons['XLM']} 
                              alt="XLM"
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%',
                                objectFit: 'contain',
                                backgroundColor: '#f5f5f5',
                                padding: '2px'
                              }}
                            />
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              XLM
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {isSpanish ? 'Activo nativo' : 'Native asset'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {parseFloat(xlmBalance.balance).toFixed(4)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {isSpanish ? 'Sin límite' : 'No limit'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={isSpanish ? 'Transferir' : 'Transfer'}>
                          <IconButton 
                            size="small"
                            onClick={() => handleOpenTransfer('XLM', null)}
                          >
                            <TransferIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {/* Other Asset Balances */}
                  {assetBalances.map((balance, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {assetIcons[balance.asset_code || ''] && (
                            <img 
                              src={assetIcons[balance.asset_code || '']} 
                              alt={balance.asset_code}
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%',
                                objectFit: 'contain',
                                backgroundColor: '#f5f5f5',
                                padding: '2px'
                              }}
                            />
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {balance.asset_code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {balance.asset_issuer?.slice(0, 8)}...{balance.asset_issuer?.slice(-4)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {parseFloat(balance.balance).toFixed(4)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {balance.limit === '922337203685.4775807' ? 
                            (isSpanish ? 'Sin límite' : 'No limit') : 
                            balance.limit ? parseFloat(balance.limit).toFixed(2) : 'N/A'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title={isSpanish ? 'Transferir' : 'Transfer'}>
                            <IconButton 
                              size="small"
                              onClick={() => handleOpenTransfer(balance.asset_code!, balance.asset_issuer!)}
                            >
                              <TransferIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={isSpanish ? 'Eliminar línea de confianza' : 'Remove trustline'}>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={parseFloat(balance.balance) > 0 || loading === `remove-${balance.asset_code}`}
                              onClick={() => handleRemoveTrustline(balance.asset_code!, balance.asset_issuer!)}
                            >
                              {loading === `remove-${balance.asset_code}` ? (
                                <CircularProgress size={16} />
                              ) : (
                                <RemoveIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {assetBalances.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                {isSpanish ? 
                  'No tienes activos adicionales. Agrega líneas de confianza para recibir tokens.' : 
                  'No additional assets found. Add trustlines to receive tokens.'
                }
              </Typography>
            )}
          </Paper>

          {/* Curated Assets */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {isSpanish ? 'Lista Curada de Activos' : 'Curated Asset List'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isSpanish ? 
                'Activos verificados y populares en la red Stellar' : 
                'Verified and popular assets on the Stellar network'
              }
            </Typography>
            
            <Stack spacing={2}>
              {curatedAssets.map(asset => {
                const hasAsset = isAssetAdded(asset.code, asset.issuer);
                const isAdding = loading === `add-${asset.code}`;
                
                return (
                  <Box key={`${asset.code}-${asset.issuer}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      border: '1px solid',
                      borderColor: hasAsset ? 'success.main' : 'divider',
                      borderRadius: 1,
                      bgcolor: hasAsset ? 'success.50' : 'transparent'
                    }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      {/* Asset Icon */}
                      {assetIcons[asset.code] && (
                        <img 
                          src={assetIcons[asset.code]} 
                          alt={asset.code}
                          style={{ 
                            width: '48px', 
                            height: '48px', 
                            borderRadius: '50%',
                            objectFit: 'contain',
                            backgroundColor: '#f5f5f5',
                            padding: '3px',
                            flexShrink: 0
                          }}
                        />
                      )}
                      
                      {/* Asset Info */}
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body1" fontWeight={500}>
                            {asset.name}
                          </Typography>
                          <Chip
                            label={asset.code}
                            size="small"
                            variant="outlined"
                            icon={<TrendingIcon />}
                          />
                          {asset.verified && (
                            <Chip
                              label={isSpanish ? 'Verificado' : 'Verified'}
                              size="small"
                              color="primary"
                              variant="outlined"
                              icon={<CircleIcon sx={{ fontSize: '12px !important' }} />}
                            />
                          )}
                          {hasAsset && (
                            <Chip
                              label={isSpanish ? 'Agregado' : 'Added'}
                              size="small"
                              color="success"
                            />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {asset.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {asset.issuer ? 
                            `${asset.issuer.slice(0, 12)}...${asset.issuer.slice(-8)}` : 
                            (isSpanish ? 'Activo nativo' : 'Native asset')
                          }
                        </Typography>
                      </Box>
                    </Box>
                    
                    {/* Add Button */}
                    <Button
                      variant={hasAsset ? "outlined" : "contained"}
                      size="small"
                      disabled={hasAsset || isAdding || asset.code === 'XLM'}
                      onClick={() => asset.issuer && handleAddTrustline(asset.code, asset.issuer)}
                      startIcon={isAdding ? <CircularProgress size={16} /> : <AddIcon />}
                      sx={{ flexShrink: 0 }}
                    >
                      {asset.code === 'XLM' ? 
                        (isSpanish ? 'Nativo' : 'Native') :
                        hasAsset
                          ? (isSpanish ? 'Agregado' : 'Added')
                          : isAdding
                            ? (isSpanish ? 'Agregando...' : 'Adding...')
                            : (isSpanish ? 'Agregar' : 'Add')
                      }
                    </Button>
                  </Box>
                );
              })}
            </Stack>

            {/* Swap Button */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button 
                variant="contained" 
                color="primary"
                size="large"
                onClick={handleSwap}
                startIcon={<TransferIcon />}
              >
                {isSpanish ? 'Intercambiar Activos' : 'Swap Assets'}
              </Button>
            </Box>
          </Paper>

          {/* Custom Asset Addition */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {isSpanish ? 'Agregar Activo Personalizado' : 'Add Custom Asset'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isSpanish ? 
                'Agrega cualquier activo Stellar proporcionando el código y la dirección del emisor.' : 
                'Add any Stellar asset by providing the asset code and issuer address.'
              }
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={() => setCustomAssetDialog(true)}
            >
              {isSpanish ? 'Agregar Activo Personalizado' : 'Add Custom Asset'}
            </Button>
          </Paper>
        </Stack>
      )}

      {/* Custom Asset Dialog */}
      <Dialog open={customAssetDialog} onClose={() => setCustomAssetDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isSpanish ? 'Agregar Activo Personalizado' : 'Add Custom Asset'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={isSpanish ? 'Código del Activo' : 'Asset Code'}
              value={customAssetForm.code}
              onChange={(e) => setCustomAssetForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="BTC, ETH, etc."
              fullWidth
            />
            <TextField
              label={isSpanish ? 'Dirección del Emisor' : 'Issuer Address'}
              value={customAssetForm.issuer}
              onChange={(e) => setCustomAssetForm(prev => ({ ...prev, issuer: e.target.value }))}
              placeholder="GXXX...XXXX"
              fullWidth
              multiline
              rows={2}
            />
            <Alert severity="warning">
              {isSpanish ? 
                'Advertencia: Solo agrega activos de emisores confiables. Los activos fraudulentos pueden resultar en pérdida de fondos.' :
                'Warning: Only add assets from trusted issuers. Fraudulent assets may result in loss of funds.'
              }
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCustomAssetDialog(false);
            setCustomAssetForm({ code: '', issuer: '' });
            setError(null);
          }}>
            {isSpanish ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleCustomAssetSubmit} 
            variant="contained"
            disabled={!customAssetForm.code || !customAssetForm.issuer || loading !== null}
          >
            {isSpanish ? 'Agregar' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <TransferDialog
        open={transferState.open}
        onClose={handleCloseTransfer}
        defaultAssetCode={transferState.assetCode}
        defaultAssetIssuer={transferState.assetIssuer}
      />
    </Box>
  );
};

export default AssetsManager;