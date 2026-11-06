import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/lib/theme';

export default function IndexRoute() {
  const { ready, session, configured } = useAuth();
  const colors = useAppTheme();
  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return <Redirect href={configured && !session ? '/login' : '/(tabs)'} />;
}
