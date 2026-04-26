import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react-native'
import { SettingsProvider, useSettings } from '../SettingsContext'
import * as storage from '../../services/storage'
import { DEFAULT_SETTINGS } from '../../types'

jest.mock('../../services/storage')
const mockStorage = storage as jest.Mocked<typeof storage>

function wrapper({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  mockStorage.getSettings.mockResolvedValue(DEFAULT_SETTINGS)
  mockStorage.saveSettings.mockResolvedValue(undefined)
})

describe('SettingsProvider', () => {
  it('initializes with default settings', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    await waitFor(() => expect(result.current.settings.level).toBe('B1'))
  })

  it('updateSetting changes the value immutably and persists', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    await waitFor(() => expect(result.current.settings.level).toBe('B1'))

    await act(async () => {
      await result.current.updateSetting('level', 'C2')
    })

    expect(result.current.settings.level).toBe('C2')
    expect(mockStorage.saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'C2' })
    )
  })

  it('throws outside provider', () => {
    expect(() => renderHook(() => useSettings())).toThrow()
  })
})
