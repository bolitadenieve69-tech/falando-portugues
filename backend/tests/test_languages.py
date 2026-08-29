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
