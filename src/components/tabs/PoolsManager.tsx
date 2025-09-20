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
  Snackbar,
  Grid
} from '@mui/material';
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
  // Generate pool identifier from asset pair
  const generatePoolId = (assetA: { code: string; issuer: string | null }, assetB: { code: string; issuer: string | null }): string => {
    const aKey = assetA.code === 'XLM' ? 'XLM' : `${assetA.code}:${assetA.issuer}`;
    const bKey = assetB.code === 'XLM' ? 'XLM' : `${assetB.code}:${assetB.issuer}`;
    // Ensure consistent ordering (alphabetical)
    return aKey < bKey ? `${aKey}/${bKey}` : `${bKey}/${aKey}`;
  };

  // Discover liquidity pools from Stellar network
  const discoverLiquidityPools = useCallback(async (): Promise<PoolDef[]> => {
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
          const poolsResponse = await server.liquidityPools()
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
            // Note: In production, you'd fetch real prices from price feeds
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
  }, [server, publicKey, balances]);

  // Initial mock data for demonstration (fallback)
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

  // Load pool data on mount
  useEffect(() => {
    if (publicKey) {
      // Try to discover real pools (currently using mock data)
      discoverLiquidityPools().then(setPools);
    } else {
      // Use mock data when no wallet is connected
      const initialPools = initializePools();
      setPools(initialPools);
    }
  }, [publicKey, discoverLiquidityPools, initializePools]);

  // Fetch real pool data (placeholder for future integration)
  const fetchPoolData = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      setRefreshing(true);
      
      // Discover pools using mock data for now
      // TODO: Integrate with your existing Stellar SDK setup
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
          // Check if pool exists on Stellar
          if (!pool.liquidityPoolId) {
            // Pool doesn't exist yet - would need to create it first
            setSnackbar({
              open: true,
              message: isSpanish 
                ? 'Este pool aún no existe. Se necesita crear primero el pool de liquidez.' 
                : 'This pool does not exist yet. The liquidity pool needs to be created first.',
              severity: 'warning'
            });
            setDialogOpen(false);
            return;
          }

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

  // Calculate proportional amounts for equal value deposits
  const calculateProportionalAmount = (inputAmount: string, isAssetA: boolean) => {
    const pool = pools.find(p => p.poolId === dialogData.poolId);
    if (!pool || !inputAmount || pool.totalShares === 0) return '';

    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount <= 0) return '';

    // Calculate based on current pool ratio
    const reserveARatio = parseFloat(pool.reserveA) / 1e14; // Convert from stroops
    const reserveBRatio = parseFloat(pool.reserveB) / 1e14;
    
    if (reserveARatio === 0 || reserveBRatio === 0) {
      // Pool is empty, use 1:1 value ratio based on prices
      const valueRatio = pool.priceA / pool.priceB;
      if (isAssetA) {
        return (amount / valueRatio).toFixed(6);
      } else {
        return (amount * valueRatio).toFixed(6);
      }
    }

    const ratio = reserveARatio / reserveBRatio;

    if (isAssetA) {
      // Calculate assetB amount based on assetA input
      return (amount / ratio).toFixed(6);
    } else {
      // Calculate assetA amount based on assetB input
      return (amount * ratio).toFixed(6);
    }
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
                ? 'Los fondos de liquidez te permiten ganar recompensas proporcionando liquidez al protocolo. Siempre verifica los riesgos antes de participar.'
                : 'Liquidity pools allow you to earn rewards by providing liquidity to the protocol. Always verify risks before participating.'
              }
            </Typography>
          </Alert>

          {/* User's Portfolio Summary */}
          {userPools.length > 0 && (
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {isSpanish ? 'Tu Portafolio de Liquidez' : 'Your Liquidity Portfolio'}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {isSpanish ? 'Pools Activos' : 'Active Pools'}
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {userPools.length}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {isSpanish ? 'Valor Total' : 'Total Value'}
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      ${totalUserValue.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {isSpanish ? 'APY Promedio' : 'Avg APY'}
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {(userPools.reduce((sum, pool) => sum + pool.apy, 0) / userPools.length).toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {isSpanish ? 'Recompensas Est.' : 'Est. Rewards'}
                    </Typography>
                    <Typography variant="h5" fontWeight={600} color="success.light">
                      ${(totalUserValue * 0.05).toFixed(2)}/día
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* User's Active Pools */}
          {userPools.length > 0 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {isSpanish ? 'Tus Fondos Activos' : 'Your Active Pools'}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{isSpanish ? 'Pool' : 'Pool'}</TableCell>
                      <TableCell align="right">{isSpanish ? 'Participación' : 'Share'}</TableCell>
                      <TableCell align="right">{isSpanish ? 'Valor' : 'Value'}</TableCell>
                      <TableCell align="right">APY</TableCell>
                      <TableCell align="right">{isSpanish ? 'Recompensas/día' : 'Daily Rewards'}</TableCell>
                      <TableCell align="center">{isSpanish ? 'Acciones' : 'Actions'}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {userPools.map((pool) => {
                      const userValue = getUserPoolValue(pool);
                      const dailyRewards = (userValue * pool.apy) / 365 / 100;
                      return (
                        <TableRow key={pool.poolId}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PoolIcon color="primary" fontSize="small" />
                              <Typography variant="body2" fontWeight={500}>
                                {pool.assetA.code}/{pool.assetB.code}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {getPoolSharePercentage(pool.userShare, pool.totalShares).toFixed(4)}%
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={500}>
                              ${userValue.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={`${pool.apy.toFixed(1)}%`} 
                              size="small" 
                              color="success" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="success.main" fontWeight={500}>
                              ${dailyRewards.toFixed(4)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <Tooltip title={isSpanish ? 'Agregar liquidez' : 'Add liquidity'}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => openPoolDialog(pool.poolId, 'add')}
                                >
                                  <AddIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={isSpanish ? 'Retirar liquidez' : 'Remove liquidity'}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => openPoolDialog(pool.poolId, 'remove')}
                                >
                                  <RemoveIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* Pool Statistics Overview */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
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
            <Grid item xs={12} sm={6} md={3}>
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
            <Grid item xs={12} sm={6} md={3}>
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
            <Grid item xs={12} sm={6} md={3}>
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
              {isSpanish ? 'Fondos Disponibles' : 'Available Pools'}
            </Typography>
            <Stack spacing={2}>
              {pools.map((pool) => (
                <Box key={pool.poolId} sx={{ 
                  p: 2, 
                  border: '1px solid', 
                  borderColor: pool.liquidityPoolId ? 'divider' : 'warning.main', 
                  borderRadius: 2,
                  '&:hover': { borderColor: 'primary.main' },
                  transition: 'border-color 0.2s',
                  opacity: pool.liquidityPoolId ? 1 : 0.7
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
                        {!pool.liquidityPoolId && (
                          <Chip 
                            label={isSpanish ? 'No Creado' : 'Not Created'} 
                            size="small" 
                            color="warning"
                            sx={{ ml: 1 }}
                          />
                        )}
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
                        disabled={loading || !pool.liquidityPoolId}
                        onClick={() => openPoolDialog(pool.poolId, pool.userShare > 0 ? 'add' : 'join')}
                      >
                        {!pool.liquidityPoolId 
                          ? (isSpanish ? 'Pool No Existe' : 'Pool Not Found')
                          : pool.userShare > 0 
                            ? (isSpanish ? 'Agregar Más' : 'Add More')
                            : (isSpanish ? 'Unirse' : 'Join Pool')
                        }
                      </Button>
                    </Box>
                  </Box>
                  
                  {pool.userShare > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {isSpanish ? 'Tu participación en el fondo' : 'Your pool participation'}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(getPoolSharePercentage(pool.userShare, pool.totalShares), 100)} 
                        sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  )}
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

      {/* Pool Operation Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PoolIcon color="primary" />
            <Typography variant="h6">
              {dialogData.action === 'join' 
                ? (isSpanish ? 'Unirse al Fondo' : 'Join Pool')
                : dialogData.action === 'add'
                ? (isSpanish ? 'Agregar Liquidez' : 'Add Liquidity')
                : (isSpanish ? 'Retirar Liquidez' : 'Remove Liquidity')
              }
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {dialogData.poolId}
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {dialogData.action !== 'remove' && (
              <>
                <Alert severity="warning" icon={<WarningIcon />}>
                  <Typography variant="body2">
                    {isSpanish 
                      ? 'Asegúrate de tener suficientes fondos de ambos activos. Se requieren cantidades proporcionales.'
                      : 'Make sure you have sufficient funds of both assets. Proportional amounts are required.'
                    }
                  </Typography>
                </Alert>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {isSpanish ? 'Cantidad del Primer Activo' : 'First Asset Amount'}
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={dialogData.amountA}
                    onChange={(e) => {
                      const newAmountA = e.target.value;
                      const proportionalB = calculateProportionalAmount(newAmountA, true);
                      setDialogData(prev => ({
                        ...prev,
                        amountA: newAmountA,
                        amountB: proportionalB
                      }));
                    }}
                    placeholder={`${pools.find(p => p.poolId === dialogData.poolId)?.assetA.code || ''} amount`}
                    inputProps={{ step: "0.000001", min: "0" }}
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {isSpanish ? 'Cantidad del Segundo Activo' : 'Second Asset Amount'}
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={dialogData.amountB}
                    onChange={(e) => {
                      const newAmountB = e.target.value;
                      const proportionalA = calculateProportionalAmount(newAmountB, false);
                      setDialogData(prev => ({
                        ...prev,
                        amountB: newAmountB,
                        amountA: proportionalA
                      }));
                    }}
                    placeholder={`${pools.find(p => p.poolId === dialogData.poolId)?.assetB.code || ''} amount`}
                    inputProps={{ step: "0.000001", min: "0" }}
                  />
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {isSpanish ? 'Tolerancia de Deslizamiento (%)' : 'Slippage Tolerance (%)'}
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={dialogData.slippage}
                    onChange={(e) => setDialogData(prev => ({ ...prev, slippage: e.target.value }))}
                    placeholder="0.5"
                    inputProps={{ step: "0.1", min: "0.1", max: "50" }}
                    helperText={isSpanish 
                      ? 'Recomendado: 0.5% para pools estables, 1-3% para pools volátiles'
                      : 'Recommended: 0.5% for stable pools, 1-3% for volatile pools'
                    }
                  />
                </Box>

                {/* Transaction Summary */}
                {dialogData.amountA && dialogData.amountB && (
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {isSpanish ? 'Resumen de la Transacción' : 'Transaction Summary'}
                    </Typography>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">
                          {pools.find(p => p.poolId === dialogData.poolId)?.assetA.code}:
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {parseFloat(dialogData.amountA).toFixed(6)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">
                          {pools.find(p => p.poolId === dialogData.poolId)?.assetB.code}:
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {parseFloat(dialogData.amountB).toFixed(6)}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">
                          {isSpanish ? 'Valor Estimado:' : 'Estimated Value:'}
                        </Typography>
                        <Typography variant="body2" fontWeight={500} color="primary">
                          ${((parseFloat(dialogData.amountA) * (pools.find(p => p.poolId === dialogData.poolId)?.priceA || 0)) + 
                             (parseFloat(dialogData.amountB) * (pools.find(p => p.poolId === dialogData.poolId)?.priceB || 0))).toFixed(2)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                )}
              </>
            )}

            {dialogData.action === 'remove' && (
              <>
                <Alert severity="info">
                  <Typography variant="body2">
                    {isSpanish 
                      ? 'Selecciona el porcentaje de tu posición que deseas retirar.'
                      : 'Select the percentage of your position you want to withdraw.'
                    }
                  </Typography>
                </Alert>
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {isSpanish ? 'Porcentaje a Retirar' : 'Withdrawal Percentage'}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => setDialogData(prev => ({ ...prev, amountA: '25' }))}
                    >
                      25%
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => setDialogData(prev => ({ ...prev, amountA: '50' }))}
                    >
                      50%
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => setDialogData(prev => ({ ...prev, amountA: '75' }))}
                    >
                      75%
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => setDialogData(prev => ({ ...prev, amountA: '100' }))}
                    >
                      100%
                    </Button>
                  </Stack>
                  <TextField
                    fullWidth
                    type="number"
                    value={dialogData.amountA}
                    onChange={(e) => setDialogData(prev => ({ ...prev, amountA: e.target.value }))}
                    placeholder="Percentage to withdraw"
                    inputProps={{ step: "1", min: "1", max: "100" }}
                    sx={{ mt: 1 }}
                  />
                </Box>

                {dialogData.amountA && (
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {isSpanish ? 'Recibirás Aproximadamente' : 'You Will Receive Approximately'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isSpanish ? 'Los valores exactos se calcularán al momento de la transacción' : 'Exact amounts will be calculated at transaction time'}
                    </Typography>
                  </Paper>
                )}
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            {isSpanish ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button 
            variant="contained" 
            onClick={handlePoolOperation}
            disabled={loading || !dialogData.amountA || (!dialogData.amountB && dialogData.action !== 'remove')}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading 
              ? (isSpanish ? 'Procesando...' : 'Processing...')
              : dialogData.action === 'join' 
                ? (isSpanish ? 'Unirse al Fondo' : 'Join Pool')
                : dialogData.action === 'add'
                ? (isSpanish ? 'Agregar Liquidez' : 'Add Liquidity')
                : (isSpanish ? 'Retirar Liquidez' : 'Remove Liquidity')
            }
          </Button>
        </DialogActions>
      </Dialog>

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
