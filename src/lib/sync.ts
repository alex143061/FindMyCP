import * as Device from 'expo-device';
import * as Location from 'expo-location';
import {
  getDevice,
  getDeviceId,
  getPendingLocations,
  markLocationsUploaded,
  setSetting,
  upsertDevice,
} from './database';
import { LOCATION_TASK_NAME } from './location-constants';
import { supabase } from './supabase';

let activeSync: Promise<number> | null = null;

export function syncPendingLocations(userId: string): Promise<number> {
  if (activeSync) return activeSync;
  activeSync = performSync(userId)
    .then(async (uploaded) => {
      await setSetting('last_sync_error', '');
      return uploaded;
    })
    .catch(async (error: unknown) => {
      try {
        await setSetting(
          'last_sync_error',
          error instanceof Error ? error.message : 'Location sync failed.',
        );
      } catch (persistError) {
        console.error('Could not persist the sync error:', persistError);
      }
      throw error;
    })
    .finally(() => {
      activeSync = null;
    });
  return activeSync;
}

async function performSync(userId: string): Promise<number> {
  if (!supabase) throw new Error('Supabase has not been configured.');

  const localDevice = await getDevice();
  const deviceId = await getDeviceId();
  const deviceName = localDevice?.device_name || Device.deviceName || 'My phone';
  const deviceModel = localDevice?.device_model || Device.modelName || 'Android';
  const trackingEnabled =
    await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  await upsertDevice(deviceId, deviceName, deviceModel, trackingEnabled);
  const { error: deviceError } = await supabase.from('devices').upsert(
    {
      id: deviceId,
      user_id: userId,
      device_name: deviceName,
      device_model: deviceModel,
      platform: Device.osName ?? 'Android',
      tracking_enabled: trackingEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (deviceError) throw deviceError;

  let uploaded = 0;
  for (;;) {
    const batch = await getPendingLocations(100);
    if (batch.length === 0) break;

    const { error } = await supabase.from('location_history').upsert(
      batch.map((location) => ({
        id: location.id,
        device_id: deviceId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        speed: location.speed,
        heading: location.heading,
        battery_level: location.battery_level,
        recorded_at: location.recorded_at,
      })),
      { onConflict: 'id' },
    );
    if (error) throw error;

    const uploadedAt = new Date().toISOString();
    await markLocationsUploaded(
      batch.map((location) => location.id),
      uploadedAt,
    );
    uploaded += batch.length;
  }

  if (uploaded > 0) {
    await setSetting('last_synced_at', new Date().toISOString());
  }
  return uploaded;
}
