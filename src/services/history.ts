import * as FileSystem from 'expo-file-system/legacy';
import type { UserLevel, ConversationTopic } from '../features/session/types';

const HISTORY_FILE = 'session_history.json';
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

function historyUri(): string {
  return (FileSystem.documentDirectory ?? '') + HISTORY_FILE;
}

export async function saveSession(record: SessionRecord): Promise<void> {
  try {
    const existing = await loadSessions();
    const nextRecord = ensureUniqueId(record, existing);
    const updated = [nextRecord, ...existing].slice(0, MAX_SESSIONS);
    await FileSystem.writeAsStringAsync(historyUri(), JSON.stringify(updated));
  } catch {
    // Storage not available — skip silently
  }
}

/**
 * Merge server-side records into local storage (dedupe by id, newest first)
 * and return the merged list. Lets a reinstalled app recover its history.
 * Pure with respect to the network — callers fetch remote records and pass them in.
 */
export async function mergeRemoteSessions(
  remote: SessionRecord[],
): Promise<SessionRecord[]> {
  const local = await loadSessions();
  const byId = new Map<string, SessionRecord>();
  for (const s of [...local, ...remote]) byId.set(s.id, s);
  const merged = Array.from(byId.values())
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, MAX_SESSIONS);
  try {
    await FileSystem.writeAsStringAsync(historyUri(), JSON.stringify(merged));
  } catch {
    // Storage not available — return the in-memory merge anyway.
  }
  return merged;
}

export async function loadSessions(): Promise<SessionRecord[]> {
  try {
    const uri = historyUri();
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(uri);
    return JSON.parse(raw) as SessionRecord[];
  } catch {
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  try {
    const uri = historyUri();
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri);
  } catch {
    // Storage not available — skip silently
  }
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
  const days = new Set(sessions.map((s) => new Date(s.startedAt).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else break;
  }
  return streak;
}

function ensureUniqueId(record: SessionRecord, existing: SessionRecord[]): SessionRecord {
  if (!existing.some((s) => s.id === record.id)) return record;
  return {
    ...record,
    id: `${record.id}-${Date.now()}-${existing.length}`,
  };
}
