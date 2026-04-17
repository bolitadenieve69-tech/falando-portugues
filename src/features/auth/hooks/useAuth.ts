import { useCallback, useEffect, useState } from 'react';
import {
  clearAuthData,
  loadAuthData,
  loginDevice,
  registerDevice,
  saveAuthData,
} from '../services/authService';

interface AuthState {
  token: string | null;
  username: string | null;
  isLoading: boolean;
  error: string | null;
}

const INITIAL: AuthState = { token: null, username: null, isLoading: true, error: null };

export function useAuth() {
  const [state, setState] = useState<AuthState>(INITIAL);

  useEffect(() => {
    loadAuthData()
      .then((data) =>
        setState(
          data
            ? { token: data.token, username: data.username, isLoading: false, error: null }
            : { token: null, username: null, isLoading: false, error: null },
        ),
      )
      .catch(() =>
        setState({ token: null, username: null, isLoading: false, error: null }),
      );
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const { token, username: name } = await registerDevice(username, password);
      await saveAuthData(token, name);
      setState({ token, username: name, isLoading: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      }));
    }
  }, []);

  const login = useCallback(async (password: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const { token, username } = await loginDevice(password);
      await saveAuthData(token, username);
      setState({ token, username, isLoading: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    await clearAuthData();
    setState({ token: null, username: null, isLoading: false, error: null });
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    token: state.token,
    username: state.username,
    isAuthenticated: state.token !== null,
    isLoading: state.isLoading,
    error: state.error,
    register,
    login,
    logout,
    clearError,
  };
}
