import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/theme';

export function Screen({
  children,
  scroll = false,
}: PropsWithChildren<{ scroll?: boolean }>) {
  const colors = useAppTheme();
  const content = scroll ? (
    <View style={styles.scrollContent}>{children}</View>
  ) : (
    children
  );
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {content}
    </SafeAreaView>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const colors = useAppTheme();
  return (
    <View style={styles.pageHeader}>
      <View style={styles.flex}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.pageSubtitle, { color: colors.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: object }>) {
  const colors = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  busy = false,
  tone = 'accent',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: 'accent' | 'neutral' | 'danger';
}) {
  const colors = useAppTheme();
  const backgroundColor =
    tone === 'danger'
      ? colors.danger
      : tone === 'neutral'
        ? colors.surfaceAlt
        : colors.accent;
  const foregroundColor =
    tone === 'neutral' ? colors.text : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          opacity: disabled || busy ? 0.6 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={foregroundColor} />
      ) : (
        <Text style={[styles.buttonText, { color: foregroundColor }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  const colors = useAppTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.errorBanner,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.danger },
      ]}
    >
      <Text style={[styles.errorText, { color: colors.danger }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  pageHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  pageTitle: { fontSize: 25, fontWeight: '700', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, marginTop: 5 },
  flex: { flex: 1 },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 14,
  },
  button: {
    minHeight: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonText: { fontSize: 15, fontWeight: '700' },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginBottom: 12,
  },
  errorText: { fontSize: 14, lineHeight: 20 },
});
