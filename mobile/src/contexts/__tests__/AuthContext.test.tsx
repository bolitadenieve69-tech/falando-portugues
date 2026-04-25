import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react-native'
import { AuthProvider, useAuth } from '../AuthContext'
import * as storage from '../../services/storage'
import * as api from '../../services/api'

jest.mock('../../services/storage')
jest.mock('../../services/api')

const mockStorage = storage as jest.Mocked<typeof storage>
const mockApi = api as jest.Mocked<typeof api>

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  mockStorage.getAuthToken.mockResolvedValue(null)
  mockStorage.getOrCreateDeviceId.mockResolvedValue('device-123')
  mockStorage.saveAuthToken.mockResolvedValue(undefined)
  mockStorage.clearAuth.mockResolvedValue(undefined)
})

describe('AuthProvider initial state', () => {
  it('starts with isLoading true then resolves to null token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.token).toBeNull()
  })

  it('restores token from storage on mount', async () => {
    mockStorage.getAuthToken.mockResolvedValue({ token: 'stored-tok', username: 'pedro' })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.token).toBe('stored-tok'))
    expect(result.current.username).toBe('pedro')
  })
})

describe('login', () => {
  it('sets token and username after successful login', async () => {
    mockApi.login.mockResolvedValue({ token: 'new-tok', username: 'maria' })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.login('maria', 'pass')
    })

    expect(result.current.token).toBe('new-tok')
    expect(result.current.username).toBe('maria')
  })
})

describe('logout', () => {
  it('clears token and username', async () => {
    mockStorage.getAuthToken.mockResolvedValue({ token: 'tok', username: 'user' })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.token).toBe('tok'))

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.token).toBeNull()
  })
})
