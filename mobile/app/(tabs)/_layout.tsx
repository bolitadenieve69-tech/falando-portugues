import { Tabs } from 'expo-router';
import { Colors } from '../../src/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
        },
        tabBarActiveTintColor: Colors.accentLight,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: () => null }} />
      <Tabs.Screen name="history" options={{ title: 'Historial', tabBarIcon: () => null }} />
      <Tabs.Screen name="settings" options={{ title: 'Definições', tabBarIcon: () => null }} />
    </Tabs>
  );
}
