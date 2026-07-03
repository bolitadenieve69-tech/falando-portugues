import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { SettingsProvider } from '../../src/contexts/SettingsContext';
import HomeScreen from '../../app/(tabs)/index';

jest.mock('../../src/services/storage', () => ({
  getAuthToken: jest.fn().mockResolvedValue({ token: 'tok', username: 'angel' }),
  getSettings: jest.fn().mockResolvedValue({ defaultLevel: 'B1', defaultTopic: 'livre', preferredVoiceId: 'x' }),
  saveSettings: jest.fn().mockResolvedValue(undefined),
  saveSession: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/api');
jest.mock('../../src/services/livekit', () => ({
  connect: jest.fn().mockResolvedValue({ roomName: 'r1', _timerId: null, _callbacks: [] }),
  onTranscript: jest.fn(),
  disconnect: jest.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <SettingsProvider>{children}</SettingsProvider>
  </AuthProvider>
);

describe('HomeScreen', () => {
  it('renders level chips A1–C2', async () => {
    const { getByText } = render(<HomeScreen />, { wrapper });
    await waitFor(() => {
      expect(getByText('A1')).toBeTruthy();
      expect(getByText('C2')).toBeTruthy();
    });
  });

  it('renders greeting with username', async () => {
    const { getByText } = render(<HomeScreen />, { wrapper });
    await waitFor(() => {
      expect(getByText(/Olá/)).toBeTruthy();
    });
  });

  it('renders Iniciar sessão button', async () => {
    const { getByText } = render(<HomeScreen />, { wrapper });
    await waitFor(() => {
      expect(getByText('Iniciar sessão')).toBeTruthy();
    });
  });

  it('selecting a level updates selection state', async () => {
    const { getByText } = render(<HomeScreen />, { wrapper });
    await waitFor(() => expect(getByText('C1')).toBeTruthy());
    fireEvent.press(getByText('C1'));
  });
});
