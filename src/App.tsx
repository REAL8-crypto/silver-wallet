import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { WalletProvider } from './contexts/WalletContext';
import WalletDashboard from './components/WalletDashboard';
import SplashScreen from './components/SplashScreen';
import { useAssetPrices } from './hooks/useAssetPrices';
import { useReal8Pairs } from './hooks/useReal8Pairs';
import { PriceUpdateIndicator } from './components/PriceUpdateIndicator';

interface PriceContextValue {
  prices: Record<string, number | null> | undefined;
}

const PriceContext = createContext<PriceContextValue | undefined>(undefined);

export const usePriceContext = () => {
  const context = useContext(PriceContext);
  if (!context) {
    throw new Error('usePriceContext must be used within a PriceProvider');
  }
  return context;
};

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    background: { default: '#f5f5f5' }
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"'
    ].join(',')
  }
});

const AppContent: React.FC<{
  showSplash: boolean;
  onLanguageSelected: () => void;
}> = ({ showSplash, onLanguageSelected }) => {
  const { loading, updating, error } = useAssetPrices();
  const { prices } = useReal8Pairs();

  useEffect(() => {
    console.log("useAssetPrices loading", loading);
    if (error) {
      console.error("useAssetPrices error", error);
    }
  }, [loading, error]);

  return (
    <PriceContext.Provider value={{ prices }}>
      {/* Add the price update indicator here */}
      <PriceUpdateIndicator updating={updating} message="Updating prices..." />
      
      {showSplash ? (
        <SplashScreen onLanguageSelected={onLanguageSelected} />
      ) : (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default'
          }}
        >
          <WalletDashboard />
        </Box>
      )}
    </PriceContext.Provider>
  );
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.minHeight = '100vh';
    document.body.style.backgroundColor = '#f5f5f5';

    const hasSeenSplash = localStorage.getItem('real8_splash_completed');
    if (hasSeenSplash === 'true') {
      setShowSplash(false);
    }
  }, []);

  const handleLanguageSelected = () => {
    setShowSplash(false);
  };

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <WalletProvider>
          <AppContent 
            showSplash={showSplash}
            onLanguageSelected={handleLanguageSelected}
          />
        </WalletProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
};

export default App;