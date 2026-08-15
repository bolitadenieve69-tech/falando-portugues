import React from 'react';
import { act, create } from 'react-test-renderer';
import SessionScreen from '../[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ level: 'B1', topic: 'livre' }),
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => <>{children}</>,
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: ({ name }: any) => <span>{name}</span>,
}));

jest.mock('../../../src/constants/theme', () => ({
  Colors: {
    background: '#fff',
    onSurface: '#000',
    primary: '#000',
    errorContainer: '#ffcccc',
    onErrorContainer: '#330000',
    surfaceContainerLow: '#f5f5f5',
    tertiary: '#006600',
    tertiaryContainer: '#e6f2e6',
    surface: '#fff',
    surfaceVariant: '#eee',
    onSurfaceVariant: '#333',
    error: '#cc0000',
    surfaceContainerHighest: '#ddd',
    primaryContainer: '#e6f2ff',
    onPrimaryContainer: '#000',
    outlineVariant: '#ccc',
    surface2: '#eee',
    success: '#006600',
    textSecondary: '#333',
  },
  Typography: {
    body: 'System',
    label: 'System',
    headlineBold: 'System',
    sizes: { xs: 12 },
    weights: { semibold: '600' },
  },
  BorderRadius: { sm: 4, md: 8, lg: 12 },
  Spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
}));

jest.mock('../../../src/features/session/hooks/useVoiceSession', () => ({
  useVoiceSession: jest.fn(),
}));

jest.mock('../../../src/features/session/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}));

jest.mock('../../../src/features/session/components/TappableText', () => ({
  TappableText: ({ text }: any) => <span>{text}</span>,
}));

jest.mock('../../../src/features/debug/DebugPanel', () => ({
  DebugPanel: () => null,
}));

jest.mock('../../../src/services/preferences', () => ({
  loadPreferences: jest.fn(() =>
    Promise.resolve({ showTranscript: true, autoCorrections: true })
  ),
}));

import { useVoiceSession } from '../../../src/features/session/hooks/useVoiceSession';

const mockedUseVoiceSession = useVoiceSession as jest.Mock;

describe('SessionScreen', () => {
  afterEach(() => {
    mockedUseVoiceSession.mockReset();
  });

  it('shows a clear error message and retry button when the tutor fails', () => {
    mockedUseVoiceSession.mockReturnValue({
      status: 'error',
      transcript: [],
      startSession: jest.fn(),
      endSession: jest.fn(),
      toggleMute: jest.fn(),
      sendTextMessage: jest.fn(),
      isMuted: false,
      isUserSpeaking: false,
      tutorName: 'Tutor',
      error: 'O tutor de voz não conseguiu ligar. Tenta novamente.',
    });

    let root: ReturnType<typeof create> | null = null;
    act(() => {
      root = create(<SessionScreen />);
    });

    const json = JSON.stringify(root!.toJSON());
    expect(json).toContain('O tutor de voz não conseguiu ligar. Tenta novamente.');
    expect(json).toContain('Tentar novamente');

    act(() => {
      root!.unmount();
    });
  });

  it('keeps the normal active flow visible when the tutor connects', () => {
    mockedUseVoiceSession.mockReturnValue({
      status: 'active',
      transcript: [],
      startSession: jest.fn(),
      endSession: jest.fn(),
      toggleMute: jest.fn(),
      sendTextMessage: jest.fn(),
      isMuted: false,
      isUserSpeaking: false,
      tutorName: 'Tutor',
      error: null,
    });

    let root: ReturnType<typeof create> | null = null;
    act(() => {
      root = create(<SessionScreen />);
    });

    const json = JSON.stringify(root!.toJSON());
    expect(json).toContain('A conversar...');

    act(() => {
      root!.unmount();
    });
  });
});
