import type { SessionConfig, LiveKitSessionData } from '../features/session/types'

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
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

export async function createSession(
  config: SessionConfig,
  token: string
): Promise<LiveKitSessionData> {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(config),
  })
  return handleResponse(res)
}

export async function translate(
  text: string,
  token: string
): Promise<{ translation: string }> {
  const res = await fetch(`${BASE_URL}/translate`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ text }),
  })
  return handleResponse(res)
}

export async function voicePreview(
  voiceId: string,
  token: string
): Promise<{ audioUrl: string }> {
  const res = await fetch(`${BASE_URL}/voices/${voiceId}/preview`, {
    method: 'GET',
    headers: authHeaders(token),
  })
  return handleResponse(res)
}
