import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { LocationRecord, RecordingInterval } from '@/types/location';

const DATABASE_NAME = 'findmycp.db';
let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;
let deviceIdPromise: Promise<string> | undefined;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY NOT NULL,
          device_name TEXT NOT NULL,
          device_model TEXT NOT NULL,
          tracking_enabled INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS location_history (
          id TEXT PRIMARY KEY NOT NULL,
          device_id TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          accuracy REAL,
          altitude REAL,
          speed REAL,
          heading REAL,
          battery_level INTEGER,
          recorded_at TEXT NOT NULL,
          uploaded_at TEXT,
          FOREIGN KEY (device_id) REFERENCES devices (id)
        );
        CREATE INDEX IF NOT EXISTS location_history_recorded_at
          ON location_history (recorded_at DESC);
        CREATE INDEX IF NOT EXISTS location_history_pending
          ON location_history (uploaded_at, recorded_at);
      `);
      return database;
    })().catch((error: unknown) => {
      databasePromise = undefined;
      throw error;
    });
  }

  return databasePromise;
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function getDeviceId(): Promise<string> {
  const existingId = await getSetting('device_id');
  if (existingId) {
    return existingId;
  }

  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      const newId = Crypto.randomUUID();
      await setSetting('device_id', newId);
      return newId;
    })().catch((error: unknown) => {
      deviceIdPromise = undefined;
      throw error;
    });
  }
  return deviceIdPromise;
}

export async function upsertDevice(
  deviceId: string,
  deviceName: string,
  deviceModel: string,
  trackingEnabled: boolean,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO devices (id, device_name, device_model, tracking_enabled, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       device_name = excluded.device_name,
       device_model = excluded.device_model,
       tracking_enabled = excluded.tracking_enabled,
       updated_at = excluded.updated_at`,
    deviceId,
    deviceName,
    deviceModel,
    trackingEnabled ? 1 : 0,
    new Date().toISOString(),
  );
}

export async function getDevice(): Promise<{
  id: string;
  device_name: string;
  device_model: string;
  tracking_enabled: boolean;
} | null> {
  const database = await getDatabase();
  const device = await database.getFirstAsync<{
    id: string;
    device_name: string;
    device_model: string;
    tracking_enabled: number;
  }>('SELECT * FROM devices LIMIT 1');
  return device
    ? { ...device, tracking_enabled: device.tracking_enabled === 1 }
    : null;
}

export type NewLocation = Omit<LocationRecord, 'id' | 'uploaded_at'>;

export async function saveLocation(
  location: Omit<NewLocation, 'device_id'>,
): Promise<void> {
  const database = await getDatabase();
  const deviceId = await getDeviceId();
  await database.runAsync(
    `INSERT OR IGNORE INTO location_history
     (id, device_id, latitude, longitude, accuracy, altitude, speed, heading, battery_level, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    Crypto.randomUUID(),
    deviceId,
    location.latitude,
    location.longitude,
    location.accuracy,
    location.altitude,
    location.speed,
    location.heading,
    location.battery_level,
    location.recorded_at,
  );
}

export async function getLatestLocation(): Promise<LocationRecord | null> {
  const database = await getDatabase();
  return database.getFirstAsync<LocationRecord>(
    'SELECT * FROM location_history ORDER BY recorded_at DESC LIMIT 1',
  );
}

export async function getLocationCount(): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM location_history',
  );
  return row?.count ?? 0;
}

export async function getPendingCount(): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM location_history WHERE uploaded_at IS NULL',
  );
  return row?.count ?? 0;
}

export async function getPendingLocations(
  limit = 100,
): Promise<LocationRecord[]> {
  const database = await getDatabase();
  return database.getAllAsync<LocationRecord>(
    'SELECT * FROM location_history WHERE uploaded_at IS NULL ORDER BY recorded_at ASC LIMIT ?',
    limit,
  );
}

export async function markLocationsUploaded(
  ids: string[],
  uploadedAt: string,
): Promise<void> {
  if (ids.length === 0) return;
  const database = await getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  await database.runAsync(
    `UPDATE location_history SET uploaded_at = ? WHERE id IN (${placeholders})`,
    uploadedAt,
    ...ids,
  );
}

export async function getLocationsForDay(
  day: Date,
): Promise<LocationRecord[]> {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const database = await getDatabase();
  return database.getAllAsync<LocationRecord>(
    `SELECT * FROM location_history
     WHERE recorded_at >= ? AND recorded_at < ?
     ORDER BY recorded_at DESC`,
    start.toISOString(),
    end.toISOString(),
  );
}

export async function getRecordingInterval(): Promise<RecordingInterval> {
  const value = Number(await getSetting('recording_interval'));
  if (value === 10 || value === 30 || value === 60 || value === 300 || value === 900) {
    return value;
  }
  return 60;
}
