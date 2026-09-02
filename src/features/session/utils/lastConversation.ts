/**
 * Qué contar de la última conversación en la pantalla de inicio.
 *
 * La tarjeta mostraba únicamente una frase entrecomillada, sacada del campo
 * `excerpt`. Dos problemas: una cita suelta no dice qué hiciste ni cuándo, y
 * durante un tiempo ese campo guardó el saludo del tutor, que es idéntico en
 * todas las conversaciones. El resultado era una tarjeta que repetía siempre lo
 * mismo.
 *
 * Ahora lo que manda son los datos que sí distinguen una conversación de otra
 * —cuándo, cuánto y de qué— porque están guardados desde el principio y son
 * fiables incluso en los registros antiguos. La cita queda como acompañamiento,
 * y sólo si aporta algo.
 */

export interface LastConversationSummary {
  /** "Ontem · 9 min · Conversa Livre" */
  headline: string;
  /** La frase del alumno, o null si no hay ninguna que merezca mostrarse. */
  quote: string | null;
}

/**
 * Saludos del tutor que quedaron guardados como resumen en versiones
 * anteriores. No se pueden reparar —no se conserva la conversación— así que se
 * reconocen para no mostrarlos.
 */
// Sin \b después de "olá": en JavaScript esa marca sólo reconoce el alfabeto
// ASCII, y con la tilde no hay frontera de palabra que detectar. Se exige en su
// lugar cualquier carácter que no sea letra, que es lo que de verdad separa el
// saludo de lo que viene detrás.
const TUTOR_GREETING = /^["'\s]*ol[áa][^\p{L}].*\b(bem-vindo|bem vindo|bom voltar|sou o teu tutor)\b/iu;

const MIN_USEFUL_LENGTH = 12;

export function isTutorGreeting(text: string): boolean {
  return TUTOR_GREETING.test(text.trim());
}

export function summariseLastConversation(
  session: {
    topic: string;
    startedAt: number;
    durationSeconds: number;
    excerpt: string;
  } | null,
  labels: Record<string, string>,
  formatDate: (ts: number) => string,
): LastConversationSummary | null {
  if (!session) return null;

  const when = formatDate(session.startedAt);
  const minutes = Math.max(1, Math.round(session.durationSeconds / 60));
  const topic = labels[session.topic] ?? session.topic;

  const excerpt = (session.excerpt ?? '').trim();
  const usable =
    excerpt.length >= MIN_USEFUL_LENGTH && !isTutorGreeting(excerpt);

  return {
    headline: `${when} · ${minutes} min · ${topic}`,
    quote: usable ? excerpt : null,
  };
}
