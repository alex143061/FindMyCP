import { supabase } from './supabase';
import type { LocationRecord } from '@/types/location';

export type RemoteDevice = {
  id: string;
  device_name: string;
  device_model: string;
  platform: string;
  tracking_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export async function getRemoteDevices(): Promise<RemoteDevice[]> {
  if (!supabase) throw new Error('Supabase has not been configured.');
  const { data, error } = await supabase
    .from('devices')
    .select(
      'id, device_name, device_model, platform, tracking_enabled, created_at, updated_at',
    )
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getRemoteLocations(
  deviceId: string,
  limit = 100,
): Promise<LocationRecord[]> {
  if (!supabase) throw new Error('Supabase has not been configured.');
  const { data, error } = await supabase
    .from('location_history')
    .select(
      'id, device_id, latitude, longitude, accuracy, altitude, speed, heading, battery_level, recorded_at, uploaded_at',
    )
    .eq('device_id', deviceId)
    .order('recorded_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
