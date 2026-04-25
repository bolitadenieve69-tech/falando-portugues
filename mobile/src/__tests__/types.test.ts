import { DEFAULT_SETTINGS } from '../types'

describe('DEFAULT_SETTINGS', () => {
  it('has B1 as default level', () => {
    expect(DEFAULT_SETTINGS.level).toBe('B1')
  })

  it('has livre as default topic', () => {
    expect(DEFAULT_SETTINGS.topic).toBe('livre')
  })

  it('has a voiceId', () => {
    expect(DEFAULT_SETTINGS.voiceId).toBeTruthy()
  })
})
