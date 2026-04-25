import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  saveAuthToken,
  getAuthToken,
  clearAuth,
  saveSettings,
  getSettings,
  saveSession,
  getSessions,
  getOrCreateDeviceId,
} from '../storage'
import { DEFAULT_SETTINGS } from '../../types'
import type { SessionHistoryEntry } from '../../types'

beforeEach(async () => {
  await AsyncStorage.clear()
  jest.clearAllMocks()
})

describe('saveAuthToken / getAuthToken', () => {
  it('saves and retrieves token and username', async () => {
    await saveAuthToken('tok123', 'pedro')
    const result = await getAuthToken()
    expect(result).toEqual({ token: 'tok123', username: 'pedro' })
  })

  it('returns null when nothing is stored', async () => {
    const result = await getAuthToken()
    expect(result).toBeNull()
  })
})

describe('clearAuth', () => {
  it('removes token and username', async () => {
    await saveAuthToken('tok', 'user')
    await clearAuth()
    const result = await getAuthToken()
    expect(result).toBeNull()
  })
})

describe('saveSettings / getSettings', () => {
  it('returns DEFAULT_SETTINGS when nothing stored', async () => {
    const settings = await getSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
  })

  it('saves and retrieves settings', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, level: 'C1' })
    const result = await getSettings()
    expect(result.level).toBe('C1')
  })
})

describe('saveSession / getSessions', () => {
  it('returns empty array when nothing stored', async () => {
    const sessions = await getSessions()
    expect(sessions).toEqual([])
  })

  it('prepends new session to the list', async () => {
    const entry: SessionHistoryEntry = {
      id: '1',
      roomName: 'room-1',
      startedAt: 1000,
      endedAt: 2000,
      transcript: [],
      config: { level: 'B1', topic: 'livre' },
    }
    await saveSession(entry)
    const sessions = await getSessions()
    expect(sessions[0].id).toBe('1')
  })
})

describe('getOrCreateDeviceId', () => {
  it('creates a device ID if none exists', async () => {
    const id = await getOrCreateDeviceId()
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })

  it('returns the same ID on subsequent calls', async () => {
    const id1 = await getOrCreateDeviceId()
    const id2 = await getOrCreateDeviceId()
    expect(id1).toBe(id2)
  })
})
