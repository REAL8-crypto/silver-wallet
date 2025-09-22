import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Card,
  CardContent,
  Stack,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  CircularProgress,
  Tooltip,
  IconButton,
  Snackbar
} from '@mui/material';
import Grid from '@mui/material/Grid'; // Use regular Grid like MarketPricesGrid.tsx
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../contexts/WalletContext';
import { 
  Pool as PoolIcon, 
  Add as AddIcon,
  TrendingUp as RewardsIcon,
  Info as InfoIcon,
  Remove as RemoveIcon,
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon,
  History as HistoryIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { Server, Asset } from '../../utils/stellar';
import { REAL8 } from '../../constants/real8Asset';

// Canonical asset definitions (REAL8 base pairs)
const ASSETS = {
  REAL8: { code: REAL8.CODE, issuer: REAL8.ISSUER },
  XLM:   { code: 'XLM', issuer: null }, // native
  USDC:  { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' }, // centre.io
  EURC:  { code: 'EURC', issuer: 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2' }, // circle.com
  SLVR:  { code: 'SLVR', issuer: 'GBZVELEQD3WBN3R3VAG64HVBDOZ76ZL6QPLSFGKWPFED33Q3234NSLVR' }, // mintx.co
  GOLD:  { code: 'GOLD', issuer: 'GBC5ZGK6MQU3XG5Y72SXPA7P5R5NHYT2475SNEJB2U3EQ6J56QLVGOLD' }  // mintx.co
} as const;

type PoolPosition = {
  id: string;
  assetA: { code: string; issuer: string | null };
  assetB: { code: string; issuer: string | null };
  reserveA: string;
  reserveB: string;
  totalShares: string;
  userShares: string;
  lastUpdated: Date;
};

type PoolDef = {
  poolId: string; // Generated from asset pair
  assetA: { code: string; issuer: string | null };
  assetB: { code: string; issuer: string | null };
  tvl: number;
  apy: number;
  userShare: number;
  totalShares: number;
  reserveA: string;
  reserveB: string;
  priceA: number;
  priceB: number;
  fee: number; // Pool fee percentage
  volume24h: number; // 24h trading volume
  liquidityPoolId?: string; // Actual Stellar liquidity pool ID (if exists)
};

type PoolDialogData = {
  poolId: string;
  action: 'join' | 'add' | 'remove';
  amountA: string;
  amountB: string;
  slippage: string;
};

const PoolsManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { publicKey, joinLiquidityPool, networkMode, balances } = useWallet();
  const isSpanish = i18n.language.startsWith('es');
  
  // State management
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pools, setPools] = useState<PoolDef[]>([]);
  const [userPositions, setUserPositions] = useState<PoolPosition[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState<PoolDialogData>({
    poolId: '',
    action: 'join',
    amountA: '',
    amountB: '',
    slippage: '0.5'
  });
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; severity: 'success' | 'error' | 'info'}>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Create Server instance exactly like WalletContext does
  const serverRef = React.useRef<any | null>(null);
  
  React.useEffect(() => {
    try {
      serverRef.current = new Server(
        networkMode === 'testnet' 
          ? 'https://horizon-testnet.stellar.org'
          : 'https://horizon.stellar.org'
      );
    } catch (error) {
      console.error('Failed to create Stellar server:', error);
      serverRef.current = null;
    }
  }, [networkMode]);

  // Generate pool identifier from asset pair
  const generatePoolId = (assetA: { code: string; issuer: string | null }, assetB: { code: string; issuer: string | null }): string => {
    const aKey = assetA.code === 'XLM' ? 'XLM' : `${assetA.code}:${assetA.issuer}`;
    const bKey = assetB.code === 'XLM' ? 'XLM' : `${assetB.code}:${assetB.issuer}`;
    // Ensure consistent ordering (alphabetical)
    return aKey < bKey ? `${aKey}/${bKey}` : `${bKey}/${aKey}`;
  };

  // Mock data for demonstration - using realistic structure
  const initializePools = useCallback((): PoolDef[] => [
    {
      poolId: generatePoolId(ASSETS.REAL8, ASSETS.XLM),
      assetA: ASSETS.REAL8,
      assetB: ASSETS.XLM,
      tvl: 125430.50,
      apy: 8.5,
      userShare: 0,
      totalShares: 1_000_000,
      reserveA: '50000000000000', // 5M REAL8
      reserveB: '125430500000000', // ~25M XLM
      priceA: 0.025, // REAL8 price in USD
      priceB: 0.12, // XLM price in USD
      fee: 0.3,
      volume24h: 15000
    },
    {
      poolId: generatePoolId(ASSETS.REAL8, ASSETS.USDC),
      assetA: ASSETS.REAL8,
      assetB: ASSETS.USDC,
      tvl: 2450000.75,
      apy: 5.2,
      userShare: 0,
      totalShares: 5_000_000,
      reserveA: '98000000000000', // 9.8M REAL8
      reserveB: '2450000750000', // 2.45M USDC
      priceA: 0.025,
      priceB: 1.00,
      fee: 0.3,
      volume24h: 85000
    },
    {
      poolId: generatePoolId(ASSETS.REAL8, ASSETS.EURC),
      assetA: ASSETS.REAL8,
      assetB: ASSETS.EURC,
      tvl: 430000.10,
      apy: 4.9,
      userShare: 0,
      totalShares: 750_000,
      reserveA: '17200000000000', // 1.72M REAL8
      reserveB: '390909100000', // ~391K EURC
      priceA: 0.025,
      priceB: 1.10,
      fee: 0.3,
      volume24h: 12000
    },
    {
      poolId: generatePoolId(ASSETS.REAL8, ASSETS.SLVR),
      assetA: ASSETS.REAL8,
      assetB: ASSETS.SLVR,
      tvl: 98500.42,
      apy: 7.3,
      userShare: 0,
      totalShares: 400_000,
      reserveA: '3940000000000', // 394K REAL8
      reserveB: '3186400000000', // ~3.19M SLVR
      priceA: 0.025,
      priceB: 0.031,
      fee: 0.3,
      volume24h: 5500
    },
    {
      poolId: generatePoolId(ASSETS.REAL8, ASSETS.GOLD),
      assetA: ASSETS.REAL8,
      assetB: ASSETS.GOLD,
      tvl: 152300.00,
      apy: 6.1,
      userShare: 0,
      totalShares: 500_000,
      reserveA: '6092000000000', // 609K REAL8
      reserveB: '76150000000', // ~76K GOLD
      priceA: 0.025,
      priceB: 2000,
      fee: 0.3,
      volume24h: 8200
    }
  ], []);

  // Discover real liquidity pools from Stellar network
  const discoverLiquidityPools = useCallback(async (): Promise<PoolDef[]> => {
    if (!serverRef.current) {
      console.warn('Stellar server not available, using mock data');
      return initializePools();
    }

    try {
      const discoveredPools: PoolDef[] = [];
      
      // Query each REAL8 pair for existing liquidity pools
      const pairAssets = [ASSETS.XLM, ASSETS.USDC, ASSETS.EURC, ASSETS.SLVR, ASSETS.GOLD];
      
      for (const pairedAsset of pairAssets) {
        try {
          // Create Asset instances using your existing pattern
          const real8Asset = new Asset(ASSETS.REAL8.code, ASSETS.REAL8.issuer);
          const pairedStellarAsset = pairedAsset.code === 'XLM' 
            ? Asset.native() 
            : new Asset(pairedAsset.code, pairedAsset.issuer!);

          // Query Stellar for liquidity pools containing REAL8 and the paired asset
          const poolsResponse = await serverRef.current.liquidityPools()
            .forAssets(real8Asset, pairedStellarAsset)
            .limit(10)
            .call();

          // Process each discovered pool
          for (const pool of poolsResponse.records) {
            const poolId = generatePoolId(ASSETS.REAL8, pairedAsset);
            
            // Extract pool data from Stellar response
            const reserves = pool.reserves;
            const totalShares = pool.total_shares;
            
            // Calculate TVL based on reserves and current prices
            const mockPrices = {
              [REAL8.CODE]: 0.025,
              XLM: 0.12,
              USDC: 1.00,
              EURC: 1.10,
              SLVR: 0.031,
              GOLD: 2000
            };
            
            const reserveAValue = parseFloat(reserves[0].amount) * mockPrices[ASSETS.REAL8.code as keyof typeof mockPrices];
            const reserveBValue = parseFloat(reserves[1].amount) * mockPrices[pairedAsset.code as keyof typeof mockPrices];
            const tvl = reserveAValue + reserveBValue;
            
            // Calculate user's share if they have positions
            let userShares = 0;
            if (publicKey && balances.length > 0) {
              // Look for liquidity pool shares in user's balances
              const lpBalance = balances.find(balance => 
                balance.asset_type === 'liquidity_pool_shares' && 
                balance.liquidity_pool_id === pool.id
              );
              
              if (lpBalance) {
                userShares = parseFloat(lpBalance.balance);
              }
            }
            
            discoveredPools.push({
              poolId,
              assetA: ASSETS.REAL8,
              assetB: pairedAsset,
              tvl,
              apy: 5.5 + Math.random() * 4, // Mock APY calculation
              userShare: userShares,
              totalShares: parseFloat(totalShares),
              reserveA: reserves[0].amount,
              reserveB: reserves[1].amount,
              priceA: mockPrices[ASSETS.REAL8.code as keyof typeof mockPrices],
              priceB: mockPrices[pairedAsset.code as keyof typeof mockPrices],
              fee: 0.30, // Standard Stellar LP fee
              volume24h: Math.random() * 100000, // Mock 24h volume
              liquidityPoolId: pool.id
            });
          }
        } catch (error) {
          console.log(`No liquidity pool found for ${REAL8.CODE}/${pairedAsset.code}:`, error);
          
          // Create placeholder for potential pool (not yet created)
          const poolId = generatePoolId(ASSETS.REAL8, pairedAsset);
          const mockPrices = {
            [REAL8.CODE]: 0.025,
            XLM: 0.12,
            USDC: 1.00,
            EURC: 1.10,
            SLVR: 0.031,
            GOLD: 2000
          };
          
          discoveredPools.push({
            poolId,
            assetA: ASSETS.REAL8,
            assetB: pairedAsset,
            tvl: 0, // No pool exists yet
            apy: 0,
            userShare: 0,
            totalShares: 0,
            reserveA: '0',
            reserveB: '0',
            priceA: mockPrices[ASSETS.REAL8.code as keyof typeof mockPrices],
            priceB: mockPrices[pairedAsset.code as keyof typeof mockPrices],
            fee: 0.30,
            volume24h: 0,
            liquidityPoolId: undefined // Pool doesn't exist yet
          });
        }
      }
      
      return discoveredPools;
      
    } catch (error) {
      console.error('Failed to discover liquidity pools:', error);
      // Fallback to mock data if discovery fails
      return initializePools();
    }
  }, [publicKey, balances, initializePools]);

  // Load pool data on mount with real Stellar integration
  useEffect(() => {
    if (publicKey) {
      // Try to discover real pools from Stellar network
      discoverLiquidityPools().then(setPools);
    } else {
      // Use mock data when no wallet is connected
      const initialPools = initializePools();
      setPools(initialPools);
    }
  }, [publicKey, discoverLiquidityPools, initializePools]);

  // Refresh pools data with real Stellar integration
  const fetchPoolData = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      setRefreshing(true);
      
      // Discover real liquidity pools from Stellar network
      const discoveredPools = await discoverLiquidityPools();
      setPools(discoveredPools);
      
      setSnackbar({
        open: true,
        message: isSpanish ? 'Datos de pools actualizados' : 'Pool data refreshed',
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
  }, [publicKey, discoverLiquidityPools, isSpanish]);

  // Calculate pool share percentage
  const getPoolSharePercentage = (userShare: number, totalShares: number): number => {
    return totalShares > 0 ? (userShare / totalShares) * 100 : 0;
  };

  // Calculate user's USD value in pool
  const getUserPoolValue = (pool: PoolDef): number => {
    const sharePercentage = getPoolSharePercentage(pool.userShare, pool.totalShares);
    return (pool.tvl * sharePercentage) / 100;
  };

  // Handle pool operations
  const handlePoolOperation = async () => {
    const pool = pools.find(p => p.poolId === dialogData.poolId);
    if (!pool) return;

    try {
      setLoading(true);
      
      // Validate inputs
      if (!dialogData.amountA || !dialogData.amountB) {
        throw new Error(isSpanish ? 'Por favor ingresa las cantidades' : 'Please enter amounts');
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
          
          // Refresh pool data after successful operation
          await fetchPoolData();
          
          setSnackbar({
            open: true,
            message: isSpanish 
              ? `Liquidez agregada exitosamente al pool ${pool.poolId}` 
              : `Successfully added liquidity to ${pool.poolId} pool`,
            severity: 'success'
          });
          break;
          
        case 'remove':
          // Implement remove liquidity logic
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

  // Open pool dialog
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

  const userPools = pools.filter(pool => pool.userShare > 0);
  const totalUserValue = userPools.reduce((sum, pool) => sum + getUserPoolValue(pool), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {isSpanish ? 'Gestión de Fondos de Liquidez' : 'Liquidity Pools Management'}
        </Typography>
        {publicKey && (
          <Tooltip title={isSpanish ? 'Actualizar datos' : 'Refresh data'}>
            <IconButton onClick={fetchPoolData} disabled={refreshing}>
              {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {!publicKey ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <PoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            {isSpanish ? 'Conecta una billetera para participar en fondos de liquidez' : 'Connect a wallet to participate in liquidity pools'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {/* Info Alert */}
          <Alert severity="info" icon={<InfoIcon />}>
            <Typography variant="body2">
              {isSpanish 
                ? 'Los fondos de liquidez te permiten ganar recompensas proporcionando liquidez al protocolo. Funcionalidad en desarrollo.'
                : 'Liquidity pools allow you to earn rewards by providing liquidity to the protocol. Feature in development.'
              }
            </Typography>
          </Alert>

          {/* Pool Statistics Overview */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight={600}>
                    {pools.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isSpanish ? 'Fondos Disponibles' : 'Available Pools'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight={600}>
                    ${pools.reduce((sum, pool) => sum + pool.tvl, 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isSpanish ? 'TVL Total' : 'Total TVL'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" fontWeight={600}>
                    {pools.length > 0 ? (pools.reduce((sum, pool) => sum + pool.apy, 0) / pools.length).toFixed(1) : '0'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isSpanish ? 'APY Promedio' : 'Average APY'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main" fontWeight={600}>
                    ${pools.reduce((sum, pool) => sum + pool.volume24h, 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isSpanish ? 'Volumen 24h' : '24h Volume'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Available Pools */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {isSpanish ? 'Fondos REAL8 Disponibles' : 'Available REAL8 Pools'}
            </Typography>
            <Stack spacing={2}>
              {pools.map((pool) => (
                <Box key={pool.poolId} sx={{ 
                  p: 2, 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 2,
                  '&:hover': { borderColor: 'primary.main' },
                  transition: 'border-color 0.2s'
                }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ flex: '0 0 auto', minWidth: { xs: '100%', sm: '200px' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PoolIcon color="primary" />
                        <Typography variant="h6" fontWeight={500}>
                          {pool.assetA.code}/{pool.assetB.code}
                        </Typography>
                        <Chip 
                          label={`${pool.fee}%`} 
                          size="small" 
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    </Box>
                    
                    <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          TVL
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          ${pool.tvl.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          APY
                        </Typography>
                        <Chip 
                          label={`${pool.apy}%`} 
                          size="small" 
                          color="success" 
                          icon={<RewardsIcon />}
                        />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {isSpanish ? 'Volumen 24h' : '24h Volume'}
                        </Typography>
                        <Typography variant="body2">
                          ${pool.volume24h.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {isSpanish ? 'Tu Participación' : 'Your Share'}
                        </Typography>
                        <Typography variant="body2">
                          {pool.userShare > 0 ? `${getPoolSharePercentage(pool.userShare, pool.totalShares).toFixed(4)}%` : '0%'}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ flex: '0 0 auto' }}>
                      <Button
                        variant={pool.userShare > 0 ? 'outlined' : 'contained'}
                        size="small"
                        startIcon={<AddIcon />}
                        disabled
                      >
                        {isSpanish ? 'Próximamente' : 'Coming Soon'}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>

          {/* Pool Actions */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {isSpanish ? 'Herramientas Avanzadas' : 'Advanced Tools'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isSpanish ? 'Funciones adicionales para usuarios experimentados.' : 'Additional features for experienced users.'}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button variant="outlined" startIcon={<PoolIcon />} disabled>
                {isSpanish ? 'Crear Fondo' : 'Create Pool'}
              </Button>
              <Button variant="outlined" startIcon={<AnalyticsIcon />} disabled>
                {isSpanish ? 'Análisis del Fondo' : 'Pool Analytics'}
              </Button>
              <Button variant="outlined" startIcon={<HistoryIcon />} disabled>
                {isSpanish ? 'Histórico de Recompensas' : 'Rewards History'}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
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
