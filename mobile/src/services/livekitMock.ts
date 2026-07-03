import type { LiveKitSessionData, TranscriptEntry } from '../features/session/types'
import type { RoomHandle } from './livekit'

const MOCK_SCRIPT: Array<Omit<TranscriptEntry, 'id' | 'timestamp'>> = [
  { speaker: 'tutor', text: 'Olá! Como posso ajudá-lo hoje?', hasCorrection: false },
  { speaker: 'user', text: 'Quero praticar o meu português.', hasCorrection: false },
  {
    speaker: 'tutor',
    text: 'Ótimo! Vamos praticar.',
    hasCorrection: true,
    correction: 'diz-se "praticar português", sem o artigo.',
  },
]

export function createMockRoom(_data: LiveKitSessionData): RoomHandle {
  let transcriptHandler: ((entry: TranscriptEntry) => void) | null = null
  const timers: ReturnType<typeof setTimeout>[] = []

  MOCK_SCRIPT.forEach((line, i) => {
    timers.push(
      setTimeout(() => {
        transcriptHandler?.({ ...line, id: `mock-${i}`, timestamp: Date.now() })
      }, 1500 * (i + 1))
    )
  })

  return {
    disconnect: () => timers.forEach(clearTimeout),
    onTranscript: (handler) => {
      transcriptHandler = handler
    },
  }
}
