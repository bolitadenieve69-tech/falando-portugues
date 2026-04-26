import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react-native'
import { SessionProvider, useSession } from '../SessionContext'
import * as api from '../../services/api'
import * as livekit from '../../services/livekit'
import * as storage from '../../services/storage'

jest.mock('../../services/api')
jest.mock('../../services/livekit')
jest.mock('../../services/storage')

const mockApi = api as jest.Mocked<typeof api>
const mockLivekit = livekit as jest.Mocked<typeof livekit>
const mockStorage = storage as jest.Mocked<typeof storage>

const mockLivekitData = { roomName: 'room-1', token: 'lk-tok', livekitUrl: 'wss://x' }

function wrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider token="auth-tok">{children}</SessionProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  mockStorage.saveSession.mockResolvedValue(undefined)
  mockLivekit.connect.mockReturnValue({
    disconnect: jest.fn(),
    onTranscript: jest.fn(),
  })
  mockLivekit.disconnect.mockImplementation(() => {})
})

describe('SessionProvider initial state', () => {
  it('starts with idle status and empty transcript', () => {
    const { result } = renderHook(() => useSession(), { wrapper })
    expect(result.current.status).toBe('idle')
    expect(result.current.transcript).toEqual([])
  })
})

describe('startSession', () => {
  it('transitions connecting → active on success', async () => {
    mockApi.createSession.mockResolvedValue(mockLivekitData)
    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      await result.current.startSession({ level: 'B1', topic: 'livre' })
    })

    expect(result.current.status).toBe('active')
    expect(result.current.livekitData).toEqual(mockLivekitData)
  })

  it('transitions to error on API failure', async () => {
    mockApi.createSession.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      await result.current.startSession({ level: 'B1', topic: 'livre' })
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Network error')
  })
})

describe('endSession', () => {
  it('saves session and transitions to ended', async () => {
    mockApi.createSession.mockResolvedValue(mockLivekitData)
    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      await result.current.startSession({ level: 'B1', topic: 'livre' })
    })
    await act(async () => {
      await result.current.endSession()
    })

    expect(result.current.status).toBe('ended')
    expect(mockStorage.saveSession).toHaveBeenCalledTimes(1)
  })
})

describe('addTranscriptEntry', () => {
  it('appends entry to transcript immutably', () => {
    const { result } = renderHook(() => useSession(), { wrapper })
    const entry = { id: '1', speaker: 'tutor' as const, text: 'Olá', timestamp: 1000, hasCorrection: false }

    act(() => {
      result.current.addTranscriptEntry(entry)
    })

    expect(result.current.transcript).toHaveLength(1)
    expect(result.current.transcript[0].text).toBe('Olá')
  })
})
