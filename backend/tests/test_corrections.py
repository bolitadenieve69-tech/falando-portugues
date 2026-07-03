"""Tests for utils.corrections.parse_correction."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.corrections import parse_correction


class TestParseCorrection:
    def test_correction_with_reply(self):
        correction, text = parse_correction(
            "(Correção: diz-se fui em vez de fui a.) Boa pergunta! Eu também gosto de viajar."
        )
        assert correction == "diz-se fui em vez de fui a."
        assert text == "Boa pergunta! Eu também gosto de viajar."

    def test_no_correction(self):
        correction, text = parse_correction("Olá! Como estás hoje?")
        assert correction is None
        assert text == "Olá! Como estás hoje?"

    def test_legacy_spelling_correccao(self):
        correction, text = parse_correction("(Correcção: usa-se o tu aqui.) Certo.")
        assert correction == "usa-se o tu aqui."
        assert text == "Certo."

    def test_case_insensitive_and_leading_whitespace(self):
        correction, text = parse_correction("  (correção: falta o acento em está.) Sim!")
        assert correction == "falta o acento em está."
        assert text == "Sim!"

    def test_correction_only_no_reply(self):
        correction, text = parse_correction("(Correção: diz-se obrigado.)")
        assert correction == "diz-se obrigado."
        assert text == ""

    def test_multiline_reply_preserved(self):
        correction, text = parse_correction("(Correção: X em vez de Y.) Primeira. Segunda frase.")
        assert correction == "X em vez de Y."
        assert text == "Primeira. Segunda frase."

    def test_parenthetical_mid_text_is_not_a_correction(self):
        correction, text = parse_correction("Sim (claro) — vamos falar de comida.")
        assert correction is None
        assert text == "Sim (claro) — vamos falar de comida."
