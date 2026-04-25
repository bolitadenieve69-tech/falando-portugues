import React, { createContext, useContext, useEffect, useState } from 'react'
import { getAuthToken, saveAuthToken, clearAuth } from '../services/storage'
import { login as apiLogin, register as apiRegister } from '../services/api'
import { getOrCreateDeviceId } from '../services/storage'

interface AuthState {
  token: string | null
  username: string | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    username: null,
    isLoading: true,
  })

  useEffect(() => {
    getAuthToken().then((stored) => {
      setState({
        token: stored?.token ?? null,
        username: stored?.username ?? null,
        isLoading: false,
      })
    })
  }, [])

  async function login(username: string, password: string): Promise<void> {
    const deviceId = await getOrCreateDeviceId()
    const result = await apiLogin(username, password, deviceId)
    await saveAuthToken(result.token, result.username)
    setState({ token: result.token, username: result.username, isLoading: false })
  }

  async function register(username: string, password: string): Promise<void> {
    const deviceId = await getOrCreateDeviceId()
    const result = await apiRegister(username, password, deviceId)
    await saveAuthToken(result.token, result.username)
    setState({ token: result.token, username: result.username, isLoading: false })
  }

  async function logout(): Promise<void> {
    await clearAuth()
    setState({ token: null, username: null, isLoading: false })
  }

  return <AuthContext.Provider value={{ ...state, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
