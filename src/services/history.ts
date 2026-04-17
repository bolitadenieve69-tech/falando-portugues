import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserLevel, ConversationTopic } from '../features/session/types';

const HISTORY_KEY = 'session_history';
const MAX_SESSIONS = 50;

export interface SessionRecord {
  id: string;
  topic: ConversationTopic;
  level: UserLevel;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  messageCount: number;
  correctionCount: number;
  excerpt: string;
}

export async function saveSession(record: SessionRecord): Promise<void> {
  const existing = await loadSessions();
  const updated = [record, ...existing].slice(0, MAX_SESSIONS);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function loadSessions(): Promise<SessionRecord[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SessionRecord[];
  } catch {
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

export interface TopicStat {
  topic: ConversationTopic;
  sessions: number;
  accuracy: number;
}

export function computeStats(sessions: SessionRecord[]) {
  const totalSessions = sessions.length;
  const totalCorrections = sessions.reduce((sum, s) => sum + s.correctionCount, 0);
  const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
  const accuracy =
    totalMessages > 0
      ? Math.round(((totalMessages - totalCorrections) / totalMessages) * 100)
      : 0;

  const streakDays = computeStreak(sessions);
  const byTopic = computeByTopic(sessions);

  return { totalSessions, totalCorrections, accuracy, streakDays, byTopic };
}

function computeByTopic(sessions: SessionRecord[]): TopicStat[] {
  const map = new Map<ConversationTopic, { msgs: number; corrections: number; count: number }>();

  for (const s of sessions) {
    const prev = map.get(s.topic) ?? { msgs: 0, corrections: 0, count: 0 };
    map.set(s.topic, {
      msgs: prev.msgs + s.messageCount,
      corrections: prev.corrections + s.correctionCount,
      count: prev.count + 1,
    });
  }

  return Array.from(map.entries())
    .map(([topic, { msgs, corrections, count }]) => ({
      topic,
      sessions: count,
      accuracy: msgs > 0 ? Math.round(((msgs - corrections) / msgs) * 100) : 100,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function computeStreak(sessions: SessionRecord[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(
    sessions.map((s) => new Date(s.startedAt).toDateString())
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(d.toDateString())) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
