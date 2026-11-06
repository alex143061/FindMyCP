import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useAppTheme } from '@/lib/theme';

function TabGlyph({ children, color }: { children: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 17, fontWeight: '700' }}>{children}</Text>;
}

export default function TabLayout() {
  const colors = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Device',
          tabBarIcon: ({ color }) => <TabGlyph color={color}>●</TabGlyph>,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <TabGlyph color={color}>≋</TabGlyph>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabGlyph color={color}>⚙</TabGlyph>,
        }}
      />
    </Tabs>
  );
}
