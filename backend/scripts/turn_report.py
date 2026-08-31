#!/usr/bin/env python3
"""Cuenta cuántas respuestas del tutor se descartan por una interrupción.

Cuando el sistema da por terminado el turno del alumno antes de tiempo, el tutor
empieza a responder, el alumno retoma la frase y esa respuesta a medias se tira.
En el registro queda como "tutor response was empty". Es la huella exacta de una
interrupción, y sirve para medir si el ajuste de la toma de turno funciona.

Uso:
    docker logs falando-portugues-backend-1 2>&1 | python scripts/turn_report.py
    python scripts/turn_report.py registro.txt
"""

from __future__ import annotations

import sys
from dataclasses import dataclass

_REPLY_MARK = "[transcript] tutor:"
_DISCARDED_MARK = "tutor response was empty"


@dataclass(frozen=True)
class TurnStats:
    """Respuestas entregadas y descartadas en un registro."""

    delivered: int
    discarded: int

    @property
    def attempted(self) -> int:
        return self.delivered + self.discarded

    @property
    def interruption_rate(self) -> float:
        """Porcentaje de respuestas que no llegaron al alumno."""
        if self.attempted == 0:
            return 0.0
        return round(self.discarded / self.attempted * 100, 1)


def analyse(lines) -> TurnStats:
    """Recorre las líneas del registro y cuenta las dos marcas."""
    delivered = discarded = 0
    for line in lines:
        if _DISCARDED_MARK in line:
            discarded += 1
        elif _REPLY_MARK in line:
            delivered += 1
    return TurnStats(delivered=delivered, discarded=discarded)


def format_report(stats: TurnStats) -> str:
    if stats.attempted == 0:
        return "No hay respuestas del tutor en este registro."
    return (
        f"Respuestas del tutor: {stats.attempted}\n"
        f"  entregadas : {stats.delivered}\n"
        f"  descartadas: {stats.discarded} por interrupción\n"
        f"\nTasa de interrupción: {stats.interruption_rate}%"
    )


def main() -> None:
    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8", errors="replace") as fh:
            stats = analyse(fh)
    else:
        stats = analyse(sys.stdin)
    print(format_report(stats))


if __name__ == "__main__":
    main()
