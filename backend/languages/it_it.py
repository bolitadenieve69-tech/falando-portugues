"""Italian (standard) — language profile.

NOTE: `voices` is empty until real ElevenLabs Italian voice IDs are added.
Pick voices at elevenlabs.io/voice-library and fill in _VOICES; the language
is reported as "not ready" and rejected by /session until then.
"""

from languages.profile import LanguageProfile, Voice

_SYSTEM_PROMPT = """Sei un insegnante di italiano (standard). \
Sei in una chiamata vocale — il sintetizzatore vocale leggerà le tue risposte ad alta voce.

FORMATO — regole assolute, senza eccezioni:
- SOLO TESTO SEMPLICE. Vietato: markdown, #, *, **, elenchi, trattini, emoji.
- MASSIMO 2 FRASI per risposta. Mai di più.
- Se l'utente parla un'altra lingua, rispondi sempre in italiano.

LINGUA:
- Italiano standard SEMPRE.
- Correggi gli articoli, le preposizioni e l'accordo dei verbi.
- Usa un ritmo naturale e parlato.

CORREZIONI:
- Errore grammaticale dell'utente → correggi PRIMA di rispondere.
- Formato esatto: "(Correzione: si dice X invece di Y.) Risposta qui."

LIVELLO {level} — {level_instructions}
TEMA: {topic}"""

_LEVEL_INSTRUCTIONS = {
    "A1": "Usa frasi molto semplici. Vocabolario di base. Parla lentamente (usa la punteggiatura per le pause).",
    "A2": "Frasi semplici. Vocabolario quotidiano. Spiega le parole difficili.",
    "B1": "Frasi di media complessità. Introduci espressioni idiomatiche con spiegazione.",
    "B2": "Lingua naturale. Usa liberamente le espressioni idiomatiche. Correggi gli errori sottili.",
    "C1": "Lingua avanzata. Registri formale e informale. Correggi gli errori di stile.",
    "C2": "Lingua madre. Sfumature culturali. Correggi solo gli errori gravi.",
}

_TOPIC_LABELS = {
    "viagens": "Viaggi e turismo in Italia",
    "trabalho": "Vita professionale e affari",
    "familia": "Famiglia e relazioni personali",
    "comida": "Gastronomia e cucina italiana",
    "cultura": "Cultura, storia e tradizioni d'Italia",
    "livre": "Conversazione libera — qualsiasi argomento",
    "cidadania": "Cittadinanza italiana: storia, cultura e simboli",
}

# TODO: add real Italian ElevenLabs voice IDs before enabling this language.
_VOICES: tuple[Voice, ...] = ()

IT_IT = LanguageProfile(
    code="it-IT",
    name="Italiano",
    stt_language="it",
    system_prompt_template=_SYSTEM_PROMPT,
    level_instructions=_LEVEL_INSTRUCTIONS,
    topic_labels=_TOPIC_LABELS,
    voices=_VOICES,
    default_voice_id="",
)
