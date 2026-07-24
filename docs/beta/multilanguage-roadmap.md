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
3. Extract tutor profile abstraction. ✅ Done — see below.
4. Add French as the first non-Portuguese pilot.
5. Add Italian.
6. Add English.
7. Decide commercial packaging.

## Current Implementation (tutor profile abstraction)

The abstraction is in place. Each language is a `LanguageProfile` living in
`backend/languages/`, and the engine (`bot.py`, `main.py`) is language-agnostic.

- `languages/profile.py` — the `LanguageProfile` / `Voice` dataclasses.
- `languages/pt_pt.py`, `fr_fr.py`, `it_it.py`, `en_gb.py` — one profile per language.
- `languages/__init__.py` — the registry (`get_language`, `list_languages`).
- `GET /languages` — the app fetches the catalog (codes, labels, topics, voices,
  and a `ready` flag) from here; nothing is hard-coded in the app.

Topic keys (`viagens`, `trabalho`, …) and CEFR level keys (`A1`–`C2`) are shared
across every language on purpose, so stored session records and the app stay
language-independent. Only the human-facing labels and the prompt differ.

Portuguese is the only `ready` language. French, Italian, and English profiles
exist with complete prompts, level instructions, topics, and STT codes, but their
`voices` tuples are empty — `/session` rejects a language until it has at least one
voice. This proves the architecture generalizes (roadmap decision gate #5) without
shipping a half-configured language.

### How to enable a new language

1. Open the language's profile in `backend/languages/` (create one by copying
   `pt_pt.py` if it does not exist).
2. Pick voices in the ElevenLabs voice library for that language/dialect and add
   them to the `_VOICES` tuple (id, display name, preview sentence). Set
   `default_voice_id`.
3. If the language is new, register it in `languages/__init__.py` (`_PROFILES`).
4. Verify the correction marker word is covered by the parsers in
   `backend/utils/corrections.py` and `src/features/session/utils/parseCorrection.ts`.
5. Test STT + TTS quality with a real speaker before inviting testers.

The mobile client already accepts an optional `language` in `createSession` and can
list languages via `fetchLanguages()`; add the in-app language selector only after
the Portuguese beta feedback is positive (see step 4 of the technical steps).

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

