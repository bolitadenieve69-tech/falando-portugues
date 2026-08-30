"""LanguageProfile — the per-language configuration that turns the tutor engine
into any target language. Each language is a configuration, not a fork."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Voice:
    """An ElevenLabs voice available for a language."""

    id: str
    name: str
    preview_text: str


@dataclass(frozen=True)
class LanguageProfile:
    """Everything the engine needs to tutor one language.

    Topic *keys* and CEFR level *keys* are intentionally shared across all
    languages so the mobile app and stored session records stay language-
    independent; only the human-facing labels and the prompt differ.
    """

    code: str  # BCP-47-ish tag, e.g. "pt-PT", "fr-FR"
    name: str  # display name, e.g. "Português (Portugal)"
    stt_language: str  # Deepgram language code, e.g. "pt", "fr", "it", "en"
    system_prompt_template: str  # uses {level}, {level_instructions}, {topic}
    level_instructions: dict[str, str]
    topic_labels: dict[str, str]
    # Optional, longer guidance appended to the prompt for topics that need
    # more than a label. Keeps topic_labels short enough for the UI.
    topic_briefs: dict[str, str] = field(default_factory=dict)
    voices: tuple[Voice, ...] = field(default_factory=tuple)
    default_voice_id: str = ""

    @property
    def ready(self) -> bool:
        """A language is usable only once it has at least one configured voice."""
        return bool(self.voices)

    def valid_topics(self) -> set[str]:
        return set(self.topic_labels)

    def valid_voice_ids(self) -> set[str]:
        return {v.id for v in self.voices}

    def voice(self, voice_id: str) -> Voice | None:
        return next((v for v in self.voices if v.id == voice_id), None)

    def learner_context(self, name: str | None, previous_sessions: int) -> str:
        """Tell the tutor who it is talking to.

        Without this the tutor opens every session asking the learner's name and
        where they are from, which it has already been told, and which makes the
        app feel like it has never met them.
        """
        if not name:
            return ""
        if previous_sessions > 0:
            return (
                f"\n\nALUNO: chama-se {name} e já teve {previous_sessions} "
                "conversas contigo. Cumprimenta-o pelo nome e diz que é bom voltar "
                "a falar com ele, depois entra logo no tema com uma pergunta. "
                "NUNCA lhe perguntes como se chama nem de onde é: já sabes."
            )
        return (
            f"\n\nALUNO: chama-se {name} e esta é a primeira conversa contigo. "
            "Dá-lhe as boas-vindas pelo nome, diz-lhe uma frase curta de "
            "encorajamento sobre começar a falar português, e faz-lhe logo uma "
            "pergunta simples. NUNCA lhe perguntes como se chama: já sabes."
        )

    def build_system_prompt(
        self,
        level: str,
        topic: str,
        learner_name: str | None = None,
        previous_sessions: int = 0,
    ) -> str:
        # Unknown level/topic fall back to shared defaults (B1 / livre exist in
        # every profile) so a bad client request degrades gracefully.
        level_instructions = self.level_instructions.get(
            level, self.level_instructions[DEFAULT_LEVEL]
        )
        topic_label = self.topic_labels.get(topic, self.topic_labels[DEFAULT_TOPIC])
        brief = self.topic_briefs.get(topic)
        if brief:
            topic_label = f"{topic_label}\n{brief}"
        prompt = self.system_prompt_template.format(
            level=level,
            topic=topic_label,
            level_instructions=level_instructions,
        )
        return prompt + self.learner_context(learner_name, previous_sessions)


# Shared fallback keys — present in every language profile.
DEFAULT_LEVEL = "B1"
DEFAULT_TOPIC = "livre"
