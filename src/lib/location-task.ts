import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import NetInfo from '@react-native-community/netinfo';
import { getSetting, saveLocation, setSetting } from './database';
import { LOCATION_TASK_NAME } from './location-constants';
import { syncPendingLocations } from './sync';
import { supabase } from './supabase';

type LocationTaskData = { locations: Location.LocationObject[] };

TaskManager.defineTask<LocationTaskData>(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task failed:', error.message);
    return;
  }

  const locations = data?.locations;
  if (!locations?.length) return;

  let batteryLevel: number | null = null;
  try {
    const level = await Battery.getBatteryLevelAsync();
    batteryLevel = level >= 0 ? Math.round(level * 100) : null;
  } catch (batteryError) {
    console.error('Could not read battery level:', batteryError);
  }

  for (const location of locations) {
    try {
      await saveLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        speed: location.coords.speed,
        heading: location.coords.heading,
        battery_level: batteryLevel,
        recorded_at: location.timestamp
          ? new Date(location.timestamp).toISOString()
          : new Date().toISOString(),
      });
      if (await getSetting('last_record_error')) {
        await setSetting('last_record_error', '');
      }
    } catch (saveError) {
      console.error('Could not save background location locally:', saveError);
      try {
        await setSetting(
          'last_record_error',
          saveError instanceof Error
            ? saveError.message
            : 'Could not save a location to this device.',
        );
      } catch (persistError) {
        console.error('Could not persist the location storage error:', persistError);
      }
    }
  }

  try {
    const network = await NetInfo.fetch();
    if (
      network.isConnected === true &&
      network.isInternetReachable !== false &&
      supabase
    ) {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (session) {
        await syncPendingLocations(session.user.id);
      }
    }
  } catch (syncError) {
    console.error('Background location sync failed:', syncError);
  }
});
