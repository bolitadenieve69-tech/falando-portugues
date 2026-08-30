#!/usr/bin/env python3
"""Turn the raw latency log into the results table for the thesis.

Reads the JSONL written by utils.latency.LatencyProbe and reports, per stage,
the median and the 90th percentile against the budget declared in CONTEXT.md.

    python scripts/latency_report.py /data/latency.jsonl
    python scripts/latency_report.py /data/latency.jsonl --language fr-FR
    python scripts/latency_report.py /data/latency.jsonl --csv results.csv

Only the standard library, so it runs anywhere, including inside the container.
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import sys
from pathlib import Path

# Budget from CONTEXT.md, in milliseconds.
BUDGET = {
    "llm_ms": (500, "Transcripción -> primer token del LLM"),
    "tts_ms": (800, "Primer token -> primer audio"),
    "total_ms": (2500, "Latencia percibida total"),
}

# No es una etapa del presupuesto sino un hallazgo: la transcripción está lista
# antes de que el detector de voz declare el fin del habla, así que el
# reconocimiento no es una espera que el usuario perciba.
INFORMATIVE = {
    "asr_lead_ms": "Ventaja de la transcripción sobre el fin de habla",
}


def load(path: Path, language: str | None) -> list[dict]:
    if not path.exists():
        sys.exit(f"No existe el fichero de medidas: {path}")
    rows = []
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except json.JSONDecodeError:
            print(f"  aviso: línea {n} ilegible, se ignora", file=sys.stderr)
            continue
        if not r.get("complete"):
            continue
        if language and r.get("language") != language:
            continue
        rows.append(r)
    return rows


def pct(values: list[float], p: float) -> float:
    """Nearest-rank percentile. Honest on small samples, unlike interpolation."""
    s = sorted(values)
    k = max(0, min(len(s) - 1, int(round(p / 100 * len(s) + 0.5)) - 1))
    return s[k]


def summarise(rows: list[dict]) -> dict[str, dict]:
    out = {}
    for stage, (budget, label) in BUDGET.items():
        vals = [r[stage] for r in rows if r.get(stage) is not None]
        if not vals:
            continue
        med, p90 = statistics.median(vals), pct(vals, 90)
        out[stage] = {
            "label": label,
            "n": len(vals),
            "median": med,
            "p90": p90,
            "budget": budget,
            "within": med <= budget,
            "share_within": round(100 * sum(v <= budget for v in vals) / len(vals), 1),
        }
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("log", nargs="?", default="/data/latency.jsonl", type=Path)
    ap.add_argument("--language", help="filtrar por código de idioma, p. ej. pt-PT")
    ap.add_argument("--csv", type=Path, help="volcar la tabla a CSV")
    args = ap.parse_args()

    rows = load(args.log, args.language)
    if not rows:
        sys.exit("No hay turnos completos que analizar todavía.")

    langs = sorted({r.get("language", "?") for r in rows})
    sessions = len({r.get("room") for r in rows})
    print(f"\nTurnos completos: {len(rows)}   Sesiones: {sessions}   Idiomas: {', '.join(langs)}")
    print("=" * 78)
    print(f"{'ETAPA':<38}{'MEDIANA':>9}{'P90':>9}{'OBJETIVO':>10}{'CUMPLE':>10}")
    print("-" * 78)

    summary = summarise(rows)
    for stage in BUDGET:
        s = summary.get(stage)
        if not s:
            continue
        mark = "sí" if s["within"] else "NO"
        print(f"{s['label']:<38}{s['median']:>8.0f}ms{s['p90']:>8.0f}ms"
              f"{s['budget']:>9}ms{mark:>10}")
    print("-" * 78)

    lead = [r["asr_lead_ms"] for r in rows if r.get("asr_lead_ms") is not None]
    if lead:
        print(f"\n{INFORMATIVE['asr_lead_ms']}: mediana {statistics.median(lead):.0f} ms")
        print("(positivo = el reconocimiento de voz terminó antes; no es un cuello de botella)")

    total = summary.get("total_ms")
    if total:
        print(f"\n{total['share_within']}% de los turnos quedan dentro del presupuesto "
              f"de {total['budget']} ms.")
        if len(rows) < 15:
            print("Aviso: menos de 15 turnos. La muestra aún es pequeña para la memoria.")

    if args.csv:
        with args.csv.open("w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["etapa", "n", "mediana_ms", "p90_ms", "objetivo_ms", "pct_dentro"])
            for stage in BUDGET:
                s = summary.get(stage)
                if s:
                    w.writerow([s["label"], s["n"], round(s["median"]), round(s["p90"]),
                                s["budget"], s["share_within"]])
        print(f"\nTabla escrita en {args.csv}")


if __name__ == "__main__":
    main()
