import { useState, useCallback, useEffect, useRef } from 'react';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { Room, RoomEvent, RemoteParticipant } from 'livekit-client';
import { createSession, fetchSessionStatus, saveSessionRemote } from '../../../services/api';
import { saveSession } from '../../../services/history';
import { loadPreferences } from '../../../services/preferences';
import type {
  SessionStatus,
  TranscriptEntry,
  SessionConfig,
  LiveKitSessionData,
} from '../types';
import { parseTranscriptMessage } from '../utils/parseTranscriptMessage';

/** Map known ElevenLabs voice IDs to display names. */
const VOICE_NAMES: Record<string, string> = {
  nJ5NFqyKb8kn9JBPmo6i: 'Joana',
  DMcOknq8n1B6XshFIJKJ: 'Patrício',
  c0rzOw18hxEhaSybUod2: 'Tiago',
};
const DEFAULT_TUTOR_NAME = 'Tutor';

/**
 * Request microphone permission and configure the audio session.
 * Throws a user-friendly error if the permission is denied.
 */
async function requestMicAndConfigureAudio(): Promise<void> {
  // 1. Request permission explicitly — iOS ignores setMicrophoneEnabled
  //    if the user hasn't been prompted yet.
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error(
      'Permissão do microfone negada. Vai a Definições → Falando Português → Microfone e ativa o acesso.',
    );
  }

  // 2. Configure audio session for simultaneous mic + speaker (WebRTC call).
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    shouldDuckAndroid: true,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    playThroughEarpieceAndroid: false,
  });
}

export interface UseVoiceSessionReturn {
  status: SessionStatus;
  transcript: TranscriptEntry[];
  sessionData: LiveKitSessionData | null;
  room: Room | null;
  startSession: (config: SessionConfig) => Promise<void>;
  endSession: () => Promise<void>;
  toggleMute: () => void;
  sendTextMessage: (text: string) => Promise<void>;
  isMuted: boolean;
  /** True while LiveKit detects the local participant is speaking. */
  isUserSpeaking: boolean;
  tutorName: string;
  error: string | null;
}

