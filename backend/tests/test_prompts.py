"""Tests for prompts/tutor_pt.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from prompts.tutor_pt import build_system_prompt, LEVEL_INSTRUCTIONS, TOPIC_LABELS


class TestBuildSystemPrompt:
    def test_returns_string(self):
        result = build_system_prompt(level="B1", topic="livre")
        assert isinstance(result, str)

    def test_contains_level(self):
        result = build_system_prompt(level="A1", topic="livre")
        assert "A1" in result

    def test_contains_topic_label(self):
        result = build_system_prompt(level="B1", topic="viagens")
        assert TOPIC_LABELS["viagens"] in result

    def test_contains_level_instructions(self):
        result = build_system_prompt(level="C2", topic="livre")
        assert LEVEL_INSTRUCTIONS["C2"] in result

    def test_unknown_level_falls_back_to_b1(self):
        result = build_system_prompt(level="Z9", topic="livre")
        assert LEVEL_INSTRUCTIONS["B1"] in result

    def test_unknown_topic_falls_back_to_livre(self):
        result = build_system_prompt(level="B1", topic="desconhecido")
        assert TOPIC_LABELS["livre"] in result

    def test_all_levels_render(self):
        for level in ["A1", "A2", "B1", "B2", "C1", "C2"]:
            result = build_system_prompt(level=level, topic="livre")
            assert level in result

    def test_all_topics_render(self):
        for topic in TOPIC_LABELS:
            result = build_system_prompt(level="B1", topic=topic)
            assert TOPIC_LABELS[topic] in result

    def test_portugal_portuguese_instruction_present(self):
        result = build_system_prompt(level="B1", topic="livre")
        assert "Portugal" in result
