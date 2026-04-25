import AsyncStorage from '@react-native-async-storage/async-storage'
import { v4 as uuidv4 } from 'uuid'
import { SettingsState, DEFAULT_SETTINGS, SessionHistoryEntry } from '../types'

const KEYS = {
  AUTH_TOKEN: 'auth_token',
  AUTH_USERNAME: 'auth_username',
  DEVICE_ID: 'device_id',
  SETTINGS: 'settings',
  SESSIONS: 'sessions',
} as const

export async function saveAuthToken(token: string, username: string): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.AUTH_TOKEN, token],
    [KEYS.AUTH_USERNAME, username],
  ])
}

export async function getAuthToken(): Promise<{ token: string; username: string } | null> {
  const values = await AsyncStorage.multiGet([KEYS.AUTH_TOKEN, KEYS.AUTH_USERNAME])
  const token = values[0][1]
  const username = values[1][1]
  if (!token || !username) return null
  return { token, username }
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.AUTH_TOKEN, KEYS.AUTH_USERNAME])
}

export async function saveSettings(settings: SettingsState): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings))
}

export async function getSettings(): Promise<SettingsState> {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS)
  if (!raw) return DEFAULT_SETTINGS
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
}

export async function saveSession(entry: SessionHistoryEntry): Promise<void> {
  const existing = await getSessions()
  const updated = [entry, ...existing].slice(0, 50)
  await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(updated))
}

export async function getSessions(): Promise<SessionHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.SESSIONS)
  if (!raw) return []
  return JSON.parse(raw) as SessionHistoryEntry[]
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEYS.DEVICE_ID)
  if (existing) return existing
  const id = uuidv4()
  await AsyncStorage.setItem(KEYS.DEVICE_ID, id)
  return id
}
