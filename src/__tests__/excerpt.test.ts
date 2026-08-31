import { pickExcerpt } from '../features/session/utils/excerpt';

const tutor = (text: string) => ({ speaker: 'tutor' as const, text });
const user = (text: string) => ({ speaker: 'user' as const, text });

const SAUDACAO = 'Olá Angel, é bom voltar a falar contigo! Como tens passado?';

describe('pickExcerpt', () => {
  it('no usa el saludo del tutor, que es igual en todas las conversaciones', () => {
    const excerpt = pickExcerpt([
      tutor(SAUDACAO),
      user('Hoje gostaria de falar sobre as viagens pelo interior'),
    ]);
    expect(excerpt).not.toContain('bom voltar a falar');
    expect(excerpt).toContain('viagens');
  });

  it('salta los saludos y asentimientos del alumno', () => {
    const excerpt = pickExcerpt([
      tutor(SAUDACAO),
      user('Olá'),
      user('sim'),
      user('Queria falar sobre a educação em Portugal e na Europa'),
    ]);
    expect(excerpt).toContain('educação');
  });

  it('dos conversaciones distintas producen resúmenes distintos', () => {
    const a = pickExcerpt([tutor(SAUDACAO), user('Queria falar sobre a gastronomia alentejana')]);
    const b = pickExcerpt([tutor(SAUDACAO), user('Queria falar sobre o custo das universidades')]);
    expect(a).not.toBe(b);
  });

  it('si todo es corto, se queda con la intervención más larga del alumno', () => {
    const excerpt = pickExcerpt([tutor(SAUDACAO), user('sim'), user('claro que sim')]);
    expect(excerpt).toBe('claro que sim');
  });

  it('recurre al tutor sólo si el alumno no llegó a hablar', () => {
    expect(pickExcerpt([tutor(SAUDACAO)])).toContain('Olá Angel');
  });

  it('devuelve vacío si no hay nada', () => {
    expect(pickExcerpt([])).toBe('');
  });

  it('recorta a 120 caracteres', () => {
    const largo = 'a'.repeat(300);
    expect(pickExcerpt([user(largo)]).length).toBe(120);
  });
});
