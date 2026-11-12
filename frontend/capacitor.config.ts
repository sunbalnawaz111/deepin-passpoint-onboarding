import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.passpoint.onboarding',
  appName: 'Passpoint Wi-Fi',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
  plugins: {
    WifiPasspoint: {
      enabled: true,
    },
  },
};

export default config;
