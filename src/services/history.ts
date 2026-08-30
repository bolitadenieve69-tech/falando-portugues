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

/** Minutes spoken worth celebrating. Each one is reachable from the one before. */
const MILESTONES_MIN = [10, 30, 60, 120, 180, 240, 300, 420, 600, 900, 1200];

/**
 * The next milestone and how close it is.
 *
 * Time spoken is the number that matters in learning to speak, and unlike a
 * streak it only ever grows: missing a day costs nothing already earned.
 */
export function nextMilestone(minutes: number) {
  const target = MILESTONES_MIN.find((m) => m > minutes) ?? null;
  if (target === null) return null;
  const previous = [...MILESTONES_MIN].reverse().find((m) => m <= minutes) ?? 0;
  const span = target - previous;
  return {
    target,
    remaining: Math.max(0, Math.ceil(target - minutes)),
    progress: span > 0 ? Math.min(1, (minutes - previous) / span) : 0,
  };
}

/**
 * Whether accuracy is moving, comparing the recent half against the earlier one.
 * Null until there are enough sessions for the comparison to mean anything.
 */
export function accuracyTrend(sessions: SessionRecord[]): number | null {
  if (sessions.length < 4) return null;
  const chronological = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  const half = Math.floor(chronological.length / 2);
  const rate = (group: SessionRecord[]) => {
    const msgs = group.reduce((n, s) => n + s.messageCount, 0);
    const corr = group.reduce((n, s) => n + s.correctionCount, 0);
    return msgs > 0 ? ((msgs - corr) / msgs) * 100 : 0;
  };
  return Math.round(rate(chronological.slice(half)) - rate(chronological.slice(0, half)));
}

export function computeStats(sessions: SessionRecord[]) {
  const totalSessions = sessions.length;
  const totalCorrections = sessions.reduce((sum, s) => sum + s.correctionCount, 0);
  const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
  const accuracy =
    totalMessages > 0
      ? Math.round(((totalMessages - totalCorrections) / totalMessages) * 100)
      : 0;

  const totalMinutes = Math.round(
    sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60,
  );
  const longestMinutes = Math.round(
    Math.max(0, ...sessions.map((s) => s.durationSeconds)) / 60,
  );

  const streakDays = computeStreak(sessions);
  const byTopic = computeByTopic(sessions);

  return {
    totalSessions,
    totalCorrections,
    accuracy,
    streakDays,
    byTopic,
    totalMinutes,
    longestMinutes,
    trend: accuracyTrend(sessions),
    milestone: nextMilestone(totalMinutes),
  };
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
