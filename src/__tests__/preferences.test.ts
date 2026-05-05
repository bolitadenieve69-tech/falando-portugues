import { loadPreferences, savePreferences } from '../services/preferences';

const mockFs: Record<string, string> = {};

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock-docs/',
  getInfoAsync: jest.fn(async (uri: string) => ({
    exists: uri in mockFs,
    uri,
  })),
  readAsStringAsync: jest.fn(async (uri: string) => {
    const val = mockFs[uri];
    if (val === undefined) throw new Error('File not found');
    return val;
  }),
  writeAsStringAsync: jest.fn(async (uri: string, content: string) => {
    mockFs[uri] = content;
  }),
}));

beforeEach(() => {
  Object.keys(mockFs).forEach((k) => delete mockFs[k]);
  jest.clearAllMocks();
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
    mockFs['file:///mock-docs/user_preferences.json'] = JSON.stringify({
      level: 'A2',
      showTranscript: false,
    });
    const prefs = await loadPreferences();
    expect(prefs.level).toBe('A2');
    expect(prefs.showTranscript).toBe(false);
    expect(prefs.autoCorrections).toBe(true);
  });

  it('returns defaults when stored JSON is malformed', async () => {
    mockFs['file:///mock-docs/user_preferences.json'] = 'not-json{{{';
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
    mockFs['file:///mock-docs/user_preferences.json'] = JSON.stringify(stored);
    const prefs = await loadPreferences();
    expect(prefs.level).toBe('C1');
    expect(prefs.defaultTopic).toBe('viagens');
    expect(prefs.voiceId).toBe('abc123');
    expect(prefs.showTranscript).toBe(false);
    expect(prefs.autoCorrections).toBe(false);
  });
});

describe('savePreferences', () => {
  it('persists preferences to FileSystem', async () => {
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
