import React from 'react';
import { Paper, Typography, Stack, Button } from '@mui/material';
import { 
  Pool as PoolIcon, 
  Analytics as AnalyticsIcon,
  History as HistoryIcon
} from '@mui/icons-material';

interface AdvancedToolsProps {
  isSpanish: boolean;
}

export const AdvancedTools: React.FC<AdvancedToolsProps> = ({ isSpanish }) => {
  const tools = [
    {
      icon: <PoolIcon />,
      label: isSpanish ? 'Crear Fondo' : 'Create Pool',
      onClick: () => console.log('Create pool clicked')
    },
    {
      icon: <AnalyticsIcon />,
      label: isSpanish ? 'Análisis del Fondo' : 'Pool Analytics',
      onClick: () => console.log('Pool analytics clicked')
    },
    {
      icon: <HistoryIcon />,
      label: isSpanish ? 'Histórico de Recompensas' : 'Rewards History',
      onClick: () => console.log('Rewards history clicked')
    }
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {isSpanish ? 'Herramientas Avanzadas' : 'Advanced Tools'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {isSpanish 
          ? 'Funciones adicionales para usuarios experimentados.' 
          : 'Additional features for experienced users.'
        }
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {tools.map((tool, index) => (
          <Button
            key={index}
            variant="outlined"
            startIcon={tool.icon}
            onClick={tool.onClick}
            disabled={true} // Coming soon functionality
          >
            {tool.label}
          </Button>
        ))}
      </Stack>
    </Paper>
  );
};