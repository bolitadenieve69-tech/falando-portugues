import {
  isTutorGreeting,
  summariseLastConversation,
} from '../features/session/utils/lastConversation';

const LABELS = { livre: 'Conversa Livre', comida: 'Gastronomia' };
const fecha = () => 'Ontem';

const sesion = (over: Partial<Parameters<typeof summariseLastConversation>[0]> = {}) => ({
  topic: 'livre',
  startedAt: 1_700_000_000_000,
  durationSeconds: 540,
  excerpt: 'Queria falar sobre a educação em Portugal',
  ...(over as object),
});

describe('isTutorGreeting', () => {
  it('reconoce los saludos guardados por versiones anteriores', () => {
    expect(isTutorGreeting('Olá Angel, é bom voltar a falar contigo!')).toBe(true);
    expect(isTutorGreeting('"Olá! Bem-vindo! Sou o teu tutor de português"')).toBe(true);
  });

  it('no confunde una frase del alumno que empiece por Olá', () => {
    expect(isTutorGreeting('Olá, queria falar sobre o Alentejo')).toBe(false);
  });
});

describe('summariseLastConversation', () => {
  it('encabeza con cuándo, cuánto y de qué', () => {
    const r = summariseLastConversation(sesion(), LABELS, fecha);
    expect(r?.headline).toBe('Ontem · 9 min · Conversa Livre');
  });

  it('acompaña con la frase del alumno cuando aporta algo', () => {
    const r = summariseLastConversation(sesion(), LABELS, fecha);
    expect(r?.quote).toContain('educação');
  });

  it('calla la cita si es un saludo del tutor de los registros viejos', () => {
    const r = summariseLastConversation(
      sesion({ excerpt: 'Olá Angel, é bom voltar a falar contigo! Como tens passado?' }),
      LABELS,
      fecha,
    );
    expect(r?.quote).toBeNull();
    // Pero el encabezado sigue diciendo algo útil.
    expect(r?.headline).toContain('9 min');
  });

  it('calla la cita si es demasiado corta para significar nada', () => {
    expect(summariseLastConversation(sesion({ excerpt: 'sim' }), LABELS, fecha)?.quote).toBeNull();
  });

  it('nunca muestra menos de un minuto, que se leería como cero', () => {
    const r = summariseLastConversation(sesion({ durationSeconds: 20 }), LABELS, fecha);
    expect(r?.headline).toContain('1 min');
  });

  it('usa la clave del tema si no hay etiqueta traducida', () => {
    const r = summariseLastConversation(sesion({ topic: 'cidadania' }), LABELS, fecha);
    expect(r?.headline).toContain('cidadania');
  });

  it('devuelve null si todavía no hay ninguna conversación', () => {
    expect(summariseLastConversation(null, LABELS, fecha)).toBeNull();
  });
});
