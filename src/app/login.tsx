import { useState } from 'react';
import { Link, router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import {
  Card,
  ErrorBanner,
  PageHeader,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/lib/theme';

export default function LoginScreen() {
  const colors = useAppTheme();
  const { configured, signIn, signUp } = useAuth();
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (creating) {
        const signedIn = await signUp(email.trim(), password);
        if (signedIn) {
          router.replace('/(tabs)');
        } else {
          setMessage('Check your email to confirm your new account, then sign in.');
          setCreating(false);
        }
      } else {
        await signIn(email.trim(), password);
        router.replace('/(tabs)');
      }
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : 'Authentication failed.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <PageHeader
            title={creating ? 'Create account' : 'Welcome back'}
            subtitle="Sign in to sync and view your devices remotely."
          />
          {!configured ? (
            <Card>
              <Text style={[styles.title, { color: colors.text }]}>
                Supabase setup needed
              </Text>
              <Text style={[styles.body, { color: colors.muted }]}>
                Copy .env.example to .env and add your Supabase project URL and
                publishable key. Local GPS recording does not require an
                account or internet.
              </Text>
              <PrimaryButton
                label="Continue with local tracking"
                onPress={() => router.replace('/(tabs)')}
              />
            </Card>
          ) : (
            <Card>
              {error ? <ErrorBanner message={error} /> : null}
              {message ? (
                <Text style={[styles.message, { color: colors.accent }]}>
                  {message}
                </Text>
              ) : null}
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.input,
                  },
                ]}
              />
              <Text style={[styles.label, { color: colors.text }]}>
                Password
              </Text>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete={creating ? 'new-password' : 'password'}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.input,
                  },
                ]}
              />
              <PrimaryButton
                label={creating ? 'Create account' : 'Sign in'}
                onPress={() => void submit()}
                busy={busy}
                disabled={!email.trim() || password.length < 8}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setCreating((value) => !value);
                  setError('');
                  setMessage('');
                }}
                style={styles.switchMode}
              >
                <Text style={[styles.switchText, { color: colors.accent }]}>
                  {creating
                    ? 'Already have an account? Sign in'
                    : 'New to FindMyCP? Create an account'}
                </Text>
              </Pressable>
            </Card>
          )}
          {configured ? (
            <Link href="/(tabs)" replace asChild>
              <Pressable style={styles.localLink}>
                <Text style={[styles.body, { color: colors.muted }]}>
                  Continue without signing in
                </Text>
              </Pressable>
            </Link>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 22 },
  title: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 17 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 7, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    minHeight: 50,
    fontSize: 15,
    marginBottom: 5,
  },
  switchMode: { alignItems: 'center', paddingTop: 18 },
  switchText: { fontSize: 13, fontWeight: '700' },
  localLink: { alignItems: 'center', paddingTop: 18 },
  message: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
});
