/**
 * Extrae la expresión que rodea a una palabra tocada.
 *
 * Tocar palabra por palabra no sirve para los modismos, que es justo donde un
 * diccionario hace más falta: "está" por separado no explica "está-se bem".
 * Al mantener pulsada una palabra se consulta el giro entero que la contiene,
 * recortado por la puntuación, que es la que marca dónde acaba una idea.
 */

const MAX_WORDS = 5;
const MAX_CHARS = 60;

/** Puntuación que corta una expresión: lo de un lado no explica lo del otro. */
const BOUNDARY = /[.,;:!?¿¡()«»"“”…]/;

export function extractExpression(text: string, wordIndex: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (wordIndex < 0 || wordIndex >= words.length) return '';

  // Crece a un lado y a otro alternando, para que la palabra tocada quede
  // centrada y el alumno reconozca lo que pidió.
  let start = wordIndex;
  let end = wordIndex;
  let growLeft = true;

  while (end - start + 1 < MAX_WORDS) {
    const canLeft = start > 0 && !BOUNDARY.test(words[start - 1]);
    const canRight = end < words.length - 1 && !BOUNDARY.test(words[end]);
    if (!canLeft && !canRight) break;

    if (growLeft && canLeft) start--;
    else if (!growLeft && canRight) end++;
    else if (canLeft) start--;
    else end++;

    if (words.slice(start, end + 1).join(' ').length > MAX_CHARS) {
      // Deshace el último crecimiento: mejor corta que pasada de largo.
      if (growLeft && start < wordIndex) start++;
      else if (end > wordIndex) end--;
      break;
    }
    growLeft = !growLeft;
  }

  return words
    .slice(start, end + 1)
    .join(' ')
    .replace(/^[^\wáàâãéèêíïóôõúüçÁÀÂÃÉÈÊÍÏÓÔÕÚÜÇ]+/, '')
    .replace(/[^\wáàâãéèêíïóôõúüçÁÀÂÃÉÈÊÍÏÓÔÕÚÜÇ]+$/, '')
    .trim();
}
