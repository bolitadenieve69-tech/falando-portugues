import { connect, disconnect } from '../livekit'
import type { LiveKitSessionData, TranscriptEntry } from '../../features/session/types'

const mockData: LiveKitSessionData = {
  roomName: 'test-room',
  token: 'test-token',
  livekitUrl: 'wss://test.livekit.io',
}

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

describe('connect', () => {
  it('returns a room with disconnect and onTranscript', () => {
    const room = connect(mockData)
    expect(typeof room.disconnect).toBe('function')
    expect(typeof room.onTranscript).toBe('function')
  })

  it('fires 3 transcript entries after 1500ms intervals', () => {
    const entries: TranscriptEntry[] = []
    const room = connect(mockData)
    room.onTranscript((e) => entries.push(e))

    jest.advanceTimersByTime(5000)

    expect(entries).toHaveLength(3)
    expect(entries[0].speaker).toBe('tutor')
    expect(entries[2].hasCorrection).toBe(true)
  })
})

describe('disconnect', () => {
  it('cancels pending timers so no entries fire after disconnect', () => {
    const entries: TranscriptEntry[] = []
    const room = connect(mockData)
    room.onTranscript((e) => entries.push(e))

    jest.advanceTimersByTime(1600)
    disconnect(room)
    jest.advanceTimersByTime(5000)

    expect(entries).toHaveLength(1)
  })
})