export function useVoiceSession(): UseVoiceSessionReturn {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionData, setSessionData] = useState<LiveKitSessionData | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [tutorName, setTutorName] = useState(DEFAULT_TUTOR_NAME);
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const sessionStartRef = useRef<number>(0);
  const sessionConfigRef = useRef<SessionConfig | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const statusRef = useRef<SessionStatus>('idle');
  const tutorPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const addTranscriptEntry = useCallback(
    (speaker: 'user' | 'tutor', text: string, correction?: string) => {
      const entry: TranscriptEntry = {
        id: `${Date.now()}-${Math.random()}`,
        speaker,
        text,
        timestamp: Date.now(),
        correction,
      };
      transcriptRef.current = [...transcriptRef.current, entry];
      setTranscript(transcriptRef.current);
    },
    [],
  );

  const stopTutorPolling = useCallback(() => {
    if (tutorPollRef.current) {
      clearTimeout(tutorPollRef.current);
      tutorPollRef.current = null;
    }
  }, []);

  const waitForTutor = useCallback(
    (roomName: string, room: Room) => {
      const startTime = Date.now();
      const TUTOR_TIMEOUT_MS = 30_000;
      const POLL_INTERVAL_MS = 2_000;

      const check = async () => {
        if (statusRef.current !== 'connecting') {
          return;
        }

        if (Date.now() - startTime > TUTOR_TIMEOUT_MS) {
          stopTutorPolling();
          setError('O tutor de voz não ligou a tempo. Tenta novamente.');
          setStatus('error');
          await room.disconnect();
          roomRef.current = null;
          return;
        }

        try {
          const tutorStatus = await fetchSessionStatus(roomName);
          if (tutorStatus === 'ready') {
            stopTutorPolling();
            setStatus('active');
            return;
          }
          if (tutorStatus === 'failed' || tutorStatus === 'ended') {
            stopTutorPolling();
            setError('O tutor de voz não conseguiu ligar. Tenta novamente.');
            setStatus('error');
            await room.disconnect();
            roomRef.current = null;
            return;
          }
        } catch (err) {
          stopTutorPolling();
          const message =
            err instanceof Error
              ? err.message
              : 'Erro ao verificar estado do tutor.';
          setError(message);
          setStatus('error');
          await room.disconnect();
          roomRef.current = null;
          return;
        }

        tutorPollRef.current = setTimeout(check, POLL_INTERVAL_MS);
      };

      tutorPollRef.current = setTimeout(check, POLL_INTERVAL_MS);
    },
    [stopTutorPolling],
  );
  const startSession = useCallback(
    async (config: SessionConfig) => {
      setStatus('connecting');
      setError(null);
      setTranscript([]);
      transcriptRef.current = [];
      setIsUserSpeaking(false);
      sessionStartRef.current = Date.now();
      sessionConfigRef.current = config;

      try {
        // 1. Request mic permission and configure audio session.
        await requestMicAndConfigureAudio();

        // 2. Fetch token from backend.
        const prefs = await loadPreferences();
        const data = await createSession({
          level: config.level,
          topic: config.topic,
          voiceId: prefs.voiceId,
        });
        setSessionData(data);
        setTutorName(VOICE_NAMES[prefs.voiceId] ?? DEFAULT_TUTOR_NAME);

        // 3. Create LiveKit room.
        const room = new Room();
        roomRef.current = room;

        // Receive transcript data messages sent by the Pipecat bot. The backend
        // already splits tutor replies into clean text + a separate correction
        // field, so we forward that correction straight through (see
        // parseTranscriptMessage) instead of re-parsing the clean text.
        room.on(
          RoomEvent.DataReceived,
          (payload: Uint8Array, _participant?: RemoteParticipant) => {
            const message = parseTranscriptMessage(payload);
            if (message) {
              addTranscriptEntry(
                message.speaker,
                message.text,
                message.correction,
              );
            }
          },
        );

        room.on(RoomEvent.Disconnected, () => {
          setStatus('ended');
          setIsUserSpeaking(false);
          roomRef.current = null;
        });

        // Detect when the local user is speaking (VAD from LiveKit).
        room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          const localId = room.localParticipant.identity;
          setIsUserSpeaking(speakers.some((s) => s.identity === localId));
        });

        // 4. Connect and enable microphone.
        await room.connect(data.livekitUrl, data.token);

        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch (micErr) {
          // Mic enable failure is non-fatal — session still works (tutor speaks).
          // Surface the error so the debug panel shows it.
          const msg = micErr instanceof Error ? micErr.message : String(micErr);
          console.error('[mic] setMicrophoneEnabled failed:', msg);
          setError(`Microfone: ${msg}`);
        }

        // 5. Wait for the tutor bot to join before marking the session active.
        waitForTutor(data.roomName, room);
      } catch (err) {
        stopTutorPolling();
        const message =
          err instanceof Error ? err.message : 'Erro ao conectar';
        setError(message);
        setStatus('error');
      }
    },
    [addTranscriptEntry, waitForTutor, stopTutorPolling],
  );

  const endSession = useCallback(async () => {
    stopTutorPolling();
    const endedAt = Date.now();

    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    setIsUserSpeaking(false);

    const current = transcriptRef.current;
    const config = sessionConfigRef.current;
    if (config && sessionStartRef.current > 0 && current.length > 0) {
      const corrections = current.filter((e) => e.correction != null).length;
      const excerpt = current.find((e) => e.speaker === 'tutor')?.text ?? '';
      const record = {
        id: `${sessionStartRef.current}-${endedAt}`,
        topic: config.topic,
        level: config.level,
        startedAt: sessionStartRef.current,
        endedAt,
        durationSeconds: Math.round((endedAt - sessionStartRef.current) / 1000),
        messageCount: current.length,
        correctionCount: corrections,
        excerpt: excerpt.slice(0, 120),
      };
      // Local storage is the source of truth; the server upload is best-effort
      // and must never block ending the session or throw.
      await saveSession(record);
      void saveSessionRemote(record);
    }

    setStatus('ended');
    setSessionData(null);
  }, [stopTutorPolling]);

  /**
   * Toggle microphone mute state.
   *
   * Fixed: previous implementation had inverted logic — it passed !isMuted
   * to setMicrophoneEnabled and then called setIsMuted(!enabled), which
   * left both state and hardware unchanged on every press.
   */
  const toggleMute = useCallback(() => {
    if (!roomRef.current) return;
    const newMuted = !isMuted;
    roomRef.current.localParticipant.setMicrophoneEnabled(!newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  /** Send a typed message to the bot via the LiveKit data channel. */
  const isPromise = (value: unknown): value is Promise<unknown> =>
    typeof value === 'object' && value !== null && 'then' in value && typeof (value as any).then === 'function';

  const sendTextMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !roomRef.current) return;

    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'user_text', text: trimmed }),
    );

    try {
      const result = roomRef.current.localParticipant.publishData(payload, {
        reliable: true,
      });

      if (isPromise(result)) {
        await result;
      }

      addTranscriptEntry('user', trimmed);
    } catch (err) {
      console.warn('[livekit] publishData failed', err);
      setError('Erro ao enviar mensagem. Verifique a conexão.');
    }
  }, [addTranscriptEntry]);

  return {
    status,
    transcript,
    sessionData,
    room: roomRef.current,
    startSession,
    endSession,
    toggleMute,
    sendTextMessage,
    isMuted,
    isUserSpeaking,
    tutorName,
    error,
  };
}
