import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../contexts/WalletContext';
import { 
  Pool as PoolIcon, 
  Add as AddIcon,
  TrendingUp as RewardsIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

// Horizon Integration
import { 
  TARGET_PAIRS, 
  MappedPoolData, 
  UserPoolBalance,
  fetchLiquidityPoolPair,
  fetchAccountPoolBalances,
  createMockPoolData,
  poolCache,
  HORIZON_CONFIG
} from '../../lib/stellar/pools';
import { 
  checkSlippageProtection,
  formatPoolAmount,
  calculatePoolAPY,
  SlippageCheck
} from '../../lib/stellar/simulation';
import * as Stellar from '@stellar/stellar-sdk';

// Legacy pool definitions - now used as fallback (kept for compatibility)
// const LEGACY_ASSETS = {
//   REAL8: { code: 'REAL8', issuer: 'GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD' },
//   XLM:   { code: 'XLM', issuer: null }, // native
//   USDC:  { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
//   EURC:  { code: 'EURC', issuer: 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2' },
//   SLVR:  { code: 'SLVR', issuer: 'GBZVELEQD3WBN3R3VAG64HVBDOZ76ZL6QPLSFGKWPFED33Q3234NSLVR' },
//   GOLD:  { code: 'GOLD', issuer: 'GBC5ZGK6MQU3XG5Y72SXPA7P5R5NHYT2475SNEJB2U3EQ6J56QLVGOLD' }
// } as const;

interface PoolsManagerState {
  pools: MappedPoolData[];
  userBalances: UserPoolBalance[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  networkError: boolean;
  slippageTolerance: number; // Percentage
}

interface SlippageDialogState {
  open: boolean;
  poolId: string | null;
  beforeSnapshot: MappedPoolData | null;
  currentSnapshot: MappedPoolData | null;
  slippageCheck: SlippageCheck | null;
  depositAmounts: { amountA: string; amountB: string } | null;
}

const PoolsManager: React.FC = () => {
  const { i18n } = useTranslation();
  const { publicKey, joinLiquidityPool, networkMode } = useWallet();
  const isSpanish = i18n.language.startsWith('es');
  
  // State management
  const [state, setState] = useState<PoolsManagerState>({
    pools: [],
    userBalances: [],
    loading: false,
    error: null,
    lastUpdated: null,
    networkError: false,
    slippageTolerance: 0.5 // Default 0.5%
  });
  
  const [slippageDialog, setSlippageDialog] = useState<SlippageDialogState>({
    open: false,
    poolId: null,
    beforeSnapshot: null,
    currentSnapshot: null,
    slippageCheck: null,
    depositAmounts: null
  });
  
  const serverRef = useRef<any>(null);
  const fetchInProgressRef = useRef<boolean>(false);
  const autoRefreshIntervalRef = useRef<number | null>(null);
  
  // Initialize Horizon server
  useEffect(() => {
    const horizonUrl = networkMode === 'public' ? HORIZON_CONFIG.PUBLIC : HORIZON_CONFIG.TESTNET;
    try {
      // Use the same pattern as WalletContext for server creation
      const StellarSdk: any = (Stellar as any).default || Stellar;
      const ServerConstructor = StellarSdk.Server || StellarSdk.Horizon?.Server;
      
      if (!ServerConstructor) {
        throw new Error('Server constructor not found');
      }
      
      serverRef.current = new ServerConstructor(horizonUrl);
    } catch (error) {
      console.error('[PoolsManager] Failed to create Horizon server:', error);
      setState(prev => ({ ...prev, networkError: true, error: 'Failed to initialize Horizon connection' }));
    }
  }, [networkMode]);
  
  // Fetch all pool data
  const fetchPoolsData = useCallback(async (force: boolean = false) => {
    if (fetchInProgressRef.current && !force) return;
    if (!serverRef.current) {
      setState(prev => ({ ...prev, networkError: true }));
      return;
    }
    
    fetchInProgressRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const poolsData: MappedPoolData[] = [];
      
      // Fetch data for each target pair
      for (const pair of TARGET_PAIRS) {
        try {
          // Check cache first (unless forced refresh)
          const cacheKey = `${pair.id}`;
          let poolData: MappedPoolData | null = null;
          
          if (!force) {
            poolData = poolCache.get(cacheKey);
          }
          
          if (!poolData) {
            // Fetch from Horizon
            poolData = await fetchLiquidityPoolPair(serverRef.current, pair.assetA, pair.assetB);
            
            if (!poolData) {
              // Pool not found, create mock data
              poolData = createMockPoolData(pair.id, pair.assetA, pair.assetB);
            } else {
              // Cache successful fetch
              poolCache.set(cacheKey, poolData);
            }
          }
          
          poolsData.push(poolData);
        } catch (error) {
          console.warn(`[PoolsManager] Failed to fetch pool ${pair.id}, using mock:`, error);
          poolsData.push(createMockPoolData(pair.id, pair.assetA, pair.assetB));
        }
      }
      
      // Fetch user balances if connected
      let userBalances: UserPoolBalance[] = [];
      if (publicKey && serverRef.current) {
        try {
          userBalances = await fetchAccountPoolBalances(serverRef.current, publicKey);
        } catch (error) {
          console.warn('[PoolsManager] Failed to fetch user balances:', error);
        }
      }
      
      setState(prev => ({
        ...prev,
        pools: poolsData,
        userBalances,
        loading: false,
        lastUpdated: new Date(),
        networkError: false
      }));
      
    } catch (error) {
      console.error('[PoolsManager] fetchPoolsData error:', error);
      
      // Fallback to mock data
      const fallbackPools = TARGET_PAIRS.map(pair => 
        createMockPoolData(pair.id, pair.assetA, pair.assetB)
      );
      
      setState(prev => ({
        ...prev,
        pools: fallbackPools,
        userBalances: [],
        loading: false,
        error: 'Network error - using mock data',
        networkError: true
      }));
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [publicKey]);
  
  // Initial load
  useEffect(() => {
    fetchPoolsData();
  }, [fetchPoolsData]);
  
  // Auto-refresh setup
  useEffect(() => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }
    
    if (publicKey && !state.networkError) {
      autoRefreshIntervalRef.current = window.setInterval(() => {
        fetchPoolsData();
      }, 60000); // 60 seconds
    }
    
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [publicKey, state.networkError, fetchPoolsData]);
  
  // Refresh specific pool
  const refreshPool = async (poolId: string) => {
    const pair = TARGET_PAIRS.find(p => p.id === poolId);
    if (!pair || !serverRef.current) return;
    
    try {
      // Clear cache and force refresh
      poolCache.clear();
      const poolData = await fetchLiquidityPoolPair(serverRef.current, pair.assetA, pair.assetB);
      
      setState(prev => ({
        ...prev,
        pools: prev.pools.map(p => 
          p.id.includes(poolId) ? (poolData || createMockPoolData(pair.id, pair.assetA, pair.assetB)) : p
        ),
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error(`[PoolsManager] Failed to refresh pool ${poolId}:`, error);
    }
  };

  // Slippage Guard for joining pools
  const handleJoinPool = async (poolId: string, amountA: string = '100', amountB: string = '100') => {
    const pool = state.pools.find(p => p.id.includes(poolId));
    if (!pool || !serverRef.current) return;
    
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Take a snapshot of current pool state
      const beforeSnapshot = pool;
      
      // Re-fetch the latest pool data for slippage check
      const pair = TARGET_PAIRS.find(p => p.id === poolId);
      if (!pair) throw new Error('Pool pair not found');
      
      const currentSnapshot = await fetchLiquidityPoolPair(serverRef.current, pair.assetA, pair.assetB);
      if (!currentSnapshot) throw new Error('Failed to fetch current pool state');
      
      // Check for slippage/state changes
      const slippageCheck = checkSlippageProtection(beforeSnapshot, currentSnapshot, state.slippageTolerance);
      
      if (slippageCheck.exceedsTolerance) {
        // Show slippage dialog
        setSlippageDialog({
          open: true,
          poolId,
          beforeSnapshot,
          currentSnapshot,
          slippageCheck,
          depositAmounts: { amountA, amountB }
        });
        setState(prev => ({ ...prev, loading: false }));
        return;
      }
      
      // Proceed with joining pool
      await executePoolJoin(poolId, amountA, amountB);
      
    } catch (error: any) {
      console.error('Failed to join pool:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error?.message || 'Failed to join pool' 
      }));
    }
  };
  
  // Execute the actual pool join operation
  const executePoolJoin = async (poolId: string, amountA: string, amountB: string) => {
    const pair = TARGET_PAIRS.find(p => p.id === poolId);
    if (!pair) return;
    
    try {
      // Call the wallet context method with proper asset structure
      await joinLiquidityPool({
        assetA: { 
          code: pair.assetA.code, 
          issuer: pair.assetA.issuer ?? undefined 
        },
        assetB: { 
          code: pair.assetB.code, 
          issuer: pair.assetB.issuer ?? undefined 
        },
        maxAmountA: amountA,
        maxAmountB: amountB
      });
      
      // Refresh pool data after successful join
      setTimeout(() => {
        fetchPoolsData(true);
      }, 2000);
      
    } catch (error: any) {
      console.error('Failed to execute pool join:', error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };
  
  // Handle slippage dialog confirmation
  const handleSlippageConfirm = async () => {
    if (!slippageDialog.poolId || !slippageDialog.depositAmounts) return;
    
    setSlippageDialog(prev => ({ ...prev, open: false }));
    
    try {
      await executePoolJoin(
        slippageDialog.poolId,
        slippageDialog.depositAmounts.amountA,
        slippageDialog.depositAmounts.amountB
      );
    } catch (error) {
      console.error('Failed to join pool after slippage confirmation:', error);
    }
  };
  
  // Calculate user's current share in a pool
  const getUserSharePercentage = (poolData: MappedPoolData): number => {
    const userBalance = state.userBalances.find(b => b.poolId === poolData.id);
    return userBalance ? userBalance.percentage : 0;
  };
  
  // Get display data for pools with computed values
  const getDisplayPools = () => {
    return state.pools.map(pool => {
      const userSharePercent = getUserSharePercentage(pool);
      const apy = calculatePoolAPY(pool);
      
      return {
        ...pool,
        userSharePercent,
        apy,
        displayTvl: pool.syntheticTvl,
        priceDisplay: `1 REAL8 = ${pool.priceRatioReal8PerOther.toFixed(6)} ${pool.reserveB.asset.split(':')[0] || 'XLM'}`
      };
    });
  };

  const userPools = getDisplayPools().filter(pool => pool.userSharePercent > 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {isSpanish ? 'Gestión de Pools de Liquidez' : 'Liquidity Pools Management'}
        </Typography>
        <Stack direction="row" spacing={1}>
          {state.lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              {isSpanish ? 'Actualizado: ' : 'Updated: '}
              {state.lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          <Tooltip title={isSpanish ? 'Actualizar todo' : 'Refresh all'}>
            <IconButton 
              size="small" 
              onClick={() => fetchPoolsData(true)}
              disabled={state.loading}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {!publicKey ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <PoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            {isSpanish ? 'Conecta una billetera para participar en pools de liquidez' : 'Connect a wallet to participate in liquidity pools'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {/* Network Error Alert */}
          {state.networkError && (
            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="body2">
                {isSpanish 
                  ? 'Usando datos simulados (red inaccesible)'
                  : 'Using mock data (network unreachable)'
                }
              </Typography>
            </Alert>
          )}
          
          {/* Error Alert */}
          {state.error && !state.networkError && (
            <Alert severity="error">
              <Typography variant="body2">{state.error}</Typography>
            </Alert>
          )}

          {/* Slippage Tolerance Setting */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {isSpanish ? 'Configuración de Tolerancia' : 'Tolerance Settings'}
            </Typography>
            <Box sx={{ px: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {isSpanish ? 'Tolerancia máxima de cambio' : 'Max pool change tolerance'}
              </Typography>
              <Slider
                value={state.slippageTolerance}
                onChange={(_, value) => setState(prev => ({ ...prev, slippageTolerance: value as number }))}
                min={0.1}
                max={5.0}
                step={0.1}
                marks={[
                  { value: 0.5, label: '0.5%' },
                  { value: 1.0, label: '1.0%' },
                  { value: 2.0, label: '2.0%' }
                ]}
                valueLabelDisplay="on"
                valueLabelFormat={(value) => `${value}%`}
                sx={{ mt: 2 }}
              />
            </Box>
          </Paper>

          {/* Info Alert */}
          <Alert severity="info" icon={<InfoIcon />}>
            <Typography variant="body2">
              {isSpanish 
                ? 'Los pools de liquidez te permiten ganar recompensas proporcionando liquidez al protocolo. Siempre verifica los riesgos antes de participar.'
                : 'Liquidity pools allow you to earn rewards by providing liquidity to the protocol. Always verify risks before participating.'
              }
            </Typography>
          </Alert>

          {/* User's Active Pools */}
          {userPools.length > 0 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {isSpanish ? 'Tus Pools Activos' : 'Your Active Pools'}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{isSpanish ? 'Pool' : 'Pool'}</TableCell>
                      <TableCell align="right">
                        {isSpanish ? 'Tu Participación' : 'Your Share'}
                      </TableCell>
                      <TableCell align="right">{isSpanish ? 'Valor' : 'Value'}</TableCell>
                      <TableCell align="right">{isSpanish ? 'Recompensas' : 'Rewards'}</TableCell>
                      <TableCell align="center">{isSpanish ? 'Acciones' : 'Actions'}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {userPools.map((pool) => (
                      <TableRow key={pool.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {pool.reserveA.asset.split(':')[0]}/{pool.reserveB.asset.split(':')[0] || 'XLM'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {pool.userSharePercent.toFixed(4)}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            ${(pool.displayTvl * (pool.userSharePercent / 100)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="success.main">
                            {pool.apy.toFixed(1)}% APY
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Button size="small" variant="outlined">
                            {isSpanish ? 'Gestionar' : 'Manage'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* Pool Statistics Overview */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight={600}>
                    {getDisplayPools().length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isSpanish ? 'Pools Disponibles' : 'Available Pools'}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight={600}>
                    ${getDisplayPools().reduce((sum, pool) => sum + pool.displayTvl, 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isSpanish ? 'TVL Total' : 'Total TVL'}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" fontWeight={600}>
                    {(getDisplayPools().reduce((sum, pool) => sum + pool.apy, 0) / getDisplayPools().length).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isSpanish ? 'APY Promedio' : 'Average APY'}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Available Pools */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {isSpanish ? 'Pools Disponibles' : 'Available Pools'}
            </Typography>
            <Stack spacing={2}>
              {state.loading && <LinearProgress />}
              {getDisplayPools().map((pool) => {
                const pairId = TARGET_PAIRS.find(p => 
                  pool.id.includes(p.id) || 
                  (pool.reserveA.asset.includes(p.assetA.code) && pool.reserveB.asset.includes(p.assetB.code))
                )?.id || 'unknown';
                
                return (
                  <Box key={pool.id} sx={{ 
                    p: 2, 
                    border: '1px solid', 
                    borderColor: 'divider', 
                    borderRadius: 2,
                    '&:hover': { borderColor: 'primary.main' }
                  }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: 'flex-start' }}>
                      <Box sx={{ flex: '0 0 auto', minWidth: { xs: '100%', sm: '200px' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PoolIcon color="primary" />
                          <Typography variant="h6" fontWeight={500}>
                            {pool.reserveA.asset.split(':')[0]}/{pool.reserveB.asset.split(':')[0] || 'XLM'}
                          </Typography>
                          {pool.mock && (
                            <Chip 
                              label={isSpanish ? 'Simulado' : 'Mock'} 
                              size="small" 
                              color="default"
                            />
                          )}
                        </Box>
                        {!pool.mock && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {pool.priceDisplay}
                          </Typography>
                        )}
                      </Box>
                      
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            TVL
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            ${formatPoolAmount(pool.displayTvl, 0)}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
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
                        {!pool.mock && (
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {isSpanish ? 'Comisión' : 'Fee'}
                            </Typography>
                            <Typography variant="body2">
                              {pool.feeBp}bp
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {isSpanish ? 'Tu Participación' : 'Your Share'}
                          </Typography>
                          <Typography variant="body2">
                            {pool.userSharePercent > 0 ? `${pool.userSharePercent.toFixed(4)}%` : '0%'}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ flex: '0 0 auto' }}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title={isSpanish ? 'Actualizar' : 'Refresh'}>
                            <IconButton 
                              size="small"
                              onClick={() => refreshPool(pairId)}
                              disabled={state.loading}
                            >
                              <RefreshIcon />
                            </IconButton>
                          </Tooltip>
                          <Button
                            variant={pool.userSharePercent > 0 ? 'outlined' : 'contained'}
                            size="small"
                            startIcon={<AddIcon />}
                            disabled={state.loading}
                            onClick={() => handleJoinPool(pairId)}
                          >
                            {pool.userSharePercent > 0 
                              ? (isSpanish ? 'Agregar Más' : 'Add More')
                              : (isSpanish ? 'Unirse' : 'Join Pool')
                            }
                          </Button>
                        </Stack>
                      </Box>
                    </Box>
                    
                    {pool.userSharePercent > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {isSpanish ? 'Tu participación en el pool' : 'Your pool participation'}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={pool.userSharePercent} 
                          sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    )}
                  </Box>
                );
              })}
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
              <Button variant="outlined" disabled>
                {isSpanish ? 'Crear Pool' : 'Create Pool'}
              </Button>
              <Button variant="outlined" disabled>
                {isSpanish ? 'Análisis de Pool' : 'Pool Analytics'}
              </Button>
              <Button variant="outlined" disabled>
                {isSpanish ? 'Histórico de Recompensas' : 'Rewards History'}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      )}
      
      {/* Slippage Protection Dialog */}
      <Dialog 
        open={slippageDialog.open} 
        onClose={() => setSlippageDialog(prev => ({ ...prev, open: false }))}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            <Typography variant="h6">
              {isSpanish ? 'Estado del Pool Cambiado' : 'Pool State Changed'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {isSpanish 
                ? 'El estado del pool cambió más allá de tu tolerancia'
                : 'Pool state changed beyond your tolerance'
              }
            </Typography>
          </Alert>
          
          {slippageDialog.slippageCheck && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      {isSpanish ? 'Métrica' : 'Metric'}
                    </TableCell>
                    <TableCell align="right">
                      {isSpanish ? 'Antes' : 'Before'}
                    </TableCell>
                    <TableCell align="right">
                      {isSpanish ? 'Ahora' : 'Now'}
                    </TableCell>
                    <TableCell align="right">
                      {isSpanish ? 'Cambio' : 'Change'}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {slippageDialog.slippageCheck.summary.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.metric}</TableCell>
                      <TableCell align="right">{row.before}</TableCell>
                      <TableCell align="right">{row.now}</TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                        {row.changePercent}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {isSpanish 
              ? '¿Deseas continuar con la transacción de todas formas?'
              : 'Do you want to continue with the transaction anyway?'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setSlippageDialog(prev => ({ ...prev, open: false }))}
            color="inherit"
          >
            {isSpanish ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleSlippageConfirm}
            variant="contained"
            color="warning"
          >
            {isSpanish ? 'Aceptar Riesgo' : 'Accept Risk'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PoolsManager;