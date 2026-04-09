import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, Typography } from '../../src/constants/theme';

interface TabIconProps {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  focused: boolean;
}

function TabIcon({ name, label, focused }: TabIconProps) {
  if (focused) {
    return (
      <View style={styles.activeTab}>
        <MaterialCommunityIcons name={name} size={22} color={Colors.primary} />
        <Text style={styles.activeLabel}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={styles.inactiveTab}>
      <MaterialCommunityIcons
        name={name}
        size={22}
        color={Colors.primary + '66'}
      />
      <Text style={styles.inactiveLabel}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" label="Início" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="history" label="Histórico" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="cog" label="Definições" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 88 : 72,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  activeLabel: {
    fontFamily: Typography.label,
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  inactiveTab: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inactiveLabel: {
    fontFamily: Typography.label,
    fontSize: 10,
    color: Colors.primary + '66',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
