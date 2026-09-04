#!/usr/bin/env python3
"""Monta el vídeo del trabajo final a partir de la voz y los planos.

La voz manda: se grabó de una sentada y marca la duración de cada bloque. La
imagen se corta o se alarga para encajar en ella, nunca al revés.

Uso, desde la raíz del repositorio:

    python3 docs/tfm/video/montar.py
"""

from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

AQUI = Path(__file__).parent
TOMAS = AQUI / "tomas"
TARJETAS = AQUI / "tarjetas"
TRABAJO = AQUI / "trabajo"
SALIDA = AQUI / "falando-portugues-demo.mp4"

VOZ = TOMAS / "voz.m4a.aifc"
CONVERSACION = TOMAS / "Grabación de pantalla 2026-09-04 a las 12.57.11.mov"

# El simulador ocupa este rectángulo dentro de la captura de pantalla completa.
# Recortarlo quita el escritorio y deja el teléfono llenando el cuadro.
RECORTE = "crop=780:1580:1975:245"

ANCHO, ALTO, FPS = 1920, 1080, 30

# Un plano vertical de teléfono sobre fondo oscuro, centrado y sin deformar.
TELEFONO = (
    f"scale=-2:{ALTO - 60},"
    f"pad={ANCHO}:{ALTO}:(ow-iw)/2:(oh-ih)/2:color=0x080c09,"
    f"fps={FPS},setsar=1"
)
TARJETA = f"scale={ANCHO}:{ALTO},fps={FPS},setsar=1"


@dataclass
class Bloque:
    """Un tramo de voz y la imagen que lo acompaña."""

    nombre: str
    voz_desde: float
    voz_hasta: float
    fuente: Path
    desde: float = 0.0
    es_imagen: bool = False
    recortar: bool = False
    #: Cuando el plano dura menos que la voz, se ralentiza para cubrirla.
    estirar: bool = True

    @property
    def duracion(self) -> float:
        return round(self.voz_hasta - self.voz_desde, 3)


BLOQUES = [
    Bloque("1-que-es", 6.5, 58.0, TOMAS / "planos-portada.mp4"),
    Bloque("2-nivel-tema-idioma", 58.0, 99.5, TOMAS / "planos-portada.mp4"),
    Bloque("3-presenta", 99.5, 126.0, TOMAS / "apoyo-arranque-app.mp4"),
    Bloque("5-arquitectura", 159.0, 216.0, TARJETAS / "arquitectura.png", es_imagen=True),
    Bloque("6-mediciones", 216.0, 272.0, TARJETAS / "mediciones.png", es_imagen=True),
    Bloque("7-intentos", 272.0, 326.0, TARJETAS / "intentos.png", es_imagen=True),
    Bloque("8-cierre", 326.0, 356.0, TOMAS / "planos-portada.mp4"),
]

# El bloque 4 (diccionario) usa los planos de la conversación, que es donde se
# ve tocar una palabra.
BLOQUES.insert(3, Bloque("4-diccionario", 131.0, 159.0, TOMAS / "planos-app.mp4", desde=60.0))

# La conversación en directo conserva su propio sonido: es la única parte del
# vídeo donde lo que importa es oír al tutor.
# La conversación entera, desde que Tiago saluda hasta que da con el nombre
# del mercado. Es el corazón del vídeo: recortarla deja la demostración coja.
CONV_DESDE, CONV_HASTA = 1.5, 179.0
#: Punto de la grabación de voz donde termina el bloque que la anuncia.
CONV_ANCLA = 126.0


def corre(cmd: list[str]) -> None:
    resultado = subprocess.run(cmd, capture_output=True, text=True)
    if resultado.returncode != 0:
        print("\n".join(resultado.stderr.strip().splitlines()[-12:]), file=sys.stderr)
        raise SystemExit(f"falló: {' '.join(cmd[:6])} ...")


def duracion(ruta: Path) -> float:
    salida = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(ruta)],
        capture_output=True, text=True,
    ).stdout.strip()
    return float(salida) if salida else 0.0


