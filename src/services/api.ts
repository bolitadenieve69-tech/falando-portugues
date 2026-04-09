import type { LiveKitSessionData } from '../features/session/types';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

interface CreateSessionParams {
  level: string;
  topic: string;
  voiceId?: string;
  participantName?: string;
}

export async function createSession(
  params: CreateSessionParams
): Promise<LiveKitSessionData> {
  const response = await fetch(`${BACKEND_URL}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
