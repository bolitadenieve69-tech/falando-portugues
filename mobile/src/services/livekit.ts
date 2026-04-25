import type { LiveKitSessionData, TranscriptEntry } from '../features/session/types'

export interface MockRoom {
  disconnect: () => void
  onTranscript: (handler: (entry: TranscriptEntry) => void) => void
}

const MOCK_SCRIPT: Array<Omit<TranscriptEntry, 'id' | 'timestamp'>> = [
  { speaker: 'tutor', text: 'Olá! Como posso ajudá-lo hoje?', hasCorrection: false },
  { speaker: 'user', text: 'Quero praticar o meu português.', hasCorrection: false },
  {
    speaker: 'tutor',
    text: 'Ótimo! Note: "o meu" is redundant — just say "Quero praticar português."',
    hasCorrection: true,
  },
]

export function connect(_data: LiveKitSessionData): MockRoom {
  let transcriptHandler: ((entry: TranscriptEntry) => void) | null = null
  const timers: ReturnType<typeof setTimeout>[] = []

  MOCK_SCRIPT.forEach((line, i) => {
    const timer = setTimeout(() => {
      if (transcriptHandler) {
        transcriptHandler({
          ...line,
          id: `mock-${i}`,
          timestamp: Date.now(),
        })
      }
    }, 1500 * (i + 1))
    timers.push(timer)
  })

  return {
    disconnect: () => timers.forEach(clearTimeout),
    onTranscript: (handler) => {
      transcriptHandler = handler
    },
  }
}

export function disconnect(room: MockRoom): void {
  room.disconnect()
}
