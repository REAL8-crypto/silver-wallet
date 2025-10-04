import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Stack,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  Snackbar
} from '@mui/material';
import { 
  Pool as PoolIcon, 
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import * as StellarSdk from '@stellar/stellar-sdk';
import { useWallet } from '../../contexts/WalletContext';
import { PoolStatistics } from '../pools/PoolStatistics';
import { PoolsList } from '../pools/PoolsList';
import { AdvancedTools } from '../pools/AdvancedTools';
import { PoolOperationDialog } from '../pools/PoolOperationDialog';
import { usePoolDiscovery } from '../../hooks/usePoolDiscovery';
import type { PoolDef, PoolDialogData } from '../../types/pools';

interface PoolsManagerProps {
  onNavigateToTab?: (tab: string) => void;
}

const PoolsManager: React.FC<PoolsManagerProps> = ({ onNavigateToTab }) => {
  console.log('POOLS_MANAGER_MOUNTED', new Date().toISOString());
  
  const { i18n } = useTranslation();
  const { publicKey, joinLiquidityPool, networkMode, balances } = useWallet();
  const isSpanish = i18n.language.startsWith('es');
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pools, setPools] = useState<PoolDef[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState<PoolDialogData>({
    poolId: '',
    action: 'join',
    amountA: '',
    amountB: '',
    slippage: '0.5'
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean; 
    message: string; 
    severity: 'success' | 'error' | 'info'
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const serverRef = React.useRef<StellarSdk.Horizon.Server | null>(null);
  
  React.useEffect(() => {
    try {
      serverRef.current = new StellarSdk.Horizon.Server(
        networkMode === 'testnet' 
          ? 'https://horizon-testnet.stellar.org'
          : 'https://horizon.stellar.org'
      );
    } catch (error) {
      console.error('Failed to create Stellar server:', error);
      serverRef.current = null;
    }
  }, [networkMode]);
  
  const { discoverLiquidityPools } = usePoolDiscovery(serverRef, publicKey, balances);
  
  useEffect(() => {
    const loadPoolData = async () => {
      setLoading(true);
      
      try {
        const realPools = await discoverLiquidityPools();
        setPools(realPools);
        
      } catch (error) {
        console.error('Failed to load pool data:', error);
        setPools([]);
        setSnackbar({
          open: true,
          message: isSpanish ? 'Error al cargar datos de Fondos' : 'Failed to load pool data',
          severity: 'error'
        });
      }
      
      setLoading(false);
    };
    loadPoolData();
  }, [discoverLiquidityPools, isSpanish]);
  
  const fetchPoolData = useCallback(async () => {
    try {
      setRefreshing(true);
      const discoveredPools = await discoverLiquidityPools();
      setPools(discoveredPools);
      
      setSnackbar({
        open: true,
        message: isSpanish ? 'Datos de Fondos actualizados' : 'Pool data refreshed',
        severity: 'success'
      });
      
    } catch (error) {
      console.error('Failed to fetch pool data:', error);
      setSnackbar({
        open: true,
        message: isSpanish ? 'Error al actualizar datos' : 'Failed to refresh data',
        severity: 'error'
      });
    } finally {
      setRefreshing(false);
    }
  }, [discoverLiquidityPools, isSpanish]);
  
  const handlePoolOperation = async () => {
    const pool = pools.find(p => p.poolId === dialogData.poolId);
    if (!pool) return;
    
    try {
      setLoading(true);
      
      if (!dialogData.amountA || !dialogData.amountB) {
        throw new Error(isSpanish ? 'Por favor ingrese las cantidades' : 'Please enter amounts');
      }
      
      const amountA = parseFloat(dialogData.amountA);
      const amountB = parseFloat(dialogData.amountB);
      
      if (amountA <= 0 || amountB <= 0) {
        throw new Error(isSpanish ? 'Las cantidades deben ser positivas' : 'Amounts must be positive');
      }
      
      switch (dialogData.action) {
        case 'join':
        case 'add':
          await joinLiquidityPool({
            assetACode: pool.assetA.code,
            assetAIssuer: pool.assetA.issuer ?? '',
            assetBCode: pool.assetB.code,
            assetBIssuer: pool.assetB.issuer ?? '',
            maxAmountA: dialogData.amountA,
            maxAmountB: dialogData.amountB
          });
          
          await fetchPoolData();
          
          setSnackbar({
            open: true,
            message: isSpanish 
              ? `Liquidez agregada al Fondo ${pool.poolId}` 
              : `Successfully added liquidity to ${pool.poolId} pool`,
            severity: 'success'
          });
          break;
          
        case 'remove':
          setSnackbar({
            open: true,
            message: isSpanish 
              ? 'Funcionalidad de retiro en desarrollo' 
              : 'Withdraw functionality in development',
            severity: 'info'
          });
          break;
      }
      
      setDialogOpen(false);
      
    } catch (error: any) {
      console.error('Pool operation failed:', error);
      setSnackbar({
        open: true,
        message: error.message || (isSpanish ? 'Error en la operación' : 'Operation failed'),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const openPoolDialog = (poolId: string, action: 'join' | 'add' | 'remove') => {
    setDialogData({
      poolId,
      action,
      amountA: '',
      amountB: '',
      slippage: '0.5'
    });
    setDialogOpen(true);
  };
  
  const updateDialogData = (updates: Partial<PoolDialogData>) => {
    setDialogData(prev => ({ ...prev, ...updates }));
  };
  
  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  const currentPool = pools.find(p => p.poolId === dialogData.poolId);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>
          {isSpanish ? 'Cargando Fondos de Stellar...' : 'Loading Stellar pools...'}
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {isSpanish ? 'Gestión de Fondos de Liquidez' : 'Liquidity Pools Management'}
        </Typography>
        <Tooltip title={isSpanish ? 'Actualizar datos' : 'Refresh data'}>
          <IconButton onClick={fetchPoolData} disabled={refreshing}>
            {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      
      <Stack spacing={3}>
        <Alert severity="info" icon={<InfoIcon />}>
          <Typography variant="body2">
            {isSpanish 
              ? `Datos reales de Stellar ${networkMode}. Fondos encontrados: ${pools.length}`
              : `Real Stellar ${networkMode} data. Pools found: ${pools.length}`
            }
          </Typography>
        </Alert>
        
        {pools.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <PoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              {isSpanish 
                ? 'No se encontraron Fondos de REAL8 en Stellar'
                : 'No REAL8 pools found on Stellar'
              }
            </Typography>
          </Paper>
        ) : (
          <>
            <PoolStatistics pools={pools} isSpanish={isSpanish} />
            <PoolsList 
              pools={pools} 
              isSpanish={isSpanish} 
              hasWallet={!!publicKey}
              onPoolAction={openPoolDialog}
              onNavigateToTab={onNavigateToTab}
            />
          </>
        )}
        
        {publicKey && <AdvancedTools isSpanish={isSpanish} />}
      </Stack>
      
      <PoolOperationDialog
        open={dialogOpen}
        dialogData={dialogData}
        pool={currentPool}
        loading={loading}
        isSpanish={isSpanish}
        onClose={() => setDialogOpen(false)}
        onConfirm={handlePoolOperation}
        onDataChange={updateDialogData}
      />
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={closeSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PoolsManager;