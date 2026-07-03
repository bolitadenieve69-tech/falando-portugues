import type { SessionConfig, LiveKitSessionData } from '../features/session/types'

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'

function authHeaders(token: string): Record<string, string> {
  // Read via a computed key so bundlers that statically inline
  // `process.env.EXPO_PUBLIC_*` member expressions at build time don't bake
  // in a stale value — this must be read fresh at call time.
  const appTokenKey = 'EXPO_PUBLIC_APP_TOKEN'
  const appToken = process.env[appTokenKey] ?? ''
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(appToken ? { 'X-App-Token': appToken } : {}),
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API error ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export async function login(
  username: string,
  password: string,
  deviceId: string
): Promise<{ token: string; username: string }> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, device_id: deviceId }),
  })
  return handleResponse(res)
}

export async function register(
  username: string,
  password: string,
  deviceId: string
): Promise<{ token: string; username: string }> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, device_id: deviceId }),
  })
  return handleResponse(res)
}

export interface SessionMeta {
  voiceId: string
  participantName: string
}

export async function createSession(
  config: SessionConfig,
  token: string,
  meta: SessionMeta
): Promise<LiveKitSessionData> {
  const res = await fetch(`${BASE_URL}/session`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      level: config.level,
      topic: config.topic,
      voice_id: meta.voiceId,
      participant_name: meta.participantName,
    }),
  })
  const data = await handleResponse<{ room_name: string; token: string; livekit_url: string }>(res)
  return { roomName: data.room_name, token: data.token, livekitUrl: data.livekit_url }
}

export async function translate(
  word: string,
  token: string
): Promise<{ translation: string }> {
  const res = await fetch(`${BASE_URL}/translate`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ word }),
  })
  return handleResponse(res)
}

export async function voicePreview(
  voiceId: string,
  token: string
): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE_URL}/voice-preview/${voiceId}`, {
    method: 'GET',
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`voice-preview failed: ${res.status} ${body}`)
  }
  return res.arrayBuffer()
}
