#!/usr/bin/env python3
"""Monta la memoria del trabajo final a partir de los cinco apartados sueltos.

Los apartados se escriben y se revisan por separado, pero Racks pide un único
documento. En vez de mantener a mano una copia pegada —que se queda desfasada a
la primera corrección— se genera cada vez desde las fuentes.

Uso, desde la raíz del repositorio:

    python3 docs/tfm/montar_memoria.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AQUI = Path(__file__).parent
SALIDA = AQUI / "entrega" / "memoria-falando-portugues.md"

APARTADOS = [
    "apartado-1-problema.md",
    "apartado-2-solucion.md",
    "apartado-3-implementacion.md",
    "apartado-4-competencias.md",
    "apartado-5-conclusiones.md",
]

PORTADA = """# Falando Português

## Trabajo Final — Especialista en Inteligencia Artificial

**Autor:** Ángel Guerra Iglesias

**Racks Academy** · Septiembre de 2026

---

Aplicación móvil para practicar portugués europeo hablado con un tutor de inteligencia
artificial, en tiempo real y a cualquier hora.

**Código fuente:** <https://github.com/bolitadenieve69-tech/falando-portugues>. Aplicación
React Native con un servidor Python que orquesta un flujo de voz en tiempo real. Se detalla en
los apartados 2 y 3, y cuenta con 318 pruebas automáticas. Los datos en bruto de las
mediciones y los scripts que los procesan están en el propio repositorio.

**Vídeo demostrativo:** se adjunta con esta memoria.

---

## Índice

1. Identificación del problema u oportunidad
2. Diseño de la solución con IA
3. Implementación y validación
4. Vinculación con competencias adquiridas
5. Conclusiones y proyección futura
"""

# Los avisos en cita al principio de un apartado son notas de trabajo para el
# autor, no texto de la memoria.
NOTA_DE_TRABAJO = re.compile(r"^> Borrador\..*?(?=\n\n[^>])", re.S | re.M)


def montar() -> str:
    trozos = [PORTADA.strip()]
    for nombre in APARTADOS:
        ruta = AQUI / nombre
        if not ruta.exists():
            raise SystemExit(f"Falta {ruta}: la memoria estaría incompleta.")
        texto = NOTA_DE_TRABAJO.sub("", ruta.read_text()).strip()
        trozos.append(texto)
    return "\n\n---\n\n".join(trozos) + "\n"


def main() -> None:
    memoria = montar()
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(memoria)
    print(f"{SALIDA.relative_to(AQUI.parent.parent)}: {len(memoria.split())} palabras")


if __name__ == "__main__":
    sys.exit(main())
