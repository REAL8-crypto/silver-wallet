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
  Tooltip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../contexts/WalletContext';
import { 
  Add as AddIcon, 
  Remove as RemoveIcon,
  CompareArrows as TransferIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';

const AssetsManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { publicKey, balances, addTrustline, removeTrustline } = useWallet();
  const isSpanish = i18n.language.startsWith('es');
  const [loading, setLoading] = useState<string | null>(null);

  const handleAddTrustline = async (assetCode: string, issuer: string) => {
    try {
      setLoading(`add-${assetCode}`);
      await addTrustline(assetCode, issuer);
    } catch (error: any) {
      console.error('Failed to add trustline:', error);
      // Error handling could be enhanced with toast notifications
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveTrustline = async (assetCode: string, issuer: string) => {
    try {
      setLoading(`remove-${assetCode}`);
      await removeTrustline(assetCode, issuer);
    } catch (error: any) {
      console.error('Failed to remove trustline:', error);
      // Error handling could be enhanced with toast notifications
    } finally {
      setLoading(null);
    }
  };

  const assetBalances = balances.filter(b => b.asset_type !== 'native');

  // Popular assets that users might want to add
  const popularAssets = [
    {
      code: 'REAL8',
      issuer: 'GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD',
      name: 'REAL8',
      description: isSpanish ? 'Token respaldado por oro' : 'Gold-backed token'
    },
    {
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC2FQI6WK4NDLPXUZL3AKOEDGOPYUFQHE2PDLJ4ALU8A',
      name: 'USD Coin',
      description: isSpanish ? 'Moneda estable respaldada por USD' : 'USD-backed stablecoin'
    }
  ];

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        {isSpanish ? 'Gestión de Activos' : 'Assets Management'}
      </Typography>

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
            
            {assetBalances.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                {isSpanish ? 'No tienes activos adicionales. Agrega líneas de confianza para recibir tokens.' : 'No additional assets found. Add trustlines to receive tokens.'}
              </Typography>
            ) : (
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
                    {assetBalances.map((balance, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {balance.asset_code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {balance.asset_issuer?.slice(0, 8)}...
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {parseFloat(balance.balance).toFixed(4)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {balance.limit === '922337203685.4775807' ? isSpanish ? 'Sin límite' : 'No limit' : balance.limit}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title={isSpanish ? 'Transferir' : 'Transfer'}>
                              <IconButton size="small">
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
                                <RemoveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Popular Assets to Add */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {isSpanish ? 'Activos Populares' : 'Popular Assets'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isSpanish ? 'Agrega líneas de confianza para estos activos populares:' : 'Add trustlines for these popular assets:'}
            </Typography>
            
            <Stack spacing={2}>
              {popularAssets.map((asset) => {
                const hasAsset = assetBalances.some(b => b.asset_code === asset.code && b.asset_issuer === asset.issuer);
                const isAdding = loading === `add-${asset.code}`;
                
                return (
                  <Box key={asset.code} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: hasAsset ? 'success.50' : 'transparent'
                  }}>
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
                        {hasAsset && (
                          <Chip 
                            label={isSpanish ? 'Agregado' : 'Added'} 
                            size="small" 
                            color="success"
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {asset.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {asset.issuer.slice(0, 12)}...
                      </Typography>
                    </Box>
                    <Button
                      variant={hasAsset ? "outlined" : "contained"}
                      size="small"
                      disabled={hasAsset || isAdding}
                      onClick={() => handleAddTrustline(asset.code, asset.issuer)}
                      startIcon={<AddIcon />}
                    >
                      {hasAsset 
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
          </Paper>

          {/* Custom Asset Addition */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {isSpanish ? 'Agregar Activo Personalizado' : 'Add Custom Asset'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isSpanish ? 'Para agregar un activo personalizado, usa el botón "Agregar Activo" en la interfaz principal.' : 'To add a custom asset, use the "Add Asset" button in the main interface.'}
            </Typography>
            <Button variant="outlined" disabled>
              {isSpanish ? 'Próximamente' : 'Coming Soon'}
            </Button>
          </Paper>
        </Stack>
      )}
    </Box>
  );
};

export default AssetsManager;