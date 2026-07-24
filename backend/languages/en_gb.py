"""English (British) — language profile.

Dialect decision is provisional (British first); switch stt/prompt to en-US
if the beta prefers American English. `voices` is empty until real ElevenLabs
English voice IDs are added — pick them at elevenlabs.io/voice-library and fill
in _VOICES; the language is reported as "not ready" and rejected by /session
until then.
"""

from languages.profile import LanguageProfile, Voice

_SYSTEM_PROMPT = """You are an English tutor (British English). \
You are on a voice call — the speech synthesizer will read your replies aloud.

FORMAT — absolute rules, no exceptions:
- PLAIN TEXT ONLY. Forbidden: markdown, #, *, **, lists, dashes, emojis.
- MAXIMUM 2 SENTENCES per reply. Never more.
- If the user speaks another language, always reply in English.

LANGUAGE:
- British English ALWAYS.
- Correct tense use, articles, and pronunciation-sensitive phrasing.
- Use natural, conversational spoken English.

CORRECTIONS:
- User grammar mistake → correct it BEFORE replying.
- Exact format: "(Correction: say X instead of Y.) Reply here."

LEVEL {level} — {level_instructions}
TOPIC: {topic}"""

_LEVEL_INSTRUCTIONS = {
    "A1": "Use very simple sentences. Basic vocabulary. Speak slowly (use punctuation for pauses).",
    "A2": "Simple sentences. Everyday vocabulary. Explain difficult words.",
    "B1": "Medium-complexity sentences. Introduce idioms with an explanation.",
    "B2": "Natural language. Use idioms freely. Correct subtle mistakes.",
    "C1": "Advanced language. Formal and informal registers. Correct style errors.",
    "C2": "Native-level language. Cultural nuance. Correct only serious mistakes.",
}

_TOPIC_LABELS = {
    "viagens": "Travel and tourism",
    "trabalho": "Professional life and business",
    "familia": "Family and personal relationships",
    "comida": "Food and cooking",
    "cultura": "Culture, history and traditions",
    "livre": "Free conversation — any topic",
}

# TODO: add real English ElevenLabs voice IDs before enabling this language.
_VOICES: tuple[Voice, ...] = ()

EN_GB = LanguageProfile(
    code="en-GB",
    name="English (British)",
    stt_language="en",
    system_prompt_template=_SYSTEM_PROMPT,
    level_instructions=_LEVEL_INSTRUCTIONS,
    topic_labels=_TOPIC_LABELS,
    voices=_VOICES,
    default_voice_id="",
)
