import { useCallback, useEffect, useState } from 'react';
import { Link, useFocusEffect, router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import * as Device from 'expo-device';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card, ErrorBanner, PageHeader, PrimaryButton, Screen } from '@/components/ui';
import { MapPreview } from '@/components/MapPreview';
import { useAuth } from '@/contexts/AuthContext';
import { getRecordingInterval } from '@/lib/database';
import { formatAccuracy, formatCoordinate, formatDateTime } from '@/lib/format';
import { syncPendingLocations } from '@/lib/sync';
import { useAppTheme } from '@/lib/theme';
import { startTracking, stopTracking } from '@/lib/tracking';
import { RECORDING_INTERVALS } from '@/types/location';
import { useTrackingStore } from '@/store/tracking';

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const colors = useAppTheme();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useAppTheme();
  const { session } = useAuth();
  const {
    latest,
    pending,
    total,
    active,
    battery,
    lastSyncedAt,
    syncError,
    recordError,
    trackingInterrupted,
    refresh,
    setActive,
  } = useTrackingStore();
  const [online, setOnline] = useState<boolean | null>(null);
  const [interval, setIntervalValue] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      void refresh().catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : 'Could not load local tracking data.',
        );
      });
      void getRecordingInterval()
        .then(setIntervalValue)
        .catch((intervalError: unknown) => {
            setError(
              intervalError instanceof Error
                ? intervalError.message
                : 'Could not load the recording interval.',
            );
        });
    }, [refresh]),
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(
        state.isConnected === true && state.isInternetReachable !== false,
      );
    });
    return unsubscribe;
  }, []);

  const toggleTracking = async () => {
    setBusy(true);
    setError('');
    setSyncMessage('');
    try {
      const deviceName = Device.deviceName ?? 'My phone';
      const deviceModel = Device.modelName ?? 'Android device';
      if (active) {
        await stopTracking(deviceName, deviceModel);
        setActive(false);
      } else {
        const selected = RECORDING_INTERVALS.find((value) => value === interval);
        await startTracking(
          deviceName,
          deviceModel,
          selected ?? 60,
        );
        setActive(true);
      }
      await refresh();
    } catch (trackingError) {
      const message =
        trackingError instanceof Error
          ? trackingError.message
          : 'Tracking could not be changed.';
      setError(message);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    if (!session) {
      router.push('/login');
      return;
    }
    setBusy(true);
    setError('');
    setSyncMessage('');
    try {
      const count = await syncPendingLocations(session.user.id);
      setSyncMessage(count ? `${count} records synced` : 'Everything is up to date');
      await refresh();
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? `Sync failed: ${syncError.message}`
          : 'Sync failed. Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="FindMyCP"
          subtitle="Your device, accounted for."
          right={
            <View
              style={[
                styles.connectionBadge,
                {
                  backgroundColor: online
                    ? colors.accentSoft
                    : colors.surfaceAlt,
                },
              ]}
            >
              <View
                style={[
                  styles.connectionDot,
                  { backgroundColor: online ? colors.accent : colors.muted },
                ]}
              />
              <Text style={[styles.connectionText, { color: colors.text }]}>
                {online ? 'Online' : online === false ? 'Offline' : 'Checking'}
              </Text>
            </View>
          }
        />

        {error ? <ErrorBanner message={error} /> : null}
        {trackingInterrupted ? (
          <ErrorBanner message="Android stopped the background location service. Tracking is currently off; start it again to resume recording." />
        ) : null}
        {recordError ? (
          <ErrorBanner message={`A location could not be saved locally: ${recordError}`} />
        ) : null}
        {!error && syncError ? (
          <ErrorBanner message={`The last background sync failed: ${syncError}`} />
        ) : null}
        {syncMessage ? (
          <Text style={[styles.successMessage, { color: colors.accent }]}>
            {syncMessage}
          </Text>
        ) : null}

        <Card style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View style={styles.flex}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Last recorded location
              </Text>
              <Text style={[styles.caption, { color: colors.muted }]}>
                {formatDateTime(latest?.recorded_at ?? null)}
              </Text>
            </View>
            <Link href="/map" asChild>
              <Pressable
                accessibilityRole="button"
                style={StyleSheet.flatten([
                  styles.mapLink,
                  { backgroundColor: colors.accentSoft },
                ])}
              >
                <Text style={[styles.mapLinkText, { color: colors.accent }]}>
                  View map
                </Text>
              </Pressable>
            </Link>
          </View>
          <MapPreview location={latest} height={205} />
          <View style={styles.coordinates}>
            <Text style={[styles.coordinateText, { color: colors.text }]}>
              {latest
                ? `${formatCoordinate(latest.latitude)}, ${formatCoordinate(latest.longitude)}`
                : 'Waiting for first GPS fix'}
            </Text>
            <Text style={[styles.caption, { color: colors.muted }]}>
              {formatAccuracy(latest?.accuracy)}
            </Text>
          </View>
        </Card>

        <Card>
          <View style={styles.statusHeading}>
            <View style={styles.flex}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {active ? 'Tracking is on' : 'Tracking is off'}
              </Text>
              <Text style={[styles.caption, { color: colors.muted }]}>
                {active
                  ? 'Location is saved on this phone, even offline.'
                  : 'Turn on tracking when you are ready.'}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: active
                    ? colors.accentSoft
                    : colors.surfaceAlt,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: active ? colors.accent : colors.muted },
                ]}
              >
                {active ? 'ON' : 'OFF'}
              </Text>
            </View>
          </View>
          <PrimaryButton
            label={active ? 'Stop tracking' : 'Start tracking'}
            onPress={() => void toggleTracking()}
            busy={busy}
            tone={active ? 'danger' : 'accent'}
          />
        </Card>

        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <Metric label="Battery" value={battery === null ? '--' : `${battery}%`} />
          </Card>
          <Card style={styles.metricCard}>
            <Metric label="GPS accuracy" value={formatAccuracy(latest?.accuracy)} />
          </Card>
        </View>

        <Card>
          <View style={styles.syncHeader}>
            <View style={styles.flex}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Offline sync
              </Text>
              <Text style={[styles.caption, { color: colors.muted }]}>
                {pending} pending · {total} saved on this device
              </Text>
            </View>
            <PrimaryButton
              label="Sync"
              onPress={() => void syncNow()}
              busy={busy}
              disabled={!online || pending === 0}
            />
          </View>
          {!session ? (
            <Text style={[styles.helper, { color: colors.muted }]}>
              Sign in to back up records to your Supabase account. Recording
              stays local until you do.
            </Text>
          ) : null}
          <Text style={[styles.helper, { color: colors.muted }]}>
            Last upload: {formatDateTime(lastSyncedAt)}
          </Text>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            This device
          </Text>
          <Text style={[styles.caption, { color: colors.muted, marginTop: 6 }]}>
            {Device.deviceName ?? 'My phone'} · {Device.modelName ?? 'Android'}
          </Text>
          <Text style={[styles.helper, { color: colors.muted }]}>
            Recording interval: {interval >= 60 ? `${interval / 60} min` : `${interval} sec`}
          </Text>
        </Card>
        {session ? (
          <Link href="/remote" asChild>
            <Pressable
              style={StyleSheet.flatten([
                styles.remoteButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ])}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                View my other devices
              </Text>
              <Text style={[styles.caption, { color: colors.muted }]}>
                See their latest synchronized locations
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26 },
  flex: { flex: 1 },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  connectionDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  connectionText: { fontSize: 12, fontWeight: '700' },
  mapCard: { padding: 14 },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  caption: { fontSize: 12, marginTop: 5, lineHeight: 18 },
  mapLink: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  mapLinkText: { fontSize: 12, fontWeight: '700' },
  coordinates: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordinateText: { fontSize: 13, fontWeight: '600' },
  statusHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusPill: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  metricsRow: { flexDirection: 'row', gap: 12 },
  metricCard: { flex: 1, padding: 14 },
  metric: { minHeight: 48, justifyContent: 'center' },
  metricLabel: { fontSize: 12 },
  metricValue: { fontSize: 18, fontWeight: '700', marginTop: 7 },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helper: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  successMessage: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  remoteButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
});
