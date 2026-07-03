import { parseDataMessage } from '../livekit'

function encode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj))
}

describe('parseDataMessage', () => {
  it('parses a tutor message with correction', () => {
    const entry = parseDataMessage(
      encode({ type: 'transcript', speaker: 'tutor', text: 'Boa!', correction: 'diz-se X.' })
    )
    expect(entry).toMatchObject({
      speaker: 'tutor',
      text: 'Boa!',
      correction: 'diz-se X.',
      hasCorrection: true,
    })
    expect(entry?.id).toBeTruthy()
    expect(typeof entry?.timestamp).toBe('number')
  })

  it('parses a tutor message with null correction', () => {
    const entry = parseDataMessage(
      encode({ type: 'transcript', speaker: 'tutor', text: 'Olá!', correction: null })
    )
    expect(entry).toMatchObject({ text: 'Olá!', hasCorrection: false })
    expect(entry?.correction).toBeUndefined()
  })

  it('parses a user message without correction key', () => {
    const entry = parseDataMessage(encode({ type: 'transcript', speaker: 'user', text: 'Eu fui.' }))
    expect(entry).toMatchObject({ speaker: 'user', text: 'Eu fui.', hasCorrection: false })
  })

  it('returns null for non-transcript messages', () => {
    expect(parseDataMessage(encode({ type: 'ping' }))).toBeNull()
  })

  it('returns null for malformed payloads', () => {
    expect(parseDataMessage(new TextEncoder().encode('not json'))).toBeNull()
    expect(parseDataMessage(encode({ type: 'transcript', speaker: 'alien', text: 'x' }))).toBeNull()
    expect(parseDataMessage(encode({ type: 'transcript', speaker: 'user' }))).toBeNull()
  })
})