def plano_de(bloque: Bloque, destino: Path) -> None:
    """Genera el trozo de imagen muda que cubre un bloque de voz."""
    filtros = TARJETA if bloque.es_imagen else (
        (RECORTE + "," if bloque.recortar else "") + TELEFONO
    )

    if bloque.es_imagen:
        corre([
            "ffmpeg", "-y", "-loop", "1", "-i", str(bloque.fuente),
            "-t", str(bloque.duracion), "-vf", filtros,
            "-c:v", "h264_videotoolbox", "-b:v", "6M", "-pix_fmt", "yuv420p",
            "-an", str(destino),
        ])
        return

    disponible = duracion(bloque.fuente) - bloque.desde
    velocidad = 1.0
    if bloque.estirar and disponible > 0 and disponible < bloque.duracion:
        # Ralentiza lo justo para cubrir la voz sin que se note el tirón.
        velocidad = disponible / bloque.duracion

    cadena = filtros if velocidad == 1.0 else f"setpts={1/velocidad:.4f}*PTS,{filtros}"
    corre([
        "ffmpeg", "-y", "-ss", str(bloque.desde), "-i", str(bloque.fuente),
        "-t", str(bloque.duracion), "-vf", cadena,
        "-c:v", "h264_videotoolbox", "-b:v", "6M", "-pix_fmt", "yuv420p",
        "-an", str(destino),
    ])


def main() -> None:
    TRABAJO.mkdir(exist_ok=True)
    for viejo in TRABAJO.glob("*.mp4"):
        viejo.unlink()

    print("Cortando la imagen de cada bloque…")
    piezas: list[Path] = []
    for bloque in sorted(BLOQUES, key=lambda b: b.voz_desde):
        destino = TRABAJO / f"{bloque.nombre}.mp4"
        plano_de(bloque, destino)
        piezas.append(destino)
        print(f"  {bloque.nombre}: {bloque.duracion:.1f}s")

        # La conversación en directo se intercala tras el bloque que la anuncia.
        if bloque.nombre == "3-presenta":
            conv = TRABAJO / "conversacion.mp4"
            corre([
                "ffmpeg", "-y", "-ss", str(CONV_DESDE), "-i", str(CONVERSACION),
                "-t", str(CONV_HASTA - CONV_DESDE),
                "-vf", RECORTE + "," + TELEFONO,
                "-af", "pan=mono|c0=c0,loudnorm=I=-18:TP=-2",
                "-c:v", "h264_videotoolbox", "-b:v", "6M", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "1",
                str(conv),
            ])
            piezas.append(conv)
            print(f"  conversación en directo: {CONV_HASTA - CONV_DESDE:.1f}s")

    print("Uniendo la imagen…")
    lista = TRABAJO / "piezas.txt"
    lista.write_text("".join(f"file '{p.name}'\n" for p in piezas))
    mudo = TRABAJO / "imagen.mp4"
    corre(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lista),
           "-c:v", "copy", "-an", str(mudo)])

    print("Pegando la voz…")
    # La voz y la imagen no comparten reloj: la conversación en directo ocupa
    # 23 s de vídeo y sólo el silencio que la anuncia en la grabación de voz.
    # Se corta la voz en dos y la conversación va entre medias con su sonido.
    corte_video = sum(
        b.duracion for b in sorted(BLOQUES, key=lambda b: b.voz_desde)
        if b.voz_desde < CONV_ANCLA
    )
    voz_a, voz_b = TRABAJO / "voz-a.m4a", TRABAJO / "voz-b.m4a"
    conv_a = TRABAJO / "conv-a.m4a"
    norma = "loudnorm=I=-18:TP=-2,aformat=sample_rates=48000:channel_layouts=mono"

    corre(["ffmpeg", "-y", "-ss", "6.5", "-to", str(CONV_ANCLA),
           "-i", str(VOZ), "-af", norma, "-c:a", "aac", "-b:a", "192k", str(voz_a)])
    corre(["ffmpeg", "-y", "-ss", str(CONV_ANCLA + 5.0),
           "-i", str(VOZ), "-af", norma, "-c:a", "aac", "-b:a", "192k", str(voz_b)])
    corre(["ffmpeg", "-y", "-i", str(TRABAJO / "conversacion.mp4"),
           "-vn", "-c:a", "aac", "-b:a", "192k", str(conv_a)])

    lista_audio = TRABAJO / "audio.txt"
    lista_audio.write_text("".join(
        f"file '{n}'\n" for n in ("voz-a.m4a", "conv-a.m4a", "voz-b.m4a")
    ))
    banda = TRABAJO / "banda.m4a"
    corre(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lista_audio),
           "-c:a", "copy", str(banda)])

    corre([
        "ffmpeg", "-y", "-i", str(mudo), "-i", str(banda),
        "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy",
        "-shortest", "-movflags", "+faststart", str(SALIDA),
    ])

    print(f"\nListo: {SALIDA.relative_to(AQUI.parent.parent)} "
          f"({duracion(SALIDA):.0f}s, {SALIDA.stat().st_size / 1e6:.0f} MB)")


if __name__ == "__main__":
    main()
