/**
 * Extracts an inline correction from a tutor message.
 *
 * The tutor uses the format: "(Correção: diz-se 'X' em vez de 'Y'). Normal reply."
 * This function splits that into the correction text and the clean reply.
 */
const CORRECTION_RE = /^\(Corre[çc]ão:\s*([^)]+)\)\.\s*/i;

export function parseCorrection(raw: string): { text: string; correction?: string } {
  const match = raw.match(CORRECTION_RE);
  if (!match) return { text: raw };
  return { text: raw.slice(match[0].length).trim(), correction: match[1].trim() };
}
