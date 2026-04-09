export type { UserLevel, ConversationTopic } from '../conversation/types';

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error';

export interface SessionConfig {
  level: UserLevel;
  topic: ConversationTopic;
}

export interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'tutor';
  text: string;
  timestamp: number;
  hasCorrection?: boolean;
}

export interface LiveKitSessionData {
  roomName: string;
  token: string;
  livekitUrl: string;
}
