import { parseCorrection } from '../features/session/utils/parseCorrection';

describe('parseCorrection', () => {
  it('returns text unchanged when no correction present', () => {
    const result = parseCorrection('Boa tarde! Como posso ajudar?');
    expect(result).toEqual({ text: 'Boa tarde! Como posso ajudar?' });
    expect(result.correction).toBeUndefined();
  });

  it('extracts correction and cleans the text', () => {
    const result = parseCorrection(
      "(Correção: diz-se 'autocarro' em vez de 'ônibus'). Certo, vamos continuar!",
    );
    expect(result.correction).toBe("diz-se 'autocarro' em vez de 'ônibus'");
    expect(result.text).toBe('Certo, vamos continuar!');
  });

  it('handles variant spelling Correcão (without cedilla)', () => {
    const result = parseCorrection(
      "(Correcão: diz-se 'telemóvel' em vez de 'celular'). Muito bem!",
    );
    expect(result.correction).toBeDefined();
    expect(result.text).toBe('Muito bem!');
  });

  it('is case-insensitive for the keyword', () => {
    const result = parseCorrection("(CORREÇÃO: diz-se 'X' em vez de 'Y'). Ok.");
    expect(result.correction).toBeDefined();
  });

  it('returns full text when correction pattern is malformed', () => {
    const raw = 'Correção: algo mas sem parênteses';
    const result = parseCorrection(raw);
    expect(result.text).toBe(raw);
    expect(result.correction).toBeUndefined();
  });

  it('returns empty text when message is only a correction', () => {
    const result = parseCorrection("(Correção: diz-se 'X' em vez de 'Y'). ");
    expect(result.correction).toBeDefined();
    expect(result.text).toBe('');
  });
});
