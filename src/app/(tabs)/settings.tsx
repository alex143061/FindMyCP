import { useCallback, useState } from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as Device from 'expo-device';
import {
  Card,
  ErrorBanner,
  PageHeader,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { getRecordingInterval, getSetting } from '@/lib/database';
import { formatDateTime } from '@/lib/format';
import { syncPendingLocations } from '@/lib/sync';
import { useAppTheme } from '@/lib/theme';
import { updateTrackingInterval } from '@/lib/tracking';
import {
  RECORDING_INTERVALS,
  type RecordingInterval,
} from '@/types/location';
import { useTrackingStore } from '@/store/tracking';

export default function SettingsScreen() {
  const colors = useAppTheme();
  const { session, configured, signOut } = useAuth();
  const { active, pending, lastSyncedAt, refresh } = useTrackingStore();
  const [interval, setInterval] = useState<RecordingInterval>(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savedSyncAt, setSavedSyncAt] = useState<string | null>(lastSyncedAt);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([
        getRecordingInterval().then(setInterval),
        getSetting('last_synced_at').then(setSavedSyncAt),
      ]).catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load device settings.',
        );
      });
    }, []),
  );

  const saveInterval = async (value: RecordingInterval) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await updateTrackingInterval(
        value,
        Device.deviceName ?? 'My phone',
        Device.modelName ?? 'Android device',
      );
      setInterval(value);
      await refresh();
      setMessage(
        active
          ? 'Interval updated. Background tracking has restarted.'
          : 'Recording interval saved.',
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not update the recording interval.',
      );
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    setBusy(true);
    setError('');
    try {
      await signOut();
      router.replace('/login');
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : 'Could not sign out.',
      );
    } finally {
      setBusy(false);
    }
  };

  const onSync = async () => {
    if (!session) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const count = await syncPendingLocations(session.user.id);
      setMessage(count ? `${count} records uploaded.` : 'Nothing to upload.');
      await refresh();
      setSavedSyncAt(await getSetting('last_synced_at'));
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : 'Could not synchronize location history.',
      );
    } finally {
      setBusy(false);
    }
  };

  const openAppSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (settingsError) {
      setError(
        settingsError instanceof Error
          ? settingsError.message
          : 'Could not open system settings.',
      );
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title="Settings" subtitle="Tracking and account" />
        {error ? <ErrorBanner message={error} /> : null}
        {message ? (
          <Text style={[styles.message, { color: colors.accent }]}>{message}</Text>
        ) : null}

        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Recording interval
          </Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            More frequent fixes use more battery. Your choice is saved on this
            device.
          </Text>
          <View style={styles.intervals}>
            {RECORDING_INTERVALS.map((value) => {
              const selected = value === interval;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={busy}
                  onPress={() => void saveInterval(value)}
                  style={[
                    styles.interval,
                    {
                      backgroundColor: selected
                        ? colors.accentSoft
                        : colors.surfaceAlt,
                      borderColor: selected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.intervalText,
                      { color: selected ? colors.accent : colors.text },
                    ]}
                  >
                    {value < 60 ? `${value} sec` : `${value / 60} min`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {busy ? <Text style={[styles.description, { color: colors.muted }]}>Saving…</Text> : null}
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Offline synchronization
          </Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            {pending} location {pending === 1 ? 'record' : 'records'} waiting to
            upload
          </Text>
          <Text style={[styles.syncTime, { color: colors.muted }]}>
            Last successful upload: {formatDateTime(savedSyncAt)}
          </Text>
          {session ? (
            <PrimaryButton
              label="Sync now"
              onPress={() => void onSync()}
              busy={busy}
              disabled={pending === 0}
            />
          ) : (
            <Text style={[styles.description, { color: colors.muted }]}>
              Sign in to sync your local records to Supabase.
            </Text>
          )}
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Account</Text>
          {session ? (
            <>
              <Text style={[styles.description, { color: colors.muted }]}>
                Signed in as {session.user.email ?? 'account'}
              </Text>
              <PrimaryButton
                label="Sign out"
                onPress={() => void onSignOut()}
                busy={busy}
                tone="neutral"
              />
            </>
          ) : configured ? (
            <>
              <Text style={[styles.description, { color: colors.muted }]}>
                Sign in to view this device from another phone and back up your
                location history.
              </Text>
              <Link href="/login" asChild>
                <Pressable
                  style={StyleSheet.flatten([
                    styles.accountButton,
                    { backgroundColor: colors.accent },
                  ])}
                >
                  <Text style={styles.accountButtonText}>Sign in or create account</Text>
                </Pressable>
              </Link>
            </>
          ) : (
            <Text style={[styles.description, { color: colors.muted }]}>
              Add your Supabase project URL and publishable key to .env to
              enable account sync. Location recording works locally without it.
            </Text>
          )}
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Device</Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            {Device.deviceName ?? 'My phone'} · {Device.modelName ?? 'Android'}
          </Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            Background tracking {active ? 'is active' : 'is stopped'}
          </Text>
        </Card>

        {Platform.OS === 'android' ? (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Android background limits
            </Text>
            <Text style={[styles.description, { color: colors.muted }]}>
              Some Android versions and manufacturers restrict background
              location. If recording pauses, check this app’s Battery settings
              and allow background activity. The exact options vary by phone.
            </Text>
            <PrimaryButton
              label="Open app system settings"
              onPress={() => void openAppSettings()}
              tone="neutral"
            />
          </Card>
        ) : null}

        <Text style={[styles.privacy, { color: colors.muted }]}>
          Tracking stops if you switch it off. Android force-stop, shutdown, or
          some manufacturer battery controls can stop background work.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 13 },
  intervals: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  interval: {
    minWidth: '29%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  intervalText: { fontSize: 13, fontWeight: '700' },
  syncTime: { fontSize: 12, marginTop: 0, marginBottom: 14 },
  accountButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  privacy: { fontSize: 12, lineHeight: 19, margin: 4 },
  message: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
});
