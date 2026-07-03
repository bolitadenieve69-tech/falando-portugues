export type UserLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type ConversationTopic =
  | 'viagens'
  | 'trabalho'
  | 'familia'
  | 'comida'
  | 'cultura'
  | 'livre';

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error';

export interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'tutor';
  text: string;
  timestamp: number;
  hasCorrection: boolean;
  correction?: string;
}

export interface SessionConfig {
  level: UserLevel;
  topic: ConversationTopic;
}

export interface LiveKitSessionData {
  roomName: string;
  token: string;
  livekitUrl: string;
}
