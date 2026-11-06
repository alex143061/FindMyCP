import { create } from 'zustand';
import * as Battery from 'expo-battery';
import {
  getLatestLocation,
  getLocationCount,
  getPendingCount,
  getSetting,
  getDevice,
} from '@/lib/database';
import { isTracking } from '@/lib/tracking';
import type { LocationRecord } from '@/types/location';

type TrackingState = {
  latest: LocationRecord | null;
  total: number;
  pending: number;
  active: boolean;
  battery: number | null;
  lastSyncedAt: string | null;
  syncError: string | null;
  recordError: string | null;
  trackingInterrupted: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  setActive: (active: boolean) => void;
};

export const useTrackingStore = create<TrackingState>((set) => ({
  latest: null,
  total: 0,
  pending: 0,
  active: false,
  battery: null,
  lastSyncedAt: null,
  syncError: null,
  recordError: null,
  trackingInterrupted: false,
  loading: true,
  setActive: (active) => set({ active }),
  refresh: async () => {
    set({ loading: true });
    try {
      const [
        latest,
        total,
        pending,
        lastSyncedAt,
        syncError,
        recordError,
        active,
        device,
      ] = await Promise.all([
        getLatestLocation(),
        getLocationCount(),
        getPendingCount(),
        getSetting('last_synced_at'),
        getSetting('last_sync_error'),
        getSetting('last_record_error'),
        isTracking(),
        getDevice(),
      ]);
      let battery: number | null = null;
      try {
        const level = await Battery.getBatteryLevelAsync();
        battery = level >= 0 ? Math.round(level * 100) : null;
      } catch (error) {
        console.error('Could not read battery level:', error);
      }
      set({
        latest,
        total,
        pending,
        lastSyncedAt,
        syncError,
        recordError,
        active,
        battery,
        trackingInterrupted: device?.tracking_enabled === true && !active,
      });
    } finally {
      set({ loading: false });
    }
  },
}));
