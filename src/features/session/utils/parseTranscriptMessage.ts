import { parseCorrection } from './parseCorrection';

export interface IncomingTranscript {
  speaker: 'user' | 'tutor';
  text: string;
  correction?: string;
}

/**
 * Decode a LiveKit data-channel payload into a normalized transcript message.
 *
 * The Pipecat backend already splits each tutor reply into clean `text` plus a
 * separate `correction` field (see backend/bot.py `TranscriptPublisher`), so we
 * trust those fields directly. Re-parsing the already-clean `text` would find no
 * marker and silently drop the correction — that was the original bug.
 *
 * The `parseCorrection` fallback only runs when the `correction` field is absent
 * entirely (an older backend that never split), never when it is present as null.
 *
 * Returns null for non-transcript or malformed frames.
 */
export function parseTranscriptMessage(
  payload: Uint8Array,
): IncomingTranscript | null {
  let raw: {
    type?: string;
    speaker?: string;
    text?: string;
    correction?: string | null;
  };
  try {
    raw = JSON.parse(new TextDecoder().decode(payload));
  } catch {
    return null;
  }

  if (raw.type !== 'transcript' || !raw.text) return null;

  const speaker: 'user' | 'tutor' = raw.speaker === 'user' ? 'user' : 'tutor';

  // Backend included the structured field (string or null) → trust it.
  if (raw.correction !== undefined) {
    const correction =
      speaker === 'tutor' &&
      typeof raw.correction === 'string' &&
      raw.correction.trim()
        ? raw.correction
        : undefined;
    return { speaker, text: raw.text, correction };
  }

  // Defensive fallback: no correction field at all (legacy backend).
  if (speaker === 'tutor') {
    const parsed = parseCorrection(raw.text);
    return { speaker, text: parsed.text, correction: parsed.correction };
  }

  return { speaker, text: raw.text };
}
