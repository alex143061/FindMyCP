import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, ErrorBanner, PageHeader, Screen } from '@/components/ui';
import { MapPreview } from '@/components/MapPreview';
import { useAppTheme } from '@/lib/theme';
import { formatAccuracy, formatDateTime } from '@/lib/format';
import { getLocationsForDay } from '@/lib/database';
import type { LocationRecord } from '@/types/location';

function dayLabel(day: Date): string {
  const today = new Date();
  const sameDay = day.toDateString() === today.toDateString();
  return sameDay ? 'Today' : day.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function HistoryScreen() {
  const colors = useAppTheme();
  const [day, setDay] = useState(() => new Date());
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setLocations(await getLocationsForDay(day));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load location history.',
      );
    }
  }, [day]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const changeDay = (amount: number) => {
    setDay((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount);
      if (next > new Date()) return new Date();
      return next;
    });
  };

  const newest = locations[0] ?? null;
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title="Location history" subtitle="Recorded on this device" />
        {error ? <ErrorBanner message={error} /> : null}
        <Card style={styles.dayCard}>
          <Text
            accessibilityRole="header"
            style={[styles.dayTitle, { color: colors.text }]}
          >
            {dayLabel(day)}
          </Text>
          <View style={styles.dayControls}>
            <Text
              accessibilityRole="button"
              accessibilityLabel="Previous day"
              onPress={() => changeDay(-1)}
              style={[styles.dayControl, { color: colors.accent }]}
            >
              ‹ Previous
            </Text>
            <Text style={[styles.dayCount, { color: colors.muted }]}>
              {locations.length} {locations.length === 1 ? 'point' : 'points'}
            </Text>
            <Text
              accessibilityRole="button"
              accessibilityLabel="Next day"
              onPress={() => changeDay(1)}
              style={[
                styles.dayControl,
                { color: colors.accent, opacity: day.toDateString() === new Date().toDateString() ? 0.4 : 1 },
              ]}
            >
              Next ›
            </Text>
          </View>
        </Card>
        {newest ? (
          <Card style={styles.mapCard}>
            <MapPreview location={newest} route={locations} height={210} />
          </Card>
        ) : null}
        {locations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No locations for this day
            </Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Start tracking to save GPS points here. History is kept on this
              device and does not need internet access.
            </Text>
          </Card>
        ) : (
          locations.map((location) => (
            <Card key={location.id} style={styles.locationCard}>
              <View style={styles.locationTop}>
                <Text style={[styles.locationTime, { color: colors.text }]}>
                  {formatDateTime(location.recorded_at)}
                </Text>
                <Text
                  style={[
                    styles.uploadState,
                    { color: location.uploaded_at ? colors.accent : colors.warning },
                  ]}
                >
                  {location.uploaded_at ? 'Uploaded' : 'On device'}
                </Text>
              </View>
              <Text style={[styles.coordinate, { color: colors.text }]}>
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </Text>
              <Text style={[styles.accuracy, { color: colors.muted }]}>
                GPS accuracy {formatAccuracy(location.accuracy)}
                {location.battery_level === null
                  ? ''
                  : ` · Battery ${location.battery_level}%`}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26 },
  dayCard: { marginBottom: 12 },
  dayTitle: { fontSize: 17, fontWeight: '700' },
  dayControls: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayControl: { fontSize: 14, fontWeight: '700', paddingVertical: 6 },
  dayCount: { fontSize: 12 },
  mapCard: { padding: 10 },
  emptyCard: { alignItems: 'center', paddingVertical: 28 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  locationCard: { paddingVertical: 15 },
  locationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationTime: { fontSize: 14, fontWeight: '700' },
  uploadState: { fontSize: 11, fontWeight: '700' },
  coordinate: { fontSize: 14, fontWeight: '600', marginTop: 11 },
  accuracy: { fontSize: 12, marginTop: 5 },
});
