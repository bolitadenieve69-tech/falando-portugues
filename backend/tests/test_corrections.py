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

    def test_nested_parentheses_inside_correction(self):
        correction, text = parse_correction("(Correção: usa X (não Y).) Resposta.")
        assert correction == "usa X (não Y)."
        assert text == "Resposta."

    def test_unclosed_marker_falls_through(self):
        correction, text = parse_correction("(Correção: sem fecho")
        assert correction is None
        assert text == "(Correção: sem fecho"

    def test_french_correction_marker(self):
        correction, text = parse_correction("(Correction: on dit X au lieu de Y.) Réponse.")
        assert correction == "on dit X au lieu de Y."
        assert text == "Réponse."

    def test_italian_correction_marker(self):
        correction, text = parse_correction("(Correzione: si dice X invece di Y.) Risposta.")
        assert correction == "si dice X invece di Y."
        assert text == "Risposta."

    def test_english_correction_marker(self):
        correction, text = parse_correction("(Correction: say X instead of Y.) Reply here.")
        assert correction == "say X instead of Y."
        assert text == "Reply here."


class TestBareMarker:
    """The model drops the parentheses in practice; these come from real sessions."""

    def test_splits_at_the_sentence_end(self):
        correction, text = parse_correction(
            'Correção: diz-se "tenho uma tarefa" em vez do que escreveste. Ótimo objetivo, Angel!'
        )
        assert correction == 'diz-se "tenho uma tarefa" em vez do que escreveste.'
        assert text == "Ótimo objetivo, Angel!"

    def test_question_mark_inside_quotes_is_not_the_end(self):
        correction, text = parse_correction(
            'Correção: diz-se "Podes repetir?" em vez de "No Vivem, podes repetir?". '
            "Claro, repito o que precisares!"
        )
        assert correction.endswith('podes repetir?".')
        assert text == "Claro, repito o que precisares!"

    def test_correction_only_leaves_no_reply(self):
        correction, text = parse_correction("Correção: diz-se obrigado.")
        assert correction == "diz-se obrigado."
        assert text == ""

    def test_several_quoted_pairs(self):
        correction, text = parse_correction(
            'Correção: diz-se "quando estudo" em vez de "na hora de estudar", '
            '"semelhança" em vez de "similitude". Entendo perfeitamente!'
        )
        assert text == "Entendo perfeitamente!"
        assert "similitude" in correction

    def test_marker_mid_sentence_is_not_a_correction(self):
        correction, text = parse_correction("Fiz uma correção: estava errado.")
        assert correction is None
        assert text == "Fiz uma correção: estava errado."

    def test_other_languages_without_parentheses(self):
        for raw, tail in [
            ("Correction: on dit X au lieu de Y. Réponse ici.", "Réponse ici."),
            ("Correzione: si dice X invece di Y. Risposta qui.", "Risposta qui."),
            ("Correction: say X instead of Y. Reply here.", "Reply here."),
        ]:
            correction, text = parse_correction(raw)
            assert correction is not None, raw
            assert text == tail

    def test_parenthesised_form_still_wins(self):
        correction, text = parse_correction("(Correção: diz-se X.) Resposta.")
        assert correction == "diz-se X."
        assert text == "Resposta."
