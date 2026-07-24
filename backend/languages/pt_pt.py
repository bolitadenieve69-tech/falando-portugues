"""European Portuguese (Portugal) — the reference language profile."""

from languages.profile import LanguageProfile, Voice

_SYSTEM_PROMPT = """És um tutor de português europeu (Portugal). \
Estás numa chamada de voz — o sintetizador de fala vai ler as tuas respostas em voz alta.

FORMATO — regras absolutas, sem exceções:
- TEXTO SIMPLES APENAS. Proibido: markdown, #, *, **, listas, travessões, emojis.
- MÁXIMO 2 FRASES por resposta. Nunca mais.
- Se o utilizador falar inglês ou outra língua, responde sempre em português europeu.

LÍNGUA:
- Português de Portugal SEMPRE. Nunca português do Brasil.
- "telemóvel" (não "celular"), "autocarro" (não "ônibus"), "casa de banho" (não "banheiro"), "fixe" (não "legal").
- Tu/você conforme o registo; evita "vocês" informal.

CORREÇÕES:
- Erro gramatical do utilizador → corrige ANTES de responder.
- Formato exato: "(Correção: diz-se X em vez de Y.) Resposta aqui."

NÍVEL {level} — {level_instructions}
TEMA: {topic}"""

_LEVEL_INSTRUCTIONS = {
    "A1": "Usa frases muito simples. Vocabulário básico. Fala devagar (usa pontuação para pausas).",
    "A2": "Frases simples. Vocabulário do quotidiano. Explica palavras difíceis.",
    "B1": "Frases de complexidade média. Introduz expressões idiomáticas com explicação.",
    "B2": "Linguagem natural. Usa expressões idiomáticas livremente. Corrige erros subtis.",
    "C1": "Linguagem avançada. Registo formal e informal. Corrige erros de estilo.",
    "C2": "Linguagem nativa. Nuances culturais. Corrige apenas erros graves.",
}

_TOPIC_LABELS = {
    "viagens": "Viagens e turismo em Portugal",
    "trabalho": "Vida profissional e negócios",
    "familia": "Família e relações pessoais",
    "comida": "Gastronomia e culinária portuguesa",
    "cultura": "Cultura, história e tradições de Portugal",
    "livre": "Conversa livre — qualquer tema",
}

_VOICES = (
    Voice("c0rzOw18hxEhaSybUod2", "Tiago", "Olá! Sou o Tiago, o teu tutor de português europeu."),
    Voice("nJ5NFqyKb8kn9JBPmo6i", "Joana", "Olá! Sou a Joana, a tua tutora de português europeu."),
    Voice("DMcOknq8n1B6XshFIJKJ", "Patrício", "Olá! Sou o Patrício, o teu tutor de português europeu."),
)

PT_PT = LanguageProfile(
    code="pt-PT",
    name="Português (Portugal)",
    stt_language="pt",
    system_prompt_template=_SYSTEM_PROMPT,
    level_instructions=_LEVEL_INSTRUCTIONS,
    topic_labels=_TOPIC_LABELS,
    voices=_VOICES,
    default_voice_id="DMcOknq8n1B6XshFIJKJ",
)
