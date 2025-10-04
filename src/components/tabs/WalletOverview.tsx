import React from 'react';
import { Box, Typography, Paper, Stack, Button, Card, CardContent } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../contexts/WalletContext';
import { AccountBalanceWallet as WalletIcon, Send as SendIcon, CallReceived as ReceiveIcon } from '@mui/icons-material';

// Import asset icons
import real8Icon from '../../assets/icons/real8-icon.jpg';
import wreal8Icon from '../../assets/icons/wreal8-icon.jpg';
import xlmIcon from '../../assets/icons/xlm-icon.jpg';
import usdcIcon from '../../assets/icons/usdc-icon.jpg';
import eurcIcon from '../../assets/icons/eurc-icon.jpg';
import slvrIcon from '../../assets/icons/slvr-icon.jpg';
import goldIcon from '../../assets/icons/gold-icon.jpg';

// Asset icon mapping
const assetIcons: Record<string, string> = {
  'REAL8': real8Icon,
  'wREAL8': wreal8Icon,
  'XLM': xlmIcon,
  'USDC': usdcIcon,
  'EURC': eurcIcon,
  'SLVR': slvrIcon,
  'GOLD': goldIcon
};

interface WalletOverviewProps {
  onSend?: () => void;
  onReceive?: () => void;
}

const WalletOverview: React.FC<WalletOverviewProps> = ({ onSend, onReceive }) => {
  const { i18n } = useTranslation();
  const { publicKey, balance, balances, unfunded, isTestnet } = useWallet();
  const isSpanish = i18n.language.startsWith('es');

  const xlmBalance = balance || '0';
  const real8Balance = balances.find(b => b.asset_code === 'REAL8')?.balance || '0';

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        {isSpanish ? 'Resumen de Billetera' : 'Wallet Overview'}
      </Typography>
      
      {!publicKey ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <WalletIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {isSpanish ? 'No hay billetera conectada' : 'No wallet connected'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {isSpanish ? 'Crea o importa una billetera para comenzar' : 'Create or import a wallet to get started'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {isTestnet && (
            <Paper sx={{ p: 2, bgcolor: 'info.main', color: 'info.contrastText' }}>
              <Typography variant="body2" textAlign="center">
                {isSpanish ? 'Entorno de Prueba (Testnet)' : 'Testnet Environment'}
              </Typography>
            </Paper>
          )}

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {assetIcons['XLM'] && (
                      <img 
                        src={assetIcons['XLM']} 
                        alt="XLM"
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%',
                          objectFit: 'contain',
                          backgroundColor: '#f5f5f5',
                          padding: '2px'
                        }}
                      />
                    )}
                    <Typography variant="h6" color="primary">
                      XLM Balance
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 500 }}>
                    {parseFloat(xlmBalance).toFixed(7)} XLM
                  </Typography>
                  {unfunded && (
                    <Typography variant="caption" color="warning.main">
                      {isSpanish ? 'Cuenta no financiada' : 'Account not funded'}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {assetIcons['REAL8'] && (
                      <img 
                        src={assetIcons['REAL8']} 
                        alt="REAL8"
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%',
                          objectFit: 'contain',
                          backgroundColor: '#f5f5f5',
                          padding: '2px'
                        }}
                      />
                    )}
                    <Typography variant="h6" color="primary">
                      REAL8 Balance
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 500 }}>
                    {parseFloat(real8Balance).toFixed(4)} REAL8
                  </Typography>
                  {parseFloat(real8Balance) === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {isSpanish ? 'Agregar línea de confianza para recibir REAL8' : 'Add trustline to receive REAL8'}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {isSpanish ? 'Acciones Rápidas' : 'Quick Actions'}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button 
                variant="contained" 
                startIcon={<SendIcon />} 
                size="large"
                onClick={onSend}
                disabled={unfunded || parseFloat(xlmBalance) === 0}
              >
                {isSpanish ? 'Enviar' : 'Send'}
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<ReceiveIcon />} 
                size="large"
                onClick={onReceive}
              >
                {isSpanish ? 'Recibir' : 'Receive'}
              </Button>
            </Stack>
          </Paper>

          {balances.length > 0 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {isSpanish ? 'Todos los Activos' : 'All Assets'}
              </Typography>
              <Stack spacing={1}>
                {balances.map((bal, idx) => {
                  const assetCode = bal.asset_type === 'native' ? 'XLM' : (bal.asset_code || 'Unknown');
                  return (
                    <Box 
                      key={idx} 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        p: 1, 
                        bgcolor: 'grey.50', 
                        borderRadius: 1 
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {assetIcons[assetCode] && (
                          <img 
                            src={assetIcons[assetCode]} 
                            alt={assetCode}
                            style={{ 
                              width: '24px', 
                              height: '24px', 
                              borderRadius: '50%',
                              objectFit: 'contain',
                              backgroundColor: '#f5f5f5',
                              padding: '2px'
                            }}
                          />
                        )}
                        <Typography variant="body1">
                          {assetCode}
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight={500}>
                        {parseFloat(bal.balance).toFixed(bal.asset_type === 'native' ? 7 : 4)}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default WalletOverview;