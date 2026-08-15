import { renderHook, act } from '@testing-library/react-native'
import type { LiveKitSessionData } from '../../../services/api'

const publishData = jest.fn()
const setMicrophoneEnabled = jest.fn(async () => undefined)
const disconnectCallback: Record<string, (...args: unknown[]) => void> = {}
const connect = jest.fn(async () => Promise.resolve())
const disconnect = jest.fn(async () => {
  if (disconnectCallback.disconnected) {
    await disconnectCallback.disconnected()
  }
})

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    setAudioModeAsync: jest.fn(async () => undefined),
  },
  InterruptionModeIOS: { DoNotMix: 'doNotMix' },
  InterruptionModeAndroid: { DoNotMix: 'doNotMix' },
}))

jest.mock('livekit-client', () => ({
  Room: class FakeRoom {
    localParticipant = {
      publishData,
      setMicrophoneEnabled,
      identity: 'local-participant',
    }

    on = jest.fn((event: string, callback: (...args: unknown[]) => void) => {
      disconnectCallback[event] = callback
      return this
    })

    connect = connect
    disconnect = disconnect
  },
  RoomEvent: {
    DataReceived: 'dataReceived',
    Disconnected: 'disconnected',
    ActiveSpeakersChanged: 'activeSpeakersChanged',
  },
}))

jest.mock('../../../services/api', () => ({
  createSession: jest.fn(),
}))

jest.mock('../../../services/preferences', () => ({
  loadPreferences: jest.fn(),
}))

jest.mock('../../../services/history', () => ({
  saveSession: jest.fn(),
  saveSessionRemote: jest.fn(),
}))

import { useVoiceSession } from '../useVoiceSession'
import { createSession } from '../../../services/api'
import { loadPreferences } from '../../../services/preferences'

const mockCreateSession = createSession as jest.MockedFunction<typeof createSession>
const mockLoadPreferences = loadPreferences as jest.MockedFunction<typeof loadPreferences>

const mockLivekitData: LiveKitSessionData = {
  roomName: 'room-1',
  token: 'test-token',
  livekitUrl: 'wss://test',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCreateSession.mockResolvedValue(mockLivekitData)
  mockLoadPreferences.mockResolvedValue({
    level: 'B1',
    defaultTopic: null,
    voiceId: 'DMcOknq8n1B6XshFIJKJ',
    showTranscript: true,
    autoCorrections: true,
  })
  connect.mockResolvedValue(undefined)
  publishData.mockResolvedValue(undefined)
})

describe('useVoiceSession', () => {
  it('awaits publishData before resolving sendTextMessage', async () => {
    let resolvePublish: () => void
    const publishPromise = new Promise<void>((resolve) => {
      resolvePublish = resolve
    })
    publishData.mockReturnValue(publishPromise)

    const { result } = renderHook(() => useVoiceSession())

    await act(async () => {
      await result.current.startSession({ level: 'B1', topic: 'livre' })
    })

    const sendPromise = result.current.sendTextMessage('Olá')
    await Promise.resolve()
    expect(publishData).toHaveBeenCalledTimes(1)

    let finished = false
    sendPromise.then(() => {
      finished = true
    })

    await Promise.resolve()
    expect(finished).toBe(false)

    await act(async () => {
      resolvePublish!()
      await sendPromise
    })

    expect(finished).toBe(true)
    expect(result.current.transcript).toHaveLength(1)
    expect(result.current.transcript[0].speaker).toBe('user')
    expect(result.current.transcript[0].text).toBe('Olá')
  })

  it('clears the room reference on disconnect and stops sending text messages', async () => {
    const { result } = renderHook(() => useVoiceSession())

    await act(async () => {
      await result.current.startSession({ level: 'B1', topic: 'livre' })
    })

    await act(async () => {
      await disconnectCallback.disconnected?.()
    })

    expect(result.current.status).toBe('ended')

    publishData.mockClear()
    await act(async () => {
      await result.current.sendTextMessage('Oi')
    })

    expect(publishData).not.toHaveBeenCalled()
    expect(result.current.transcript).toHaveLength(0)
  })
})
