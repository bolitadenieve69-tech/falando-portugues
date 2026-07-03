import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HistoryScreen from '../../app/(tabs)/history';
import * as storage from '../../src/services/storage';

jest.mock('../../src/services/storage');

describe('HistoryScreen', () => {
  it('shows empty state when no sessions', async () => {
    (storage.getSessions as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<HistoryScreen />);
    await waitFor(() => {
      expect(getByText(/Ainda não tens sessões/i)).toBeTruthy();
    });
  });

  it('shows session cards when sessions exist', async () => {
    (storage.getSessions as jest.Mock).mockResolvedValue([
      {
        id: '1',
        roomName: 'room-abc',
        level: 'B1',
        topic: 'viagens',
        startedAt: 1714000000,
        durationSeconds: 180,
        transcript: [],
      },
    ]);
    const { getByText } = render(<HistoryScreen />);
    await waitFor(() => {
      expect(getByText('B1')).toBeTruthy();
      expect(getByText(/viagens/i)).toBeTruthy();
    });
  });
});
