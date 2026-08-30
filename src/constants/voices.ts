/**
 * The tutor voices, in one place.
 *
 * These were previously declared twice, as TUTOR_VOICES in the settings screen
 * and as a VOICE_NAMES map inside the session hook, while the home screen simply
 * hard-coded "Patrício". The default voice is Tiago, so the home screen
 * announced a tutor the session would not use.
 *
 * The ids must match the voices configured in backend/languages/pt_pt.py, which
 * is what /session validates against.
 */
export interface TutorVoice {
  id: string;
  name: string;
  city: string;
  style: string;
  voiceId: string;
}

export const TUTOR_VOICES: TutorVoice[] = [
  { id: 'tiago',    name: 'Tiago',    city: 'Lisboa', style: 'Conversacional',    voiceId: 'c0rzOw18hxEhaSybUod2' },
  { id: 'joana',    name: 'Joana',    city: 'Lisboa', style: 'Natural & Clara',   voiceId: 'nJ5NFqyKb8kn9JBPmo6i' },
  { id: 'patricio', name: 'Patrício', city: 'Porto',  style: 'Profunda & Calma',  voiceId: 'DMcOknq8n1B6XshFIJKJ' },
];

export const DEFAULT_TUTOR_NAME = 'Tutor';

/** Display name for a voice id, or a neutral fallback for an unknown one. */
export function voiceName(voiceId: string | undefined): string {
  return TUTOR_VOICES.find((v) => v.voiceId === voiceId)?.name ?? DEFAULT_TUTOR_NAME;
}
