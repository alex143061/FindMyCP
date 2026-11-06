import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'FindMyCP',
  slug: config.slug ?? 'FindMyCP',
  scheme: 'findmycp',
  plugins: [
    'expo-router',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'FindMyCP uses your location to record this device while tracking is on.',
        locationAlwaysAndWhenInUsePermission:
          'FindMyCP records this device location in the background only while tracking is on.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        isIosBackgroundLocationEnabled: true,
      },
    ],
    'expo-notifications',
    'expo-sqlite',
    'expo-secure-store',
  ],
  android: {
    ...config.android,
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'POST_NOTIFICATIONS',
      'INTERNET',
      'ACCESS_NETWORK_STATE',
    ],
    blockedPermissions: ['android.permission.RECEIVE_BOOT_COMPLETED'],
    config: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      ? {
          ...config.android?.config,
          googleMaps: {
            apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
          },
        }
      : config.android?.config,
  },
  ios: {
    ...config.ios,
    infoPlist: {
      ...config.ios?.infoPlist,
      UIBackgroundModes: ['location'],
    },
  },
  experiments: {
    ...config.experiments,
    typedRoutes: true,
  },
});
