"""Tests del informe de interrupciones (scripts/turn_report.py)."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from turn_report import analyse, format_report  # noqa: E402

_DELIVERED = "2026-08-31 14:08:08 | INFO | bot:process_frame:145 - [transcript] tutor: Olá!"
_DISCARDED = "2026-08-31 14:08:02 | WARNING | bot:process_frame:155 - [transcript] tutor response was empty"
_USER = "2026-08-31 14:08:06 | INFO | bot:process_frame:130 - [transcript] user: ovos e açúcar"


class TestAnalyse:
    def test_empty_log_reports_nothing(self):
        stats = analyse([])
        assert stats.attempted == 0
        assert stats.interruption_rate == 0.0

    def test_counts_delivered_and_discarded_separately(self):
        stats = analyse([_DELIVERED, _DISCARDED, _DELIVERED])
        assert stats.delivered == 2
        assert stats.discarded == 1
        assert stats.attempted == 3

    def test_ignores_the_learners_own_lines(self):
        stats = analyse([_USER, _USER, _DELIVERED])
        assert stats.delivered == 1
        assert stats.discarded == 0

    def test_rate_is_a_percentage_of_attempted_replies(self):
        # 1 descartada de 4 intentos → 25 %.
        stats = analyse([_DELIVERED] * 3 + [_DISCARDED])
        assert stats.interruption_rate == 25.0

    def test_a_discarded_line_is_never_counted_as_delivered(self):
        """Ambas marcas comparten el prefijo '[transcript] tutor'."""
        stats = analyse([_DISCARDED])
        assert stats.delivered == 0
        assert stats.discarded == 1


class TestReport:
    def test_says_so_when_there_is_nothing_to_report(self):
        assert "No hay respuestas" in format_report(analyse([]))

    def test_shows_the_rate(self):
        text = format_report(analyse([_DELIVERED] * 3 + [_DISCARDED]))
        assert "25.0%" in text
