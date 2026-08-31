import { extractExpression } from '../features/session/utils/expression';

describe('extractExpression', () => {
  it('devuelve la palabra sola cuando está aislada', () => {
    expect(extractExpression('fixe', 0)).toBe('fixe');
  });

  it('toma las palabras de alrededor para formar un giro', () => {
    const frase = 'Isso é mesmo fixe pá';
    const expr = extractExpression(frase, 3); // "fixe"
    expect(expr).toContain('fixe');
    expect(expr.split(' ').length).toBeGreaterThan(1);
  });

  it('no cruza la puntuación, que separa dos ideas', () => {
    const frase = 'Está-se bem, mas o tempo mudou';
    const expr = extractExpression(frase, 1); // "bem,"
    expect(expr).not.toContain('tempo');
  });

  it('no devuelve más de cinco palabras', () => {
    const frase = 'uma duas tres quatro cinco seis sete oito nove dez';
    expect(extractExpression(frase, 5).split(' ').length).toBeLessThanOrEqual(5);
  });

  it('respeta el límite que acepta el servidor', () => {
    const frase = Array.from({ length: 12 }, () => 'palavra').join(' ');
    expect(extractExpression(frase, 6).length).toBeLessThanOrEqual(60);
  });

  it('incluye siempre la palabra que se tocó', () => {
    const frase = 'o comboio chegou atrasado outra vez hoje';
    expect(extractExpression(frase, 3)).toContain('atrasado');
  });

  it('funciona en el primer y en el último lugar de la frase', () => {
    const frase = 'bom dia como estás';
    expect(extractExpression(frase, 0)).toContain('bom');
    expect(extractExpression(frase, 3)).toContain('estás');
  });

  it('devuelve vacío si el índice no existe', () => {
    expect(extractExpression('uma frase', 9)).toBe('');
    expect(extractExpression('uma frase', -1)).toBe('');
  });

  it('quita la puntuación de los extremos', () => {
    expect(extractExpression('bem!', 0)).toBe('bem');
  });
});
