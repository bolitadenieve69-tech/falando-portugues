# Multi-language Roadmap

The first goal is to validate Portuguese. French, Italian, and English should reuse the same core architecture instead of becoming separate codebases too early.

## Product Strategy

Start as one engine with multiple tutor profiles.

Possible future packaging:

- One app with language selector.
- Separate branded apps per language.
- One app with paid language packs.

Do not choose the commercial packaging until the Portuguese beta proves that users actually complete useful voice sessions.

## What Should Become Configurable

Each language should be a configuration, not a fork.

### Tutor Profile

- Language name.
- Target dialect or region.
- STT language/provider settings.
- LLM system prompt.
- Level instructions.
- Topic labels.
- Correction rules.
- Voice IDs.
- Interface copy.

### Portuguese Example

- Language: Portuguese.
- Dialect: European Portuguese, Portugal.
- STT: Deepgram `pt`.
- TTS: ElevenLabs PT-PT voices.
- Tutor rule: never Brazilian Portuguese.

### French Example

- Language: French.
- Dialect: likely France French first.
- STT: French.
- TTS: native France French voice.
- Tutor rule: correct gender, articles, pronunciation-friendly phrasing, and common spoken contractions.

### Italian Example

- Language: Italian.
- Dialect: standard Italian first.
- STT: Italian.
- TTS: native Italian voice.
- Tutor rule: correct articles, prepositions, verb agreement, and natural spoken rhythm.

### English Example

- Language: English.
- Dialect decision required: American, British, or configurable.
- STT: English.
- TTS: matching native voice.
- Tutor rule: correct pronunciation-sensitive phrasing, tense use, articles, and natural conversation.

## Recommended Technical Steps

1. Keep Portuguese stable as the reference implementation.
2. Extract language/tutor configuration into a shared module.
3. Replace hard-coded Portuguese copy with localized strings.
4. Add a language selector only after Portuguese beta feedback is positive.
5. Add one second language first, not three at once.
6. Test STT and TTS quality per language with real speakers.
7. Only then decide whether to build separate commercial apps.

## Suggested Order

1. Portuguese private beta.
2. Portuguese bug fixing and latency tuning.
3. Extract tutor profile abstraction.
4. Add French as the first non-Portuguese pilot.
5. Add Italian.
6. Add English.
7. Decide commercial packaging.

## Risks

- STT quality varies by language and accent.
- A voice that sounds good in preview may feel unnatural in conversation.
- Correction style must be culturally appropriate.
- Multi-language settings can make onboarding confusing.
- Commercial scope can grow too early.

## Decision Gate

Do not begin commercial work until these are true:

- Portuguese beta users complete sessions without help.
- The tutor is perceived as useful, not just impressive.
- The app works on both iPhone and Android.
- The cost per session is roughly understood.
- At least one additional language prototype confirms the architecture generalizes.

