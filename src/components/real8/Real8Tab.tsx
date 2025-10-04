import React from 'react';
import { Box } from '@mui/material';
import Real8FeaturedCard from '../Real8FeaturedCard';

interface Props {
  onSend: () => void;
  onReceive: () => void;
  onAddTrustline: () => void;
}

const Real8Tab: React.FC<Props> = ({ onSend, onReceive, onAddTrustline }) => {
  return (
    <Box sx={{ maxWidth: 920, mx: 'auto' }}>
      <Real8FeaturedCard
        onSend={onSend}
        onReceive={onReceive}
        onAddTrustline={onAddTrustline}
      />
      {/* Roadmap / about blocks can stay here; adapt as needed */}
      <Box sx={{ mb: 4 }}>
        {/* Example placeholder content */}
      </Box>
    </Box>
  );
};

export default Real8Tab;
