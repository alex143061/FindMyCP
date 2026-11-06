import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import {
  getDeviceId,
  getRecordingInterval,
  setSetting,
  upsertDevice,
} from './database';
import { LOCATION_TASK_NAME } from './location-constants';
import type { RecordingInterval } from '@/types/location';

export async function isTracking(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export async function startTracking(
  deviceName: string,
  deviceModel: string,
  interval?: RecordingInterval,
): Promise<void> {
  const foreground = await Location.getForegroundPermissionsAsync();
  const foregroundPermission =
    foreground.status === 'granted'
      ? foreground
      : await Location.requestForegroundPermissionsAsync();
  if (foregroundPermission.status !== 'granted') {
    throw new Error('Location permission is required to start tracking.');
  }

  const background = await Location.getBackgroundPermissionsAsync();
  const backgroundPermission =
    background.status === 'granted'
      ? background
      : await Location.requestBackgroundPermissionsAsync();
  if (backgroundPermission.status !== 'granted') {
    throw new Error(
      'Allow background location in system settings to record while the screen is off.',
    );
  }

  if (Platform.OS === 'android') {
    const notificationPermission = await Notifications.getPermissionsAsync();
    if (!notificationPermission.granted) {
      const requested = await Notifications.requestPermissionsAsync();
      if (!requested.granted) {
        throw new Error(
          'Notification permission is required to show the active tracking service.',
        );
      }
    }
  }

  const selectedInterval = interval ?? (await getRecordingInterval());
  if (await isTracking()) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: selectedInterval * 1000,
    distanceInterval: 0,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'FindMyCP location tracking is active',
      notificationBody: 'Your location is being saved securely on this device.',
      killServiceOnDestroy: false,
    },
  });
  await setSetting('recording_interval', String(selectedInterval));
  await upsertDevice(
    await getDeviceId(),
    deviceName,
    deviceModel,
    true,
  );
}

export async function stopTracking(
  deviceName: string,
  deviceModel: string,
): Promise<void> {
  if (await isTracking()) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
  await upsertDevice(await getDeviceId(), deviceName, deviceModel, false);
}

export async function updateTrackingInterval(
  interval: RecordingInterval,
  deviceName: string,
  deviceModel: string,
): Promise<void> {
  if (await isTracking()) {
    await startTracking(deviceName, deviceModel, interval);
  } else {
    await setSetting('recording_interval', String(interval));
  }
}
