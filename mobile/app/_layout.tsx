import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { registerGlobals } from '@livekit/react-native';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { SettingsProvider } from '../src/contexts/SettingsContext';

registerGlobals();

function AuthGate() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!token && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (token && inAuth) {
      router.replace('/(tabs)');
    }
  }, [token, isLoading, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <StatusBar style="light" />
        <AuthGate />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0F' } }} />
      </SettingsProvider>
    </AuthProvider>
  );
}
