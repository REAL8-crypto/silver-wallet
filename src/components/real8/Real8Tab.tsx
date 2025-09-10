import React from 'react';
import { Box, Typography, Alert, Paper } from '@mui/material';
import Real8FeaturedCard from '../Real8FeaturedCard';
import Real8StatsGrid from './Real8StatsGrid';
import { useWallet } from '../../contexts/WalletContext';
import { REAL8 } from '../../constants/real8Asset';

interface Real8TabProps {
  onSend: () => void;
  onReceive: () => void;
  onAddTrustline: () => void;
}

const Real8Tab: React.FC<Real8TabProps> = ({
  onSend,
  onReceive,
  onAddTrustline
}) => {
  const { unfunded } = useWallet();

  return (
    <Box sx={{ maxWidth: 920, mx: 'auto', pt: 2 }}>
      <Real8FeaturedCard
        onSend={onSend}
        onReceive={onReceive}
        onAddTrustline={onAddTrustline}
      />

      <Real8StatsGrid />

      {unfunded && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Fund the account to enable REAL8 operations.
        </Alert>
      )}

      {/* Single Column Layout */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper
          sx={{
            mb: 2,
            p: 2,
            borderRadius: 2,
            border: theme => `1px solid ${theme.palette.divider}`
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ mb: 1, fontWeight: 600 }}
          >
            About {REAL8.BRAND_NAME}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This section will later include market data, ecosystem metrics, and
            additional utilities for the {REAL8.BRAND_NAME} asset. All numeric
            values shown are placeholders for development.
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 2,
            borderRadius: 2,
            border: theme => `1px solid ${theme.palette.divider}`
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ mb: 1, fontWeight: 600 }}
          >
            Roadmap (Preview)
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            component="div"
          >
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              <li>Live price & liquidity aggregation</li>
              <li>Mini performance chart (7d)</li>
              <li>Circulating vs. locked supply panels</li>
              <li>Pool participation & yield metrics</li>
              <li>Guided on‑ramp / acquisition flow</li>
            </ul>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default Real8Tab;