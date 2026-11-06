import { useCallback, useState } from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Card,
  ErrorBanner,
  PageHeader,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/format';
import { getRemoteDevices, type RemoteDevice } from '@/lib/remote';
import { useAppTheme } from '@/lib/theme';

export default function RemoteDevicesScreen() {
  const colors = useAppTheme();
  const { session } = useAuth();
  const [devices, setDevices] = useState<RemoteDevice[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session) {
      setDevices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setDevices(await getRemoteDevices());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load your devices.',
      );
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      return NetInfo.addEventListener((state) => {
        const reachable =
          state.isConnected === true && state.isInternetReachable !== false;
        setOnline(reachable);
        if (reachable) void load();
      });
    }, [load]),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="My devices"
          subtitle="Locations last synchronized to your account"
          right={
            <Pressable onPress={() => router.back()} accessibilityRole="button">
              <Text style={[styles.back, { color: colors.accent }]}>Back</Text>
            </Pressable>
          }
        />
        {error ? <ErrorBanner message={error} /> : null}
        {session ? (
          <Text style={[styles.networkNote, { color: colors.muted }]}>
            This phone is {online ? 'online' : online === false ? 'offline' : 'checking connectivity'}.
            A tracked phone’s current connection cannot be inferred from its last
            uploaded location.
          </Text>
        ) : (
          <Card>
            <Text style={[styles.deviceName, { color: colors.text }]}>
              Sign in to view your account’s devices
            </Text>
            <View style={styles.signInButton}>
              <PrimaryButton
                label="Sign in"
                onPress={() => router.push('/login')}
              />
            </View>
          </Card>
        )}
        {loading ? (
          <Card>
            <Text style={[styles.secondary, { color: colors.muted }]}>
              Loading devices…
            </Text>
          </Card>
        ) : devices.length === 0 && session ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.deviceName, { color: colors.text }]}>
              No synchronized devices yet
            </Text>
            <Text style={[styles.secondary, { color: colors.muted }]}>
              Sign in on the tracked phone, start location tracking, and allow it
              to synchronize at least once.
            </Text>
          </Card>
        ) : (
          devices.map((device) => (
            <Link
              key={device.id}
              href={{ pathname: '/remote/[id]', params: { id: device.id } }}
              asChild
            >
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.deviceCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.row}>
                  <View style={styles.deviceMark}>
                    <Text style={[styles.deviceMarkText, { color: colors.accent }]}>
                      {device.platform.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.deviceName, { color: colors.text }]}>
                      {device.device_name}
                    </Text>
                    <Text style={[styles.secondary, { color: colors.muted }]}>
                      {device.device_model} · {device.platform}
                    </Text>
                  </View>
                  <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
                </View>
                <Text style={[styles.secondary, { color: colors.muted }]}>
                  Tracking was {device.tracking_enabled ? 'ON' : 'OFF'} at last
                  contact · {formatDateTime(device.updated_at)}
                </Text>
                <Text style={[styles.notice, { color: colors.warning }]}>
                  Last reported state, not live device status
                </Text>
              </Pressable>
            </Link>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  back: { fontSize: 14, fontWeight: '700', padding: 8 },
  networkNote: { fontSize: 12, lineHeight: 18, marginBottom: 14 },
  deviceCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  flex: { flex: 1 },
  deviceMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#D8F2E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceMarkText: { fontSize: 17, fontWeight: '800' },
  deviceName: { fontSize: 15, fontWeight: '700' },
  secondary: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  chevron: { fontSize: 27, marginLeft: 8 },
  notice: { fontSize: 11, marginTop: 6 },
  emptyCard: { paddingVertical: 24 },
  signInButton: { marginTop: 14 },
});
