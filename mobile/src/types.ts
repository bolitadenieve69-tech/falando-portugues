import type { UserLevel, ConversationTopic, TranscriptEntry } from './features/session/types'

export type { UserLevel, ConversationTopic, TranscriptEntry }

export interface SettingsState {
  level: UserLevel
  topic: ConversationTopic
  voiceId: string
}

export const DEFAULT_SETTINGS: SettingsState = {
  level: 'B1',
  topic: 'livre',
  voiceId: 'DMcOknq8n1B6XshFIJKJ',
}

export interface SessionHistoryEntry {
  id: string
  roomName: string
  startedAt: number
  endedAt: number
  transcript: TranscriptEntry[]
  config: {
    level: UserLevel
    topic: ConversationTopic
  }
}
