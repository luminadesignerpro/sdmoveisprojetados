import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sdmoveis.app',
  appName: 'SD Moveis',
  webDir: 'dist',
  plugins: {
    Geolocation: {
      // Ensures the plugin uses high accuracy GPS on Android
    }
  },
  android: {
    // Allow mixed content for Supabase API calls
    allowMixedContent: true,
  }
};

export default config;
