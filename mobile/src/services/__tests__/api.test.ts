import { login, register, createSession, translate, voicePreview } from '../api'

const mockFetch = jest.fn()
global.fetch = mockFetch

function mockOk(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
  })
}

function mockError(status: number, body = 'Error') {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: () => Promise.resolve(body),
  })
}

beforeEach(() => mockFetch.mockClear())

describe('login', () => {
  it('posts credentials and returns token', async () => {
    mockOk({ token: 'tok', username: 'pedro' })
    const result = await login('pedro', 'pass', 'device-1')
    expect(result.token).toBe('tok')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('register', () => {
  it('posts credentials and returns token', async () => {
    mockOk({ token: 'tok2', username: 'maria' })
    const result = await register('maria', 'pass', 'device-2')
    expect(result.token).toBe('tok2')
  })
})

describe('createSession', () => {
  it('posts to /session with app token and full body, maps snake_case response', async () => {
    process.env.EXPO_PUBLIC_APP_TOKEN = 'app-tok'
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ room_name: 'room-1', token: 'lk-tok', livekit_url: 'wss://test' }),
    })
    const result = await createSession(
      { level: 'B1', topic: 'livre' },
      'user-tok',
      { voiceId: 'DMcOknq8n1B6XshFIJKJ', participantName: 'angel' }
    )
    expect(result).toEqual({ roomName: 'room-1', token: 'lk-tok', livekitUrl: 'wss://test' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/session'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer user-tok',
          'X-App-Token': 'app-tok',
        }),
        body: JSON.stringify({
          level: 'B1',
          topic: 'livre',
          voice_id: 'DMcOknq8n1B6XshFIJKJ',
          participant_name: 'angel',
        }),
      })
    )
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' })
    await expect(
      createSession({ level: 'A1', topic: 'comida' }, 'tok', { voiceId: 'v', participantName: 'u' })
    ).rejects.toThrow()
  })
})

describe('translate', () => {
  it('posts word field to /translate', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ word: 'casa', translation: 'casa' }) })
    await translate('casa', 'tok')
    const [, options] = mockFetch.mock.calls[0]
    expect(JSON.parse(options.body).word).toBe('casa')
  })
})

describe('voicePreview', () => {
  it('GETs /voice-preview/{id}', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    await voicePreview('DMcOknq8n1B6XshFIJKJ', 'tok')
    expect(mockFetch.mock.calls[0][0]).toContain('/voice-preview/DMcOknq8n1B6XshFIJKJ')
  })
})

describe('error handling', () => {
  it('throws on non-ok response', async () => {
    mockError(401, 'Unauthorized')
    await expect(login('x', 'y', 'z')).rejects.toThrow('API error 401')
  })
})
