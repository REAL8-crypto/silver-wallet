import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.real8.wallet',
  appName: 'REAL8 Wallet',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  }
};

export default config;
