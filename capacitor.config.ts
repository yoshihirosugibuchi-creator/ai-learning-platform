import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.ale.learning',
  appName: 'ALE学習',
  webDir: 'out',
  server: {
    url: 'https://ai-learning-platform-next.vercel.app',
    cleartext: false,
    hostname: 'ai-learning-platform-next.vercel.app',
  },
  ios: {
    scheme: 'ALE学習',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#4f46e5',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#4f46e5',
    },
  },
}

export default config
