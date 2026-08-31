/**
 * Elige la frase que representa una conversación en el historial.
 *
 * Antes se guardaba el primer mensaje del tutor, que es siempre el saludo. En
 * cuanto el saludo pasó a reconocer al alumno por su nombre, las conversaciones
 * empezaron todas igual y el historial se volvió una lista de tarjetas idénticas.
 *
 * Lo que distingue a una conversación de otra es de qué habló el alumno, así que
 * se guarda su primera frase con contenido: las cortas ("Olá", "sim", "certo")
 * no dicen nada y se descartan.
 */

export interface ExcerptEntry {
  speaker: 'user' | 'tutor';
  text: string;
}

/** Por debajo de esto una intervención es un saludo o un asentimiento. */
const MIN_MEANINGFUL_CHARS = 25;
const MAX_LENGTH = 120;

export function pickExcerpt(entries: ExcerptEntry[]): string {
  const userLines = entries
    .filter((e) => e.speaker === 'user')
    .map((e) => e.text.trim())
    .filter(Boolean);

  const substantial = userLines.find((t) => t.length >= MIN_MEANINGFUL_CHARS);
  if (substantial) return substantial.slice(0, MAX_LENGTH);

  // Nada suficientemente largo: la más larga de las que haya es lo mejor
  // disponible, y sigue siendo del alumno.
  if (userLines.length > 0) {
    const longest = userLines.reduce((a, b) => (b.length > a.length ? b : a));
    return longest.slice(0, MAX_LENGTH);
  }

  // El alumno no llegó a hablar. Entonces el turno del tutor es lo único que hay.
  const tutorLine = entries.find((e) => e.speaker === 'tutor')?.text.trim() ?? '';
  return tutorLine.slice(0, MAX_LENGTH);
}
