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
  it('posts config with auth header and returns LiveKit data', async () => {
    mockOk({ roomName: 'room-1', token: 'lk-tok', livekitUrl: 'wss://x' })
    const result = await createSession({ level: 'B1', topic: 'livre' }, 'my-token')
    expect(result.roomName).toBe('room-1')
    const call = mockFetch.mock.calls[0]
    expect(call[1].headers.Authorization).toBe('Bearer my-token')
  })
})

describe('error handling', () => {
  it('throws on non-ok response', async () => {
    mockError(401, 'Unauthorized')
    await expect(login('x', 'y', 'z')).rejects.toThrow('API error 401')
  })
})
