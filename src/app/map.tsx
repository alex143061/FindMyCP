import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, ErrorBanner, PageHeader, Screen } from '@/components/ui';
import { MapPreview } from '@/components/MapPreview';
import { getLocationsForDay, getLatestLocation } from '@/lib/database';
import { formatAccuracy, formatCoordinate, formatDateTime } from '@/lib/format';
import { useAppTheme } from '@/lib/theme';
import type { LocationRecord } from '@/types/location';

export default function MapScreen() {
  const colors = useAppTheme();
  const [latest, setLatest] = useState<LocationRecord | null>(null);
  const [route, setRoute] = useState<LocationRecord[]>([]);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      setError('');
      void Promise.all([
        getLatestLocation().then(setLatest),
        getLocationsForDay(new Date()).then(setRoute),
      ]).catch((error: unknown) => {
        console.error('Could not load map data:', error);
        setError(
          error instanceof Error ? error.message : 'Could not load map data.',
        );
      });
    }, []),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="Location map"
          subtitle="Last known position on this device"
          right={
            <Pressable onPress={() => router.back()} accessibilityRole="button">
              <Text style={[styles.close, { color: colors.accent }]}>Close</Text>
            </Pressable>
          }
        />
        {error ? <ErrorBanner message={error} /> : null}
        <Card style={styles.mapCard}>
          <MapPreview location={latest} route={route} height={430} />
        </Card>
        <Card>
          <Text style={[styles.caption, { color: colors.muted }]}>
            Last recorded · {formatDateTime(latest?.recorded_at ?? null)}
          </Text>
          <Text style={[styles.coordinates, { color: colors.text }]}>
            {latest
              ? `${formatCoordinate(latest.latitude)}, ${formatCoordinate(latest.longitude)}`
              : 'No GPS location recorded yet'}
          </Text>
          <View style={styles.detailRow}>
            <Text style={[styles.caption, { color: colors.muted }]}>
              Accuracy
            </Text>
            <Text style={[styles.detail, { color: colors.text }]}>
              {formatAccuracy(latest?.accuracy)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.caption, { color: colors.muted }]}>
              Uploaded
            </Text>
            <Text style={[styles.detail, { color: colors.text }]}>
              {formatDateTime(latest?.uploaded_at ?? null)}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  close: { fontSize: 14, fontWeight: '700', padding: 8 },
  mapCard: { padding: 10 },
  caption: { fontSize: 12, lineHeight: 18 },
  coordinates: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  detail: { fontSize: 13, fontWeight: '600' },
});
