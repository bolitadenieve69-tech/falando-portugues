import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../../src/contexts/AuthContext';
import LoginScreen from '../../app/(auth)/login';

jest.mock('../../src/services/storage', () => ({
  getAuthToken: jest.fn().mockResolvedValue(null),
  saveAuthToken: jest.fn().mockResolvedValue(undefined),
  getOrCreateDeviceId: jest.fn().mockResolvedValue('dev-id'),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('LoginScreen', () => {
  it('renders password input', () => {
    const { getByPlaceholderText } = render(<LoginScreen />, { wrapper });
    expect(getByPlaceholderText('Palavra-passe')).toBeTruthy();
  });

  it('shows validation error for short password', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />, { wrapper });
    fireEvent.changeText(getByPlaceholderText('Palavra-passe'), 'ab');
    fireEvent.press(getByText('Entrar'));
    await waitFor(() => {
      expect(getByText(/mínimo 4 caracteres/i)).toBeTruthy();
    });
  });

  it('calls login on valid submission', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok', username: 'angel' }),
    });
    const { getByPlaceholderText, getByText } = render(<LoginScreen />, { wrapper });
    fireEvent.changeText(getByPlaceholderText('Palavra-passe'), 'pass1234');
    fireEvent.press(getByText('Entrar'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
