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
  Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../contexts/WalletContext';
import { 
  Pool as PoolIcon, 
  Add as AddIcon,
  TrendingUp as RewardsIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const PoolsManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { publicKey, balances, joinLiquidityPool } = useWallet();
  const isSpanish = i18n.language.startsWith('es');
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration - in real implementation this would come from Horizon API
  const availablePools = [
    {
      id: 'XLM-REAL8',
      assetA: { code: 'XLM', issuer: null },
      assetB: { code: 'REAL8', issuer: 'GBVYYQ7XXRZW6ZCNNCL2X2THNPQ6IM4O47HAA25JTAG7Z3CXJCQ3W4CD' },
      tvl: 125430.50,
      apy: 8.5,
      userShare: 0,
      totalShares: 1000000
    },
    {
      id: 'XLM-USDC',
      assetA: { code: 'XLM', issuer: null },
      assetB: { code: 'USDC', issuer: 'GA5ZSEJYB37JRC2FQI6WK4NDLPXUZL3AKOEDGOPYUFQHE2PDLJ4ALU8A' },
      tvl: 2450000.75,
      apy: 5.2,
      userShare: 0,
      totalShares: 5000000
    }
  ];

  const userPools = availablePools.filter(pool => pool.userShare > 0);

  const handleJoinPool = async (poolId: string) => {
    try {
      setLoading(true);
      // This is a placeholder - real implementation would need more parameters
      await joinLiquidityPool({
        assetA: { code: 'XLM' },
        assetB: { code: 'REAL8' },
        maxAmountA: '100',
        maxAmountB: '100'
      });
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
                      <TableCell align="right">{isSpanish ? 'Tu Participación' : 'Your Share'}</TableCell>
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
              {availablePools.map((pool) => (
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
                        <Button
                          variant={pool.userShare > 0 ? "outlined" : "contained"}
                          size="small"
                          startIcon={<AddIcon />}
                          disabled={loading}
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