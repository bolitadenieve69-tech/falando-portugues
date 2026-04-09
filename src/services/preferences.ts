import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserLevel, ConversationTopic } from '../features/session/types';

const PREFS_KEY = 'user_preferences';

export interface UserPreferences {
  level: UserLevel;
  defaultTopic: ConversationTopic | null;
  voiceId: string;
  showTranscript: boolean;
  autoCorrections: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  level: 'B1',
  defaultTopic: null,
  voiceId: 'DMcOknq8n1B6XshFIJKJ',
  showTranscript: true,
  autoCorrections: true,
};

export async function loadPreferences(): Promise<UserPreferences> {
  const raw = await AsyncStorage.getItem(PREFS_KEY);
  if (!raw) return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
