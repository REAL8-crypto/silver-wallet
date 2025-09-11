import React from 'react';
import { Box, Typography, Paper, Stack, Button, Card, CardContent } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../contexts/WalletContext';
import { AccountBalanceWallet as WalletIcon, Send as SendIcon, CallReceived as ReceiveIcon } from '@mui/icons-material';

const WalletOverview: React.FC = () => {
  const { t, i18n } = useTranslation();
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
                  <Typography variant="h6" color="primary" gutterBottom>
                    XLM Balance
                  </Typography>
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
                  <Typography variant="h6" color="primary" gutterBottom>
                    REAL8 Balance
                  </Typography>
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
              <Button variant="contained" startIcon={<SendIcon />} size="large">
                {isSpanish ? 'Enviar' : 'Send'}
              </Button>
              <Button variant="outlined" startIcon={<ReceiveIcon />} size="large">
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
                {balances.map((bal, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body1">
                      {bal.asset_type === 'native' ? 'XLM' : bal.asset_code || 'Unknown'}
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {parseFloat(bal.balance).toFixed(bal.asset_type === 'native' ? 7 : 4)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default WalletOverview;