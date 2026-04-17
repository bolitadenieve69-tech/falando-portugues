import { loadPreferences, savePreferences } from '../services/preferences';

const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
});

describe('loadPreferences', () => {
  it('returns defaults when nothing is stored', async () => {
    const prefs = await loadPreferences();
    expect(prefs.level).toBe('B1');
    expect(prefs.showTranscript).toBe(true);
    expect(prefs.autoCorrections).toBe(true);
    expect(prefs.defaultTopic).toBeNull();
  });

  it('merges stored values with defaults', async () => {
    mockStorage['user_preferences'] = JSON.stringify({ level: 'A2', showTranscript: false });
    const prefs = await loadPreferences();
    expect(prefs.level).toBe('A2');
    expect(prefs.showTranscript).toBe(false);
    expect(prefs.autoCorrections).toBe(true);
  });

  it('returns defaults when stored JSON is malformed', async () => {
    mockStorage['user_preferences'] = 'not-json{{{';
    const prefs = await loadPreferences();
    expect(prefs.level).toBe('B1');
  });

  it('preserves all stored fields', async () => {
    const stored = {
      level: 'C1',
      defaultTopic: 'viagens',
      voiceId: 'abc123',
      showTranscript: false,
      autoCorrections: false,
    };
    mockStorage['user_preferences'] = JSON.stringify(stored);
    const prefs = await loadPreferences();
    expect(prefs.level).toBe('C1');
    expect(prefs.defaultTopic).toBe('viagens');
    expect(prefs.voiceId).toBe('abc123');
    expect(prefs.showTranscript).toBe(false);
    expect(prefs.autoCorrections).toBe(false);
  });
});

describe('savePreferences', () => {
  it('persists preferences to AsyncStorage', async () => {
    const prefs = await loadPreferences();
    await savePreferences({ ...prefs, level: 'C2', showTranscript: false });
    const reloaded = await loadPreferences();
    expect(reloaded.level).toBe('C2');
    expect(reloaded.showTranscript).toBe(false);
  });

  it('round-trips autoCorrections false', async () => {
    const prefs = await loadPreferences();
    await savePreferences({ ...prefs, autoCorrections: false });
    const reloaded = await loadPreferences();
    expect(reloaded.autoCorrections).toBe(false);
  });
});
