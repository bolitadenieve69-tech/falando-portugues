export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  messages: Message[];
  topic: string;
  level: UserLevel;
  createdAt: number;
  updatedAt: number;
}

export type UserLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type ConversationTopic =
  | 'viagens'
  | 'trabalho'
  | 'familia'
  | 'comida'
  | 'cultura'
  | 'livre'
  | 'cidadania';
