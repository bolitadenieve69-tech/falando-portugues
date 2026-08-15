import { parseTranscriptMessage } from '../features/session/utils/parseTranscriptMessage';

function encode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj));
}

describe('parseTranscriptMessage', () => {
  it('keeps the backend correction on a tutor message (the original bug)', () => {
    // Backend sends CLEAN text + a separate correction field. Re-parsing the
    // clean text would drop the correction — this asserts we do not.
    const msg = parseTranscriptMessage(
      encode({
        type: 'transcript',
        speaker: 'tutor',
        text: 'Boa pergunta!',
        correction: 'diz-se fui em vez de fui a.',
      }),
    );
    expect(msg).toEqual({
      speaker: 'tutor',
      text: 'Boa pergunta!',
      correction: 'diz-se fui em vez de fui a.',
    });
  });

  it('treats correction:null as no correction', () => {
    const msg = parseTranscriptMessage(
      encode({ type: 'transcript', speaker: 'tutor', text: 'Olá!', correction: null }),
    );
    expect(msg).toEqual({ speaker: 'tutor', text: 'Olá!', correction: undefined });
  });

  it('preserves the raw text of a correction-only reply without a chip', () => {
    // Backend correction-only case: text is the raw marker, correction null.
    const msg = parseTranscriptMessage(
      encode({
        type: 'transcript',
        speaker: 'tutor',
        text: '(Correção: diz-se obrigado.)',
        correction: null,
      }),
    );
    expect(msg?.text).toBe('(Correção: diz-se obrigado.)');
    expect(msg?.correction).toBeUndefined();
  });

  it('maps user messages with no correction', () => {
    const msg = parseTranscriptMessage(
      encode({ type: 'transcript', speaker: 'user', text: 'olá mundo' }),
    );
    expect(msg).toEqual({ speaker: 'user', text: 'olá mundo' });
  });

  it('ignores a correction field on a user message', () => {
    const msg = parseTranscriptMessage(
      encode({ type: 'transcript', speaker: 'user', text: 'olá', correction: 'x' }),
    );
    expect(msg?.correction).toBeUndefined();
  });

  it('defaults an unknown speaker to tutor', () => {
    const msg = parseTranscriptMessage(
      encode({ type: 'transcript', text: 'Bom dia', correction: null }),
    );
    expect(msg?.speaker).toBe('tutor');
  });

  it('falls back to parsing when the correction field is absent (legacy backend)', () => {
    // Legacy path delegates to parseCorrection, whose contract is "(...). Reply".
    const msg = parseTranscriptMessage(
      encode({
        type: 'transcript',
        speaker: 'tutor',
        text: '(Correção: diz-se X em vez de Y). Certo!',
      }),
    );
    expect(msg).toEqual({
      speaker: 'tutor',
      text: 'Certo!',
      correction: 'diz-se X em vez de Y',
    });
  });

  it('ignores an empty-string correction', () => {
    const msg = parseTranscriptMessage(
      encode({ type: 'transcript', speaker: 'tutor', text: 'Olá', correction: '   ' }),
    );
    expect(msg?.correction).toBeUndefined();
  });

  it('returns null for a non-transcript frame', () => {
    expect(parseTranscriptMessage(encode({ type: 'other', text: 'x' }))).toBeNull();
  });

  it('returns null for an empty text frame', () => {
    expect(parseTranscriptMessage(encode({ type: 'transcript', speaker: 'tutor', text: '' }))).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseTranscriptMessage(new TextEncoder().encode('not json{{{'))).toBeNull();
  });
});
