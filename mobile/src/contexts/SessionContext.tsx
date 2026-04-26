import React, { createContext, useContext, useRef, useState } from 'react'
import type { SessionStatus, TranscriptEntry, SessionConfig } from '../features/session/types'
import type { SessionHistoryEntry } from '../types'
import { createSession as apiCreateSession } from '../services/api'
import { connect, disconnect, MockRoom } from '../services/livekit'
import { saveSession } from '../services/storage'

interface SessionState {
  status: SessionStatus
  transcript: TranscriptEntry[]
  livekitData: { roomName: string; token: string; livekitUrl: string } | null
  error: string | null
}

interface SessionContextValue extends SessionState {
  startSession: (config: SessionConfig) => Promise<void>
  endSession: () => Promise<void>
  setError: (error: string) => void
  addTranscriptEntry: (entry: TranscriptEntry) => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

interface SessionProviderProps {
  children: React.ReactNode
  token: string
}

export function SessionProvider({ children, token }: SessionProviderProps) {
  const [state, setState] = useState<SessionState>({
    status: 'idle',
    transcript: [],
    livekitData: null,
    error: null,
  })
  const roomRef = useRef<MockRoom | null>(null)
  const configRef = useRef<SessionConfig | null>(null)
  const startTimeRef = useRef<number>(0)

  function addTranscriptEntry(entry: TranscriptEntry): void {
    setState((prev) => ({ ...prev, transcript: [...prev.transcript, entry] }))
  }

  function setError(error: string): void {
    setState((prev) => ({ ...prev, status: 'error', error }))
  }

  async function startSession(config: SessionConfig): Promise<void> {
    configRef.current = config
    startTimeRef.current = Date.now()
    setState({ status: 'connecting', transcript: [], livekitData: null, error: null })

    try {
      const livekitData = await apiCreateSession(config, token)
      const room = connect(livekitData)
      roomRef.current = room

      room.onTranscript((entry) => {
        setState((prev) => ({ ...prev, transcript: [...prev.transcript, entry] }))
      })

      setState((prev) => ({ ...prev, status: 'active', livekitData }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start session'
      setState((prev) => ({ ...prev, status: 'error', error: message }))
    }
  }

  async function endSession(): Promise<void> {
    if (roomRef.current) {
      disconnect(roomRef.current)
      roomRef.current = null
    }

    const entry: SessionHistoryEntry = {
      id: `session-${startTimeRef.current}`,
      roomName: state.livekitData?.roomName ?? 'unknown',
      startedAt: startTimeRef.current,
      endedAt: Date.now(),
      transcript: state.transcript,
      config: configRef.current ?? { level: 'B1', topic: 'livre' },
    }

    await saveSession(entry)
    setState((prev) => ({ ...prev, status: 'ended' }))
  }

  return (
    <SessionContext.Provider value={{ ...state, startSession, endSession, setError, addTranscriptEntry }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
