import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

const TOKEN_KEY = 'auth_token';
const USERNAME_KEY = 'auth_username';

function baseHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (APP_TOKEN) h['X-App-Token'] = APP_TOKEN;
  return h;
}

export async function getDeviceId(): Promise<string> {
  if (Platform.OS === 'ios') {
    return (await Application.getIosIdForVendorAsync()) ?? 'unknown-ios';
  }
  return Application.getAndroidId() ?? 'unknown-android';
}

export async function registerDevice(
  username: string,
  password: string,
): Promise<{ token: string; username: string }> {
  const deviceId = await getDeviceId();
  const res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({ device_id: deviceId, username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? 'Erro ao registar');
  return data;
}

export async function loginDevice(
  password: string,
): Promise<{ token: string; username: string }> {
  const deviceId = await getDeviceId();
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({ device_id: deviceId, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? 'Erro ao iniciar sessão');
  return data;
}

export async function saveAuthData(token: string, username: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(USERNAME_KEY, username),
  ]);
}

export async function loadAuthData(): Promise<{ token: string; username: string } | null> {
  const [token, username] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USERNAME_KEY),
  ]);
  if (!token || !username) return null;
  return { token, username };
}

export async function clearAuthData(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USERNAME_KEY),
  ]);
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}
