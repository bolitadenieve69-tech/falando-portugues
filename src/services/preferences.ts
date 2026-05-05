import * as FileSystem from 'expo-file-system/legacy';
import type { UserLevel, ConversationTopic } from '../features/session/types';

const PREFS_FILE = 'user_preferences.json';

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
  voiceId: 'c0rzOw18hxEhaSybUod2',
  showTranscript: true,
  autoCorrections: true,
};

function prefsUri(): string {
  return (FileSystem.documentDirectory ?? '') + PREFS_FILE;
}

export async function loadPreferences(): Promise<UserPreferences> {
  try {
    const uri = prefsUri();
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return DEFAULT_PREFS;
    const raw = await FileSystem.readAsStringAsync(uri);
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(prefsUri(), JSON.stringify(prefs));
  } catch {
    // Storage not available — skip silently
  }
}
