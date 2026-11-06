export type LocationRecord = {
  id: string;
  device_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  battery_level: number | null;
  recorded_at: string;
  uploaded_at: string | null;
};

export type RecordingInterval = 10 | 30 | 60 | 300 | 900;

export const RECORDING_INTERVALS: RecordingInterval[] = [
  10, 30, 60, 300, 900,
];
