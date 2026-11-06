import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import {
  Card,
  ErrorBanner,
  PageHeader,
  Screen,
} from '@/components/ui';
import { MapPreview } from '@/components/MapPreview';
import {
  formatAccuracy,
  formatCoordinate,
  formatDateTime,
} from '@/lib/format';
import {
  getRemoteDevices,
  getRemoteLocations,
  type RemoteDevice,
} from '@/lib/remote';
import { useAppTheme } from '@/lib/theme';
import type { LocationRecord } from '@/types/location';

export default function RemoteDeviceScreen() {
  const colors = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [device, setDevice] = useState<RemoteDevice | null>(null);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setError('');
      void Promise.all([
        getRemoteDevices().then((items) =>
          setDevice(items.find((item) => item.id === id) ?? null),
        ),
        getRemoteLocations(id).then(setLocations),
      ]).catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load synchronized locations.',
        );
      });
    }, [id]),
  );

  const latest = locations[0] ?? null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title={device?.device_name ?? 'Device location'}
          subtitle="Last synchronized location"
          right={
            <Pressable onPress={() => router.back()} accessibilityRole="button">
              <Text style={[styles.back, { color: colors.accent }]}>Back</Text>
            </Pressable>
          }
        />
        {error ? <ErrorBanner message={error} /> : null}
        {device ? (
          <Card>
            <Text style={[styles.status, { color: colors.text }]}>
              Tracking was {device.tracking_enabled ? 'ON' : 'OFF'} at last
              contact
            </Text>
            <Text style={[styles.caption, { color: colors.muted }]}>
              Last contact: {formatDateTime(device.updated_at)}
            </Text>
            <Text style={[styles.warning, { color: colors.warning }]}>
              This status may be out of date while the phone is offline.
            </Text>
          </Card>
        ) : null}
        <Card style={styles.mapCard}>
          <MapPreview location={latest} route={locations} height={390} />
        </Card>
        {latest ? (
          <Card>
            <Text style={[styles.caption, { color: colors.muted }]}>
              Last recorded · {formatDateTime(latest.recorded_at)}
            </Text>
            <Text style={[styles.coordinates, { color: colors.text }]}>
              {formatCoordinate(latest.latitude)}, {formatCoordinate(latest.longitude)}
            </Text>
            <Text style={[styles.caption, { color: colors.muted }]}>
              GPS accuracy {formatAccuracy(latest.accuracy)} · Battery{' '}
              {latest.battery_level === null ? 'unavailable' : `${latest.battery_level}%`}
            </Text>
            <Text style={[styles.caption, { color: colors.muted }]}>
              Uploaded to Supabase · {formatDateTime(latest.uploaded_at)}
            </Text>
          </Card>
        ) : (
          <Card>
            <Text style={[styles.status, { color: colors.text }]}>
              No location has been uploaded for this device.
            </Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  back: { fontSize: 14, fontWeight: '700', padding: 8 },
  status: { fontSize: 14, fontWeight: '700' },
  caption: { fontSize: 12, lineHeight: 19, marginTop: 8 },
  warning: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  mapCard: { padding: 10 },
  coordinates: { fontSize: 17, fontWeight: '700', marginTop: 8 },
});
