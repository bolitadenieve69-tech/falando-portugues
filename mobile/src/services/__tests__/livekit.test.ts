import { parseDataMessage, disconnect } from '../livekit'
import { createMockRoom } from '../livekitMock'

function encode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj))
}

function flushMicrotasks(times = 4): Promise<void> {
  return new Promise((resolve) => {
    let remaining = times
    const step = () => {
      remaining -= 1
      if (remaining <= 0) {
        resolve()
      } else {
        setImmediate(step)
      }
    }
    setImmediate(step)
  })
}

describe('parseDataMessage', () => {
  it('parses a tutor message with correction', () => {
    const entry = parseDataMessage(
      encode({ type: 'transcript', speaker: 'tutor', text: 'Boa!', correction: 'diz-se X.' })
    )
    expect(entry).toMatchObject({
      speaker: 'tutor',
      text: 'Boa!',
      correction: 'diz-se X.',
      hasCorrection: true,
    })
    expect(entry?.id).toBeTruthy()
    expect(typeof entry?.timestamp).toBe('number')
  })

  it('parses a tutor message with null correction', () => {
    const entry = parseDataMessage(
      encode({ type: 'transcript', speaker: 'tutor', text: 'Olá!', correction: null })
    )
    expect(entry).toMatchObject({ text: 'Olá!', hasCorrection: false })
    expect(entry?.correction).toBeUndefined()
  })

  it('parses a user message without correction key', () => {
    const entry = parseDataMessage(encode({ type: 'transcript', speaker: 'user', text: 'Eu fui.' }))
    expect(entry).toMatchObject({ speaker: 'user', text: 'Eu fui.', hasCorrection: false })
  })

  it('returns null for non-transcript messages', () => {
    expect(parseDataMessage(encode({ type: 'ping' }))).toBeNull()
  })

  it('returns null for malformed payloads', () => {
    expect(parseDataMessage(new TextEncoder().encode('not json'))).toBeNull()
    expect(parseDataMessage(encode({ type: 'transcript', speaker: 'alien', text: 'x' }))).toBeNull()
    expect(parseDataMessage(encode({ type: 'transcript', speaker: 'user' }))).toBeNull()
  })
})

describe('createMockRoom', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('fires scripted transcript entries over time', () => {
    const room = createMockRoom({ roomName: 'r', token: 't', livekitUrl: 'wss://x' })
    const entries: Array<{ speaker: string; text: string; correction?: string }> = []
    room.onTranscript((e) => entries.push(e))

    jest.advanceTimersByTime(5000)

    expect(entries.length).toBe(3)
    expect(entries[0]).toMatchObject({ speaker: 'tutor', text: 'Olá! Como posso ajudá-lo hoje?' })
    expect(entries.some((e) => Boolean(e.correction))).toBe(true)

    room.disconnect()
  })

  it('delivers entries incrementally as each timer elapses', () => {
    const room = createMockRoom({ roomName: 'r', token: 't', livekitUrl: 'wss://x' })
    const entries: unknown[] = []
    room.onTranscript((e) => entries.push(e))

    jest.advanceTimersByTime(1500)
    expect(entries.length).toBe(1)

    jest.advanceTimersByTime(1500)
    expect(entries.length).toBe(2)

    jest.advanceTimersByTime(1500)
    expect(entries.length).toBe(3)
  })

  it('disconnect stops scripted entries', () => {
    const room = createMockRoom({ roomName: 'r', token: 't', livekitUrl: 'wss://x' })
    const entries: unknown[] = []
    room.onTranscript((e) => entries.push(e))

    room.disconnect()
    jest.advanceTimersByTime(5000)

    expect(entries.length).toBe(0)
  })

  it('disconnect via the exported disconnect() helper also clears timers', () => {
    const room = createMockRoom({ roomName: 'r', token: 't', livekitUrl: 'wss://x' })
    const entries: unknown[] = []
    room.onTranscript((e) => entries.push(e))

    disconnect(room)
    jest.advanceTimersByTime(5000)

    expect(entries.length).toBe(0)
  })

  it('does not throw when no transcript handler has been registered', () => {
    const room = createMockRoom({ roomName: 'r', token: 't', livekitUrl: 'wss://x' })
    expect(() => jest.advanceTimersByTime(5000)).not.toThrow()
    room.disconnect()
  })
})

