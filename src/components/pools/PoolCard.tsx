import React from 'react';
import { Box, Typography, Chip, Button, Alert } from '@mui/material';
import { 
  Pool as PoolIcon, 
  Add as AddIcon,
  TrendingUp as RewardsIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import type { PoolDef } from '../../types/pools';
import { getPoolSharePercentage } from '../../utils/poolCalculations';
import { useWallet } from '../../contexts/WalletContext';
import { useTrustlineCheck } from '../../hooks/useTrustlineCheck';

interface PoolCardProps {
  pool: PoolDef;
  isSpanish: boolean;
  onAction: (poolId: string, action: 'join' | 'add' | 'remove') => void;
  onNavigateToTab?: (tab: string) => void;
}

export const PoolCard: React.FC<PoolCardProps> = ({ 
  pool, 
  isSpanish, 
  onAction,
  onNavigateToTab
}) => {
  const { balances, publicKey } = useWallet();
  const { missingTrustlines, getAllMissingAssetCodes } = useTrustlineCheck(balances);
  
  const sharePercentage = getPoolSharePercentage(pool.userShare, pool.totalShares);

  // Check for missing trustlines
  const poolAssets = [
    { code: pool.assetA.code, issuer: pool.assetA.issuer },
    { code: pool.assetB.code, issuer: pool.assetB.issuer }
  ];
  
  const missing = missingTrustlines(poolAssets);
  const missingAssetCodes = getAllMissingAssetCodes(poolAssets);
  const canJoinPool = missing.length === 0 && !!publicKey;
  const hasMissingTrustlines = missing.length > 0 && !!publicKey;

  const handleAction = () => {
    if (hasMissingTrustlines) {
      return;
    }
    onAction(pool.poolId, pool.userShare > 0 ? 'add' : 'join');
  };

  return (
    <Box sx={{ 
      p: 2, 
      border: '1px solid', 
      borderColor: hasMissingTrustlines ? 'warning.main' : 'divider', 
      borderRadius: 2,
      '&:hover': { borderColor: hasMissingTrustlines ? 'warning.main' : 'primary.main' },
      transition: 'border-color 0.2s',
      backgroundColor: hasMissingTrustlines ? 'warning.50' : 'transparent'
    }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: 2
      }}>
        {/* Pool Name and Badges */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <PoolIcon color="primary" />
          <Typography variant="h6" fontWeight={500}>
            {pool.assetA.code}/{pool.assetB.code}
          </Typography>
          <Chip 
            label={`${pool.fee}%`} 
            size="small" 
            variant="outlined"
          />
          {pool.tvl === 0 && (
            <Chip 
              label={isSpanish ? 'Sin crear' : 'Not created'} 
              size="small" 
              color="warning"
            />
          )}
        </Box>
        
        {/* Pool Statistics Grid */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, 
          gap: 2 
        }}>
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
              label={`${pool.apy.toFixed(1)}%`} 
              size="small" 
              color={pool.apy > 0 ? "success" : "default"}
              icon={pool.apy > 0 ? <RewardsIcon /> : undefined}
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
              {pool.userShare > 0 ? `${sharePercentage.toFixed(4)}%` : '0%'}
            </Typography>
          </Box>
        </Box>
        
        {/* Action Button - Full width on mobile, auto width on larger screens */}
        <Box sx={{ 
          display: 'flex',
          justifyContent: { xs: 'stretch', sm: 'flex-end' }
        }}>
          <Button
            variant={pool.userShare > 0 ? 'outlined' : 'contained'}
            size="small"
            startIcon={hasMissingTrustlines ? <WarningIcon /> : <AddIcon />}
            onClick={handleAction}
            disabled={!canJoinPool || hasMissingTrustlines}
            color={hasMissingTrustlines ? 'warning' : 'primary'}
            sx={{ 
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: 120 } 
            }}
          >
            {pool.userShare > 0
              ? (isSpanish ? 'Agregar' : 'Add More')
              : (isSpanish ? 'Unirse' : 'Join Pool')
            }
          </Button>
        </Box>
      </Box>
      
      {/* Missing Trustlines Alert */}
      {hasMissingTrustlines && (
        <Alert 
          severity="warning" 
          icon={<WarningIcon />}
          sx={{ mt: 2 }}
        >
          <Typography variant="body2">
            {isSpanish 
              ? `Necesitas establecer líneas de confianza para: ${missingAssetCodes.join(', ')}`
              : `You need to establish trustlines for: ${missingAssetCodes.join(', ')}`
            }
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {isSpanish ? 'Ve a la pestaña ' : 'Go to the '}
            <Typography 
              component="span"
              variant="caption"
              sx={{ 
                color: 'primary.main', 
                cursor: 'pointer',
                textDecoration: 'underline',
                fontWeight: 500,
                '&:hover': { 
                  color: 'primary.dark',
                  textDecoration: 'underline'
                }
              }}
              onClick={() => onNavigateToTab?.('assets')}
            >
              {isSpanish ? '"Gestión de Activos"' : '"Assets Management"'}
            </Typography>
            {isSpanish ? ' para agregarlas.' : ' tab to add them.'}
          </Typography>
        </Alert>
      )}
    </Box>
  );
}