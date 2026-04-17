import * as SecureStore from 'expo-secure-store';
import type { LiveKitSessionData } from '../features/session/types';

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

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