describe('connect (native path)', () => {
  const ORIG = process.env.EXPO_PUBLIC_LIVEKIT_MOCK

  let startAudioSession: jest.Mock
  let stopAudioSession: jest.Mock
  let roomConnect: jest.Mock
  let setMicrophoneEnabled: jest.Mock
  let roomDisconnect: jest.Mock
  let dataReceivedCallback: ((payload: Uint8Array) => void) | undefined

  beforeEach(() => {
    jest.resetModules()
    delete process.env.EXPO_PUBLIC_LIVEKIT_MOCK

    startAudioSession = jest.fn().mockResolvedValue(undefined)
    stopAudioSession = jest.fn()
    roomConnect = jest.fn().mockResolvedValue(undefined)
    setMicrophoneEnabled = jest.fn().mockResolvedValue(undefined)
    roomDisconnect = jest.fn().mockResolvedValue(undefined)
    dataReceivedCallback = undefined

    jest.doMock('@livekit/react-native', () => ({
      AudioSession: {
        startAudioSession: (...args: unknown[]) => startAudioSession(...args),
        stopAudioSession: (...args: unknown[]) => stopAudioSession(...args),
      },
      registerGlobals: jest.fn(),
    }))

    jest.doMock('livekit-client', () => {
      class FakeRoom {
        localParticipant = {
          setMicrophoneEnabled: (...args: unknown[]) => setMicrophoneEnabled(...args),
        }

        on(event: string, cb: (payload: Uint8Array) => void) {
          if (event === 'dataReceived') {
            dataReceivedCallback = cb
          }
          return this
        }

        connect(...args: unknown[]) {
          return roomConnect(...args)
        }

        disconnect(...args: unknown[]) {
          return roomDisconnect(...args)
        }
      }

      return {
        Room: FakeRoom,
        RoomEvent: { DataReceived: 'dataReceived' },
      }
    })
  })

  afterEach(() => {
    jest.dontMock('@livekit/react-native')
    jest.dontMock('livekit-client')
    jest.resetModules()
    if (ORIG === undefined) delete process.env.EXPO_PUBLIC_LIVEKIT_MOCK
    else process.env.EXPO_PUBLIC_LIVEKIT_MOCK = ORIG
  })

  it('wires up the real Room, connects, enables the mic, and delivers transcripts', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const liveKit = require('../livekit')
    const room = liveKit.connect({ roomName: 'r', token: 't', livekitUrl: 'wss://x' })

    await flushMicrotasks()

    expect(startAudioSession).toHaveBeenCalled()
    expect(roomConnect).toHaveBeenCalledWith('wss://x', 't')
    expect(setMicrophoneEnabled).toHaveBeenCalledWith(true)
    expect(dataReceivedCallback).toBeInstanceOf(Function)

    const entries: Array<{ speaker: string; text: string }> = []
    room.onTranscript((e: { speaker: string; text: string }) => entries.push(e))

    dataReceivedCallback?.(
      new TextEncoder().encode(
        JSON.stringify({ type: 'transcript', speaker: 'tutor', text: 'Olá', correction: null })
      )
    )

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ speaker: 'tutor', text: 'Olá' })

    room.disconnect()

    expect(roomDisconnect).toHaveBeenCalled()
    expect(stopAudioSession).toHaveBeenCalled()
  })

  it('ignores non-transcript data messages delivered on the real path', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const liveKit = require('../livekit')
    const room = liveKit.connect({ roomName: 'r', token: 't', livekitUrl: 'wss://x' })

    await flushMicrotasks()

    const entries: unknown[] = []
    room.onTranscript((e: unknown) => entries.push(e))

    dataReceivedCallback?.(new TextEncoder().encode(JSON.stringify({ type: 'ping' })))

    expect(entries).toHaveLength(0)

    room.disconnect()
  })
})
