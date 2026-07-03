import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { SettingsProvider } from '../../src/contexts/SettingsContext';
import { SessionProvider } from '../../src/contexts/SessionContext';
import SessionScreen from '../../app/session/[roomName]';

jest.mock('../../src/services/storage', () => ({
  getAuthToken: jest.fn().mockResolvedValue({ token: 'tok', username: 'angel' }),
  getSettings: jest.fn().mockResolvedValue({ level: 'B1', topic: 'livre', voiceId: 'x' }),
  saveSettings: jest.fn().mockResolvedValue(undefined),
  saveSession: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/api', () => ({
  createSession: jest.fn().mockResolvedValue({ roomName: 'room-1', token: 'lk', livekitUrl: 'wss://x' }),
}));
jest.mock('../../src/services/livekit', () => ({
  connect: jest.fn().mockResolvedValue({ roomName: 'room-1', _timerId: null, _callbacks: [] }),
  onTranscript: jest.fn(),
  disconnect: jest.fn(),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ roomName: 'room-1' }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <SettingsProvider>
      <SessionProvider token="test-tok">{children}</SessionProvider>
    </SettingsProvider>
  </AuthProvider>
);

describe('SessionScreen', () => {
  it('renders the voice orb', () => {
    const { getByTestId } = render(<SessionScreen />, { wrapper });
    expect(getByTestId('voice-orb')).toBeTruthy();
  });

  it('renders Terminar sessão button', () => {
    const { getByText } = render(<SessionScreen />, { wrapper });
    expect(getByText('Terminar sessão')).toBeTruthy();
  });

  it('shows connecting status on mount', () => {
    const { getByText } = render(<SessionScreen />, { wrapper });
    expect(getByText(/conectando|connecting/i)).toBeTruthy();
  });
});
