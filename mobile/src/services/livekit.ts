import type { LiveKitSessionData, TranscriptEntry } from '../features/session/types'
import { createMockRoom } from './livekitMock'

export interface RoomHandle {
  disconnect: () => void
  onTranscript: (handler: (entry: TranscriptEntry) => void) => void
}

// Kept for existing imports (SessionContext types the ref as MockRoom).
export type MockRoom = RoomHandle

let entryCounter = 0

export function parseDataMessage(payload: Uint8Array): TranscriptEntry | null {
  try {
    const raw: unknown = JSON.parse(new TextDecoder().decode(payload))
    if (typeof raw !== 'object' || raw === null) return null
    const msg = raw as { type?: string; speaker?: string; text?: string; correction?: string | null }
    if (msg.type !== 'transcript') return null
    if (msg.speaker !== 'user' && msg.speaker !== 'tutor') return null
    if (typeof msg.text !== 'string' || msg.text.length === 0) return null
    const correction = typeof msg.correction === 'string' && msg.correction ? msg.correction : undefined
    entryCounter += 1
    return {
      id: `${msg.speaker}-${Date.now()}-${entryCounter}`,
      speaker: msg.speaker,
      text: msg.text,
      timestamp: Date.now(),
      hasCorrection: Boolean(correction),
      ...(correction ? { correction } : {}),
    }
  } catch {
    return null
  }
}

export function connect(data: LiveKitSessionData): RoomHandle {
  if (process.env.EXPO_PUBLIC_LIVEKIT_MOCK === '1') {
    return createMockRoom(data)
  }

  let handler: ((entry: TranscriptEntry) => void) | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let room: any = null
  let cancelled = false

  async function start(attempt: number): Promise<void> {
    try {
      /* eslint-disable @typescript-eslint/no-var-requires */
      const { AudioSession } = require('@livekit/react-native')
      const { Room, RoomEvent } = require('livekit-client')
      /* eslint-enable @typescript-eslint/no-var-requires */
      await AudioSession.startAudioSession()
      const r = new Room()
      r.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        const entry = parseDataMessage(payload)
        if (entry && handler) handler(entry)
      })
      await r.connect(data.livekitUrl, data.token)
      await r.localParticipant.setMicrophoneEnabled(true)
      if (cancelled) {
        void r.disconnect()
        return
      }
      room = r
    } catch (err) {
      console.warn('[livekit] connect failed', err)
      if (attempt === 0 && !cancelled) {
        await start(1)
      }
    }
  }

  void start(0)

  return {
    disconnect: () => {
      cancelled = true
      if (room) {
        void room.disconnect()
        room = null
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { AudioSession } = require('@livekit/react-native')
        void AudioSession.stopAudioSession()
      } catch {
        // native module unavailable (jest / Expo Go) — nothing to stop
      }
    },
    onTranscript: (h) => {
      handler = h
    },
  }
}

export function disconnect(room: RoomHandle): void {
  room.disconnect()
}
