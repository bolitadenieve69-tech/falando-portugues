import { useState, useCallback, useRef } from 'react';
import { Room, RoomEvent, RemoteParticipant } from 'livekit-client';
import { createSession } from '../../../services/api';
import { saveSession } from '../../../services/history';
import { loadPreferences } from '../../../services/preferences';
import type {
  SessionStatus,
  TranscriptEntry,
  SessionConfig,
  LiveKitSessionData,
} from '../types';

interface UseVoiceSessionReturn {
  status: SessionStatus;
  transcript: TranscriptEntry[];
  sessionData: LiveKitSessionData | null;
  room: Room | null;
  startSession: (config: SessionConfig) => Promise<void>;
  endSession: () => Promise<void>;
  toggleMute: () => void;
  isMuted: boolean;
  error: string | null;
}

export function useVoiceSession(): UseVoiceSessionReturn {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionData, setSessionData] = useState<LiveKitSessionData | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const sessionStartRef = useRef<number>(0);
  const sessionConfigRef = useRef<SessionConfig | null>(null);

  const addTranscriptEntry = useCallback(
    (speaker: 'user' | 'tutor', text: string, hasCorrection = false) => {
      const entry: TranscriptEntry = {
        id: `${Date.now()}-${Math.random()}`,
        speaker,
        text,
        timestamp: Date.now(),
        hasCorrection,
      };
      setTranscript((prev) => [...prev, entry]);
    },
    []
  );

  const startSession = useCallback(async (config: SessionConfig) => {
    setStatus('connecting');
    setError(null);
    setTranscript([]);
    sessionStartRef.current = Date.now();
    sessionConfigRef.current = config;

    try {
      // 1. Get LiveKit token from backend
      const prefs = await loadPreferences();
      const data = await createSession({
        level: config.level,
        topic: config.topic,
        voiceId: prefs.voiceId,
      });
      setSessionData(data);

      // 2. Create and connect to LiveKit room
      const room = new Room();
      roomRef.current = room;

      // Listen for transcription data messages from the Pipecat bot
      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const message = JSON.parse(new TextDecoder().decode(payload));
          if (message.type === 'transcript') {
            addTranscriptEntry(
              participant ? 'tutor' : 'user',
              message.text,
              message.correction != null
            );
          }
        } catch {
          // ignore malformed messages
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setStatus('ended');
      });

      await room.connect(data.livekitUrl, data.token);

      // 3. Publish microphone
      await room.localParticipant.setMicrophoneEnabled(true);

      setStatus('active');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar';
      setError(message);
      setStatus('error');
    }
  }, [addTranscriptEntry]);

  const endSession = useCallback(async () => {
    const endedAt = Date.now();
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    setTranscript((current) => {
      const config = sessionConfigRef.current;
      if (config && sessionStartRef.current > 0 && current.length > 0) {
        const corrections = current.filter((e) => e.hasCorrection).length;
        const excerpt = current.find((e) => e.speaker === 'tutor')?.text ?? '';
        saveSession({
          id: `${sessionStartRef.current}`,
          topic: config.topic,
          level: config.level,
          startedAt: sessionStartRef.current,
          endedAt,
          durationSeconds: Math.round((endedAt - sessionStartRef.current) / 1000),
          messageCount: current.length,
          correctionCount: corrections,
          excerpt: excerpt.slice(0, 120),
        });
      }
      return current;
    });

    setStatus('ended');
    setSessionData(null);
  }, []);

  const toggleMute = useCallback(() => {
    if (!roomRef.current) return;
    const enabled = !isMuted;
    roomRef.current.localParticipant.setMicrophoneEnabled(enabled);
    setIsMuted(!enabled);
  }, [isMuted]);

  return {
    status,
    transcript,
    sessionData,
    room: roomRef.current,
    startSession,
    endSession,
    toggleMute,
    isMuted,
    error,
  };
}
