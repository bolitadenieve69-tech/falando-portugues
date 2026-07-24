import * as SecureStore from 'expo-secure-store';
import type { LiveKitSessionData } from '../features/session/types';
import type { SessionRecord } from './history';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (APP_TOKEN) headers['X-App-Token'] = APP_TOKEN;
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

interface CreateSessionParams {
  level: string;
  topic: string;
  voiceId?: string;
  participantName?: string;
  /** BCP-47 language tag (e.g. "pt-PT"). Omitted → backend defaults to Portuguese. */
  language?: string;
}

export async function createSession(
  params: CreateSessionParams,
): Promise<LiveKitSessionData> {
  const response = await fetch(`${BACKEND_URL}/session`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      level: params.level,
      topic: params.topic,
      voice_id: params.voiceId,
      participant_name: params.participantName ?? 'user',
      ...(params.language ? { language: params.language } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create session: ${error}`);
  }

  const data = await response.json();
  return {
    roomName: data.room_name,
    token: data.token,
    livekitUrl: data.livekit_url,
  };
}

/** Snake_case shape the backend /sessions API expects and returns. */
interface RemoteSessionRecord {
  id: string;
  topic: string;
  level: string;
  started_at: number;
  ended_at: number;
  duration_seconds: number;
  message_count: number;
  correction_count: number;
  excerpt: string;
}

function toRemote(r: SessionRecord): RemoteSessionRecord {
  return {
    id: r.id,
    topic: r.topic,
    level: r.level,
    started_at: r.startedAt,
    ended_at: r.endedAt,
    duration_seconds: r.durationSeconds,
    message_count: r.messageCount,
    correction_count: r.correctionCount,
    excerpt: r.excerpt,
  };
}

function fromRemote(r: RemoteSessionRecord): SessionRecord {
  return {
    id: r.id,
    topic: r.topic as SessionRecord['topic'],
    level: r.level as SessionRecord['level'],
    startedAt: r.started_at,
    endedAt: r.ended_at,
    durationSeconds: r.duration_seconds,
    messageCount: r.message_count,
    correctionCount: r.correction_count,
    excerpt: r.excerpt,
  };
}

/** Best-effort upload of a completed session. Never throws — local storage is the source of truth. */
export async function saveSessionRemote(record: SessionRecord): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/sessions`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(toRemote(record)),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Fetch server-side session history. Returns null on failure so callers can fall back to local. */
export async function fetchSessionsRemote(): Promise<SessionRecord[] | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/sessions`, {
      headers: await authHeaders(),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { sessions: RemoteSessionRecord[] };
    return data.sessions.map(fromRemote);
  } catch {
    return null;
  }
}

export interface LanguageInfo {
  code: string;
  name: string;
  ready: boolean;
  levels: string[];
  topics: { key: string; label: string }[];
  voices: { id: string; name: string }[];
}

/** Fetch the languages the backend supports. Returns null on failure. */
export async function fetchLanguages(): Promise<LanguageInfo[] | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/languages`, {
      headers: await authHeaders(),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { languages: LanguageInfo[] };
    return data.languages;
  } catch {
    return null;
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
