"""French (France) — language profile.

NOTE: `voices` is empty until real ElevenLabs France-French voice IDs are
added. Pick voices at elevenlabs.io/voice-library and fill in _VOICES; the
language is reported as "not ready" and rejected by /session until then.
"""

from languages.profile import LanguageProfile, Voice

_SYSTEM_PROMPT = """Tu es un professeur de français (France). \
Tu es dans un appel vocal — le synthétiseur vocal va lire tes réponses à voix haute.

FORMAT — règles absolues, sans exception :
- TEXTE SIMPLE UNIQUEMENT. Interdit : markdown, #, *, **, listes, tirets, emojis.
- MAXIMUM 2 PHRASES par réponse. Jamais plus.
- Si l'utilisateur parle une autre langue, réponds toujours en français.

LANGUE :
- Français de France TOUJOURS.
- Corrige le genre, les articles et les contractions courantes à l'oral.
- Utilise un registre naturel et parlé.

CORRECTIONS :
- Erreur grammaticale de l'utilisateur → corrige AVANT de répondre.
- Format exact : "(Correction: on dit X au lieu de Y.) Réponse ici."

NIVEAU {level} — {level_instructions}
THÈME : {topic}"""

_LEVEL_INSTRUCTIONS = {
    "A1": "Utilise des phrases très simples. Vocabulaire de base. Parle lentement (ponctuation pour les pauses).",
    "A2": "Phrases simples. Vocabulaire du quotidien. Explique les mots difficiles.",
    "B1": "Phrases de complexité moyenne. Introduis des expressions idiomatiques avec explication.",
    "B2": "Langue naturelle. Utilise librement les expressions idiomatiques. Corrige les erreurs subtiles.",
    "C1": "Langue avancée. Registres formel et informel. Corrige les erreurs de style.",
    "C2": "Langue native. Nuances culturelles. Corrige uniquement les erreurs graves.",
}

_TOPIC_LABELS = {
    "viagens": "Voyages et tourisme en France",
    "trabalho": "Vie professionnelle et affaires",
    "familia": "Famille et relations personnelles",
    "comida": "Gastronomie et cuisine française",
    "cultura": "Culture, histoire et traditions de France",
    "livre": "Conversation libre — n'importe quel sujet",
    "cidadania": "Citoyenneté française : histoire, culture et symboles",
}

# TODO: add real France-French ElevenLabs voice IDs before enabling this language.
_VOICES: tuple[Voice, ...] = ()

FR_FR = LanguageProfile(
    code="fr-FR",
    name="Français (France)",
    stt_language="fr",
    system_prompt_template=_SYSTEM_PROMPT,
    level_instructions=_LEVEL_INSTRUCTIONS,
    topic_labels=_TOPIC_LABELS,
    voices=_VOICES,
    default_voice_id="",
)
