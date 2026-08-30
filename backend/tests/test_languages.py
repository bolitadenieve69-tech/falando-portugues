"""Tests for the language registry and LanguageProfile."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from languages import (
    DEFAULT_LANGUAGE,
    LANGUAGES,
    get_language,
    list_languages,
)
from languages.profile import DEFAULT_LEVEL, DEFAULT_TOPIC

_ALL_CODES = ["pt-PT", "fr-FR", "it-IT", "en-GB"]


class TestRegistry:
    def test_all_languages_registered(self):
        assert set(LANGUAGES) == set(_ALL_CODES)

    def test_default_language_exists_and_ready(self):
        profile = get_language(DEFAULT_LANGUAGE)
        assert profile is not None
        assert profile.ready

    def test_get_unknown_language_returns_none(self):
        assert get_language("de-DE") is None

    def test_only_portuguese_is_ready(self):
        ready = [p.code for p in list_languages(ready_only=True)]
        assert ready == ["pt-PT"]

    def test_non_portuguese_not_ready(self):
        for code in ["fr-FR", "it-IT", "en-GB"]:
            assert get_language(code).ready is False


class TestSharedKeys:
    def test_topic_keys_identical_across_languages(self):
        pt_topics = get_language("pt-PT").valid_topics()
        for code in _ALL_CODES:
            assert get_language(code).valid_topics() == pt_topics

    def test_fallback_keys_present_in_every_language(self):
        for code in _ALL_CODES:
            profile = get_language(code)
            assert DEFAULT_LEVEL in profile.level_instructions
            assert DEFAULT_TOPIC in profile.topic_labels


class TestBuildSystemPrompt:
    def test_each_language_renders_prompt(self):
        for code in _ALL_CODES:
            prompt = get_language(code).build_system_prompt("B1", "viagens")
            assert isinstance(prompt, str) and len(prompt) > 0

    def test_unknown_level_falls_back(self):
        profile = get_language("fr-FR")
        prompt = profile.build_system_prompt("Z9", "livre")
        assert profile.level_instructions[DEFAULT_LEVEL] in prompt

    def test_unknown_topic_falls_back(self):
        profile = get_language("it-IT")
        prompt = profile.build_system_prompt("B1", "desconhecido")
        assert profile.topic_labels[DEFAULT_TOPIC] in prompt

    def test_stt_language_codes(self):
        assert get_language("pt-PT").stt_language == "pt"
        assert get_language("fr-FR").stt_language == "fr"
        assert get_language("it-IT").stt_language == "it"
        assert get_language("en-GB").stt_language == "en"


class TestVoices:
    def test_portuguese_voice_lookup(self):
        profile = get_language("pt-PT")
        voice = profile.voice("DMcOknq8n1B6XshFIJKJ")
        assert voice is not None and voice.name == "Patrício"

    def test_unknown_voice_returns_none(self):
        assert get_language("pt-PT").voice("does-not-exist") is None

    def test_default_voice_is_valid(self):
        profile = get_language("pt-PT")
        assert profile.default_voice_id in profile.valid_voice_ids()


class TestCitizenshipTopic:
    """Portugal's 2026 nationality law adds a civic-knowledge requirement (TNIC)."""

    def test_present_in_every_language(self):
        for code in _ALL_CODES:
            assert "cidadania" in get_language(code).topic_labels, code

    def test_portuguese_prompt_names_the_five_legal_domains(self):
        prompt = get_language("pt-PT").build_system_prompt("B1", "cidadania")
        for domain in ["história", "cultura", "símbolos", "organização política", "direitos e deveres"]:
            assert domain in prompt.lower(), domain

    def test_portuguese_prompt_forbids_inventing_facts(self):
        # Someone preparing a real exam must not be fed confident wrong answers.
        prompt = get_language("pt-PT").build_system_prompt("B1", "cidadania").lower()
        assert "nunca inventes" in prompt
        assert "fonte oficial" in prompt

    def test_prompt_covers_facts_that_go_stale(self):
        """A probe found the tutor naming a president who had left office, stated
        with the same confidence as the facts it got right. Refusing to invent is
        not enough: the model does not know its training data has aged."""
        prompt = get_language("pt-PT").build_system_prompt("B1", "cidadania").lower()
        assert "cargo" in prompt and "eleições" in prompt
        assert "desatualizado" in prompt

    def test_prompt_prescribes_an_answer_rather_than_silence(self):
        """Prohibitions alone made the model return an empty reply, which in a
        voice session is silence. It needs a sentence to say instead."""
        prompt = get_language("pt-PT").build_system_prompt("B1", "cidadania").lower()
        assert "nunca com silêncio" in prompt
        assert "confirma" in prompt

    def test_brief_only_applies_to_its_own_topic(self):
        prompt = get_language("pt-PT").build_system_prompt("B1", "comida")
        assert "cidadania" not in prompt.lower()

    def test_label_stays_short_enough_for_the_interface(self):
        for code in _ALL_CODES:
            assert len(get_language(code).topic_labels["cidadania"]) < 60, code


class TestLearnerContext:
    """The tutor is told who it is talking to, so it stops asking every session."""

    def test_returning_learner_is_greeted_by_name(self):
        prompt = get_language("pt-PT").build_system_prompt(
            "B1", "livre", learner_name="Angel", previous_sessions=12
        )
        assert "Angel" in prompt
        assert "12 conversas" in prompt

    def test_first_conversation_gets_encouragement(self):
        prompt = get_language("pt-PT").build_system_prompt(
            "B1", "livre", learner_name="Angel", previous_sessions=0
        )
        assert "primeira conversa" in prompt
        assert "encorajamento" in prompt

    def test_the_tutor_is_told_not_to_ask_again(self):
        for previous in (0, 5):
            prompt = get_language("pt-PT").build_system_prompt(
                "B1", "livre", learner_name="Angel", previous_sessions=previous
            )
            assert "NUNCA lhe perguntes como se chama" in prompt

    def test_no_name_means_no_learner_section(self):
        """An anonymous session must not gain an empty or broken greeting."""
        prompt = get_language("pt-PT").build_system_prompt("B1", "livre")
        assert "ALUNO:" not in prompt

    def test_the_rest_of_the_prompt_is_untouched(self):
        base = get_language("pt-PT").build_system_prompt("B1", "viagens")
        withname = get_language("pt-PT").build_system_prompt(
            "B1", "viagens", learner_name="Angel", previous_sessions=3
        )
        assert withname.startswith(base)


class TestGarbledTranscriptionGuard:
    """The tutor must not correct words the microphone got wrong.

    Observed live on 2026-08-30: the learner said "Alentejo", the speech
    recogniser wrote "1 entejo", and the tutor announced that the correct form
    was "um enterro" — a funeral. It then declined to continue on the grounds
    that a funeral was too personal a matter. One machine error became a false
    accusation against the learner and derailed the conversation.
    """

    def test_prompt_tells_the_tutor_the_transcript_may_be_wrong(self):
        prompt = get_language("pt-PT").build_system_prompt(level="B1", topic="livre")
        lowered = prompt.lower()
        assert "transcrição" in lowered
        # It must be told to ask rather than invent.
        assert "pergunta" in lowered

    def test_guard_present_at_every_level(self):
        profile = get_language("pt-PT")
        for level in ["A1", "A2", "B1", "B2", "C1", "C2"]:
            prompt = profile.build_system_prompt(level=level, topic="viagens")
            assert "transcrição" in prompt.lower(), level
