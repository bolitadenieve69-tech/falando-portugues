import { useState, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

async function buildPreviewHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = {};
  if (APP_TOKEN) h['X-App-Token'] = APP_TOKEN;
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export function useVoicePreview() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [soundRef, setSoundRef] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      soundRef?.unloadAsync();
    };
  }, [soundRef]);

  const play = useCallback(async (voiceId: string) => {
    if (soundRef) {
      await soundRef.stopAsync();
      await soundRef.unloadAsync();
      setSoundRef(null);
    }

    if (playingId === voiceId) {
      setPlayingId(null);
      return;
    }

    setPlayingId(voiceId);

    try {
      const headers = await buildPreviewHeaders();
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: `${BACKEND_URL}/voice-preview/${voiceId}`, headers },
        { shouldPlay: true },
      );
      setSoundRef(sound);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
          sound.unloadAsync();
          setSoundRef(null);
        }
      });
    } catch {
      setPlayingId(null);
    }
  }, [playingId, soundRef]);

  return { playingId, play };
}
