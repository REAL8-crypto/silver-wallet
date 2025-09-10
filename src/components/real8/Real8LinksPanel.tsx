import React from 'react';
import { Paper, Typography, List, ListItemButton, ListItemText } from '@mui/material';
import { REAL8 } from '../../constants/real8Asset';
import { useTranslation } from 'react-i18next';

const Real8LinksPanel: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Learn More
      </Typography>
      <List dense disablePadding>
        <ListItemButton
          component="a"
          href={isEn ? REAL8.BUY_EN : REAL8.BUY_ES}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ListItemText primary="Buy / Acquire REAL8" />
        </ListItemButton>
        <ListItemButton
            component="a"
          href={isEn ? REAL8.DOCS_EN : REAL8.DOCS_ES}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ListItemText primary="Official Site" />
        </ListItemButton>
        <ListItemButton
          component="a"
          href="https://stellar.expert/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ListItemText primary="Stellar Explorer" />
        </ListItemButton>
      </List>
    </Paper>
  );
};

export default Real8LinksPanel;