import React, { useState } from 'react';
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
  Collapse,
  TextField,
  IconButton
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../contexts/WalletContext';
import { 
  Pool as PoolIcon, 
  Add as AddIcon,
  TrendingUp as RewardsIcon,
  Info as InfoIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';

// Canonical asset definitions (REAL8 base pairs)
const ASSETS = {
  REAL8: { code: 'REAL8', issuer: 'GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD' },
  XLM:   { code: 'XLM', issuer: null }, // native
  USDC:  { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' }, // centre.io
  EURC:  { code: 'EURC', issuer: 'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2' }, // circle.com
  SLVR:  { code: 'SLVR', issuer: 'GBZVELEQD3WBN3R3VAG64HVBDOZ76ZL6QPLSFGKWPFED33Q3234NSLVR' }, // mintx.co
  GOLD:  { code: 'GOLD', issuer: 'GBC5ZGK6MQU3XG5Y72SXPA7P5R5NHYT2475SNEJB2U3EQ6J56QLVGOLD' }  // mintx.co
} as const;

type PoolSimulation = {
  depositA: string;
  depositB: string;
  adjustedDepositA: number;
  adjustedDepositB: number;
  mintedShares: number;
  newTotalShares: number;
  newUserPct: number;
  ratioAdjusted: boolean;
  error: string | null;
};

/**
 * Simulation helper functions for constant-product pool share minting logic
 */

// Simulate liquidity pool share minting with constant-product logic
function simulatePoolJoin(
  pool: PoolDef,
  depositA: number,
  depositB: number,
  tolerance: number = 0.0005 // 0.05% tolerance
): PoolSimulation {
  const { reserveA, reserveB, totalShares } = pool;
  
  // Guard against invalid inputs
  if (depositA <= 0 || depositB <= 0) {
    return {
      depositA: depositA.toString(),
      depositB: depositB.toString(),
      adjustedDepositA: 0,
      adjustedDepositB: 0,
      mintedShares: 0,
      newTotalShares: totalShares,
      newUserPct: 0,
      ratioAdjusted: false,
      error: 'Deposit amounts must be greater than 0'
    };
  }

  // Guard against missing or zero reserves when totalShares > 0
  if (totalShares > 0 && (reserveA <= 0 || reserveB <= 0)) {
    return {
      depositA: depositA.toString(),
      depositB: depositB.toString(),
      adjustedDepositA: 0,
      adjustedDepositB: 0,
      mintedShares: 0,
      newTotalShares: totalShares,
      newUserPct: 0,
      ratioAdjusted: false,
      error: 'Pool reserves are invalid'
    };
  }

  let adjustedDepositA = depositA;
  let adjustedDepositB = depositB;
  let ratioAdjusted = false;
  let mintedShares = 0;

  if (totalShares === 0) {
    // Empty pool: mintedShares = sqrt(dA * dB)
    mintedShares = Math.sqrt(depositA * depositB);
  } else {
    // Pool has liquidity: check ratio and adjust if needed
    const currentRatio = reserveA / reserveB;
    const depositRatio = depositA / depositB;
    const ratioDiff = Math.abs(currentRatio - depositRatio) / currentRatio;

    if (ratioDiff > tolerance) {
      // Adjust second amount downward to match pool ratio
      const adjustedDepositBFromA = depositA / currentRatio;
      const adjustedDepositAFromB = depositB * currentRatio;

      if (adjustedDepositBFromA <= depositB) {
        adjustedDepositB = adjustedDepositBFromA;
        ratioAdjusted = true;
      } else {
        adjustedDepositA = adjustedDepositAFromB;
        ratioAdjusted = true;
      }
    }

    // Calculate minted shares: min(dA * S / R_A, dB * S / R_B)
    const sharesFromA = (adjustedDepositA * totalShares) / reserveA;
    const sharesFromB = (adjustedDepositB * totalShares) / reserveB;
    mintedShares = Math.min(sharesFromA, sharesFromB);
  }

  // Guard against extremely small mintedShares
  if (mintedShares < 0.000001) {
    return {
      depositA: depositA.toString(),
      depositB: depositB.toString(),
      adjustedDepositA,
      adjustedDepositB,
      mintedShares: 0,
      newTotalShares: totalShares,
      newUserPct: 0,
      ratioAdjusted,
      error: 'Deposit amounts too small to mint shares'
    };
  }

  const newTotalShares = totalShares + mintedShares;
  const newUserPct = (mintedShares / newTotalShares) * 100;

  return {
    depositA: depositA.toString(),
    depositB: depositB.toString(),
    adjustedDepositA,
    adjustedDepositB,
    mintedShares,
    newTotalShares,
    newUserPct,
    ratioAdjusted,
    error: null
  };
}

type PoolDef = {
  id: string;
  assetA: { code: string; issuer: string | null };
  assetB: { code: string; issuer: string | null };
  tvl: number;   // total value locked (USD synthetic for now)
  apy: number;   // mock APY
  userShare: number; // mock user share (liquidity tokens held)
  totalShares: number; // mock total LP tokens
  reserveA: number; // mock reserve for assetA
  reserveB: number; // mock reserve for assetB
};

const PoolsManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { publicKey, joinLiquidityPool } = useWallet();
  const isSpanish = i18n.language.startsWith('es');
  const [loading, setLoading] = useState(false);
  
  // Simulation state
  const [expandedPool, setExpandedPool] = useState<string | null>(null);
  const [simulations, setSimulations] = useState<Record<string, PoolSimulation>>({});

  // Curated REAL8 base pools only (display order fixed)
  // Mock reserves: split TVL roughly half per asset assuming synthetic price of 1 USD
  const availablePools: PoolDef[] = [
    {
      id: 'REAL8-XLM',
      assetA: ASSETS.REAL8,
      assetB: ASSETS.XLM,
      tvl: 125430.50,
      apy: 8.5,
      userShare: 0,
      totalShares: 1_000_000,
      reserveA: 62715.25, // ~50% of TVL
      reserveB: 62715.25  // ~50% of TVL
    },
    {
      id: 'REAL8-USDC',
      assetA: ASSETS.REAL8,
      assetB: ASSETS.USDC,
      tvl: 2450000.75,
      apy: 5.2,
      userShare: 0,
      totalShares: 5_000_000,
      reserveA: 1225000.375, // ~50% of TVL
      reserveB: 1225000.375  // ~50% of TVL
    },
    {
      id: 'REAL8-EURC',
      assetA: ASSETS.REAL8,
      assetB: ASSETS.EURC,
      tvl: 430000.10,
      apy: 4.9,
      userShare: 0,
      totalShares: 750_000,
      reserveA: 215000.05, // ~50% of TVL
      reserveB: 215000.05  // ~50% of TVL
    },
    {
      id: 'REAL8-SLVR',
      assetA: ASSETS.REAL8,
      assetB: ASSETS.SLVR,
      tvl: 98500.42,
      apy: 7.3,
      userShare: 0,
      totalShares: 400_000,
      reserveA: 49250.21, // ~50% of TVL
      reserveB: 49250.21  // ~50% of TVL
    },
    {
      id: 'REAL8-GOLD',
      assetA: ASSETS.REAL8,
      assetB: ASSETS.GOLD,
      tvl: 152300.00,
      apy: 6.1,
      userShare: 0,
      totalShares: 500_000,
      reserveA: 76150.00, // ~50% of TVL
      reserveB: 76150.00  // ~50% of TVL
    }
  ];

  const userPools = availablePools.filter(pool => pool.userShare > 0);

  // Get or create simulation for a pool
  const getSimulation = (poolId: string): PoolSimulation => {
    return simulations[poolId] || {
      depositA: '',
      depositB: '',
      adjustedDepositA: 0,
      adjustedDepositB: 0,
      mintedShares: 0,
      newTotalShares: availablePools.find(p => p.id === poolId)?.totalShares || 0,
      newUserPct: 0,
      ratioAdjusted: false,
      error: null
    };
  };

  // Update simulation when inputs change
  const updateSimulation = (poolId: string, depositA: string, depositB: string) => {
    const pool = availablePools.find(p => p.id === poolId);
    if (!pool) return;

    const dA = parseFloat(depositA) || 0;
    const dB = parseFloat(depositB) || 0;

    const simulation = simulatePoolJoin(pool, dA, dB);
    simulation.depositA = depositA;
    simulation.depositB = depositB;

    setSimulations(prev => ({
      ...prev,
      [poolId]: simulation
    }));
  };

  // Toggle pool expansion
  const togglePoolExpansion = (poolId: string) => {
    setExpandedPool(expandedPool === poolId ? null : poolId);
  };

  const handleJoinPool = async (poolId: string) => {
    const pool = availablePools.find(p => p.id === poolId);
    const simulation = getSimulation(poolId);
    if (!pool) return;
    
    try {
      setLoading(true);
      
      // Use simulated adjusted amounts if available and valid, otherwise placeholder amounts
      const maxAmountA = simulation.adjustedDepositA > 0 ? simulation.adjustedDepositA.toString() : '100';
      const maxAmountB = simulation.adjustedDepositB > 0 ? simulation.adjustedDepositB.toString() : '100';
      
      await joinLiquidityPool({
        assetA: { code: pool.assetA.code, issuer: pool.assetA.issuer ?? undefined },
        assetB: { code: pool.assetB.code, issuer: pool.assetB.issuer ?? undefined },
        maxAmountA,
        maxAmountB
      });
      
      // Reset simulation inputs after successful join
      setSimulations(prev => ({
        ...prev,
        [poolId]: {
          ...getSimulation(poolId),
          depositA: '',
          depositB: '',
          adjustedDepositA: 0,
          adjustedDepositB: 0,
          mintedShares: 0,
          newUserPct: 0,
          ratioAdjusted: false,
          error: null
        }
      }));
      
    } catch (error: any) {
      console.error('Failed to join pool:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        {isSpanish ? 'Gestión de Pools de Liquidez' : 'Liquidity Pools Management'}
      </Typography>

      {!publicKey ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <PoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            {isSpanish ? 'Conecta una billetera para participar en pools de liquidez' : 'Connect a wallet to participate in liquidity pools'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
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
                              {pool.assetA.code}/{pool.assetB.code}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {((pool.userShare / pool.totalShares) * 100).toFixed(4)}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            ${(pool.tvl * (pool.userShare / pool.totalShares)).toFixed(2)}
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
                    {availablePools.length}
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
                    ${availablePools.reduce((sum, pool) => sum + pool.tvl, 0).toLocaleString()}
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
                    {(availablePools.reduce((sum, pool) => sum + pool.apy, 0) / availablePools.length).toFixed(1)}%
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
              {availablePools.map((pool) => {
                const simulation = getSimulation(pool.id);
                const isExpanded = expandedPool === pool.id;
                const canJoin = simulation.mintedShares > 0 && !simulation.error;
                
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
                            {pool.assetA.code}/{pool.assetB.code}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            TVL
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            ${pool.tvl.toLocaleString()}
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
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {isSpanish ? 'Tu Participación' : 'Your Share'}
                          </Typography>
                          <Typography variant="body2">
                            {pool.userShare > 0 ? `${((pool.userShare / pool.totalShares) * 100).toFixed(4)}%` : '0%'}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ flex: '0 0 auto' }}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton
                            size="small"
                            onClick={() => togglePoolExpansion(pool.id)}
                            sx={{ 
                              border: '1px solid',
                              borderColor: 'divider',
                              backgroundColor: isExpanded ? 'primary.main' : 'transparent',
                              color: isExpanded ? 'white' : 'primary.main',
                              '&:hover': {
                                backgroundColor: isExpanded ? 'primary.dark' : 'primary.main',
                                color: 'white'
                              }
                            }}
                          >
                            <CalculateIcon />
                          </IconButton>
                          <Button
                            variant={pool.userShare > 0 ? 'outlined' : 'contained'}
                            size="small"
                            startIcon={<AddIcon />}
                            disabled={loading || (isExpanded && !canJoin)}
                            onClick={() => handleJoinPool(pool.id)}
                          >
                            {pool.userShare > 0 
                              ? (isSpanish ? 'Agregar Más' : 'Add More')
                              : (isSpanish ? 'Unirse' : 'Join Pool')
                            }
                          </Button>
                        </Stack>
                      </Box>
                    </Box>
                    
                    {/* Simulation Panel */}
                    <Collapse in={isExpanded}>
                      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalculateIcon fontSize="small" />
                          {isSpanish ? 'Simulación de Depósito' : 'Deposit Simulation'}
                        </Typography>
                        
                        <Stack spacing={2}>
                          {/* Input Fields */}
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label={`${isSpanish ? 'Cantidad' : 'Amount'} (${pool.assetA.code})`}
                              type="number"
                              value={simulation.depositA}
                              onChange={(e) => updateSimulation(pool.id, e.target.value, simulation.depositB)}
                              error={!!simulation.error}
                              size="small"
                              fullWidth
                              inputProps={{ step: 'any', min: 0 }}
                            />
                            <TextField
                              label={`${isSpanish ? 'Cantidad' : 'Amount'} (${pool.assetB.code})`}
                              type="number"
                              value={simulation.depositB}
                              onChange={(e) => updateSimulation(pool.id, simulation.depositA, e.target.value)}
                              error={!!simulation.error}
                              size="small"
                              fullWidth
                              inputProps={{ step: 'any', min: 0 }}
                            />
                          </Stack>

                          {/* Error Message */}
                          {simulation.error && (
                            <Alert severity="error" sx={{ fontSize: '0.875rem' }}>
                              {simulation.error}
                            </Alert>
                          )}

                          {/* Ratio Warning */}
                          {simulation.ratioAdjusted && !simulation.error && (
                            <Alert severity="warning" sx={{ fontSize: '0.875rem' }}>
                              <Typography variant="body2">
                                {isSpanish 
                                  ? 'Cantidades ajustadas para mantener la proporción del pool' 
                                  : 'Amounts adjusted to maintain pool ratio'
                                }
                              </Typography>
                            </Alert>
                          )}

                          {/* Simulation Results */}
                          {simulation.mintedShares > 0 && !simulation.error && (
                            <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, color: 'success.contrastText' }}>
                              <Typography variant="subtitle2" gutterBottom>
                                {isSpanish ? 'Vista Previa' : 'Preview'}
                              </Typography>
                              <Stack spacing={1}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2">
                                    {isSpanish ? 'Depósito Ajustado:' : 'Adjusted Deposit:'}
                                  </Typography>
                                  <Typography variant="body2" fontWeight={500}>
                                    {simulation.adjustedDepositA.toFixed(6)} {pool.assetA.code}, {simulation.adjustedDepositB.toFixed(6)} {pool.assetB.code}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2">
                                    {isSpanish ? 'Shares Obtenidos (ΔS):' : 'Minted Shares (ΔS):'}
                                  </Typography>
                                  <Typography variant="body2" fontWeight={500}>
                                    {simulation.mintedShares.toFixed(6)}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2">
                                    {isSpanish ? 'Participación Resultante:' : 'Resulting Ownership:'}
                                  </Typography>
                                  <Typography variant="body2" fontWeight={500}>
                                    {simulation.newUserPct.toFixed(4)}%
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2">
                                    {isSpanish ? 'Nuevo Total de Shares:' : 'New Total Shares:'}
                                  </Typography>
                                  <Typography variant="body2" fontWeight={500}>
                                    {simulation.newTotalShares.toLocaleString()}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    </Collapse>
                    
                    {pool.userShare > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {isSpanish ? 'Tu participación en el pool' : 'Your pool participation'}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(pool.userShare / pool.totalShares) * 100} 
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
    </Box>
  );
};

export default PoolsManager;