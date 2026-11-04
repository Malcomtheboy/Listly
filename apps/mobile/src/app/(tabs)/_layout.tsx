import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, type ColorValue } from 'react-native';
import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(active: IconName, idle: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? active : idle} size={24} color={color as string} />
  );
}

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.brand,
        tabBarInactiveTintColor: t.faint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.border,
          height: Platform.OS === 'web' ? 64 : undefined,
          paddingTop: 6,
        },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Sjekk', tabBarIcon: icon('shield-checkmark', 'shield-checkmark-outline') }} />
      <Tabs.Screen name="history" options={{ title: 'Historikk', tabBarIcon: icon('time', 'time-outline') }} />
      <Tabs.Screen name="learn" options={{ title: 'Lær', tabBarIcon: icon('school', 'school-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
