#!/usr/bin/env python3
"""Convierte la memoria montada a PDF con Chrome, para enviarla por correo.

Uso, desde la raíz del repositorio, después de montar_memoria.py:

    python3.12 docs/tfm/exportar_pdf.py
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import markdown

AQUI = Path(__file__).parent
ENTREGA = AQUI / "entrega"
FUENTE = ENTREGA / "memoria-falando-portugues.md"
HTML = ENTREGA / "memoria-falando-portugues.html"
PDF = ENTREGA / "memoria-falando-portugues.pdf"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

ESTILO = """
@page { size: A4; margin: 22mm 20mm; }
body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 11pt;
       line-height: 1.5; color: #1a1a1a; max-width: 100%; }
h1 { font-size: 22pt; margin: 0 0 6pt; page-break-before: always; }
body > h1:first-of-type { page-break-before: auto; font-size: 30pt; }
h2 { font-size: 15pt; margin: 22pt 0 6pt; color: #333; }
h3 { font-size: 12.5pt; margin: 16pt 0 4pt; }
p { margin: 0 0 9pt; text-align: justify; }
table { border-collapse: collapse; margin: 8pt 0 12pt; font-size: 10pt; width: 100%; }
th, td { border: 1px solid #bbb; padding: 4pt 7pt; text-align: left; vertical-align: top; }
th { background: #f0f0f0; }
code { font-family: Menlo, monospace; font-size: 9.5pt; background: #f4f4f4; padding: 0 3px; }
pre { background: #f4f4f4; padding: 8pt 10pt; font-size: 9.5pt; line-height: 1.4;
      white-space: pre-wrap; border-left: 3px solid #ccc; }
pre code { background: none; padding: 0; }
hr { border: 0; border-top: 1px solid #ccc; margin: 14pt 0; }
ul, ol { margin: 0 0 9pt; padding-left: 20pt; }
li { margin-bottom: 3pt; }
blockquote { margin: 0 0 9pt 12pt; color: #444; }
tr, pre, table { page-break-inside: avoid; }
h2, h3 { page-break-after: avoid; }
"""


def main() -> None:
    cuerpo = markdown.markdown(FUENTE.read_text(), extensions=["tables", "fenced_code"])
    HTML.write_text(
        f'<!doctype html><html lang="es"><head><meta charset="utf-8">'
        f"<title>Falando Português — Trabajo final</title><style>{ESTILO}</style></head>"
        f"<body>{cuerpo}</body></html>"
    )
    resultado = subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
         f"--print-to-pdf={PDF}", HTML.as_uri()],
        capture_output=True, text=True,
    )
    if resultado.returncode != 0 or not PDF.exists():
        print(resultado.stderr[-800:], file=sys.stderr)
        raise SystemExit("Chrome no generó el PDF")
    HTML.unlink()
    print(f"{PDF.relative_to(AQUI.parent.parent)}: {PDF.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
