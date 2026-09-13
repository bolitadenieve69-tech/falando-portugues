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
CONVERSACION = TOMAS / "Grabación de pantalla 2026-09-13 a las 9.36.25.mov"

# El teléfono (con su marco) ocupa este rectángulo dentro de la captura de
# pantalla completa. Recortarlo quita el escritorio y deja el teléfono llenando
# el cuadro. Se midió sobre un fotograma de la toma; si se regraba, medir otra vez.
RECORTE = "crop=736:1516:2020:207"

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
    #: Velocidad de reproducción. Por encima de 1 el plano se acelera y, si
    #: sigue sin llegar, se repite en ida y vuelta (bajar y volver a subir).
    ritmo: float = 1.0

    @property
    def duracion(self) -> float:
        return round(self.voz_hasta - self.voz_desde, 3)


#: Tarjeta muda con el icono y el nombre, antes de que empiece la voz.
PORTADA = Bloque("0-portada", 0.0, 6.0, TARJETAS / "portada.png", es_imagen=True)

BLOQUES = [
    # El primer recorrido por la portada va rápido y en ida y vuelta: a
    # velocidad normal se hacía largo.
    Bloque("1-que-es", 6.5, 58.0, TOMAS / "planos-portada.mp4", ritmo=1.5),
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
# Un solo trozo seguido: el saludo, tres preguntas con sus respuestas y, a
# continuación, las dos cosas que la voz anuncia: el alumno se queda callado
# cinco segundos y el tutor espera (76-84 s), y acto seguido corrige la frase
# en su recuadro (84-101 s). Los tiempos salen del registro del servidor.
# Empieza en 3,2 s, pasado el ruido de arrancar la grabación; el saludo suena
# en 4,7 s.
CONV_TROZOS = [(3.2, 102.5)]
#: Fundido de entrada del sonido de la conversación, para que no entre de golpe.
CONV_FUNDIDO_SECS = 0.6

# Durante la toma sonaron dos avisos del teléfono (72,1 s y 76,4 s) que resuenan
# unos segundos en dos notas fijas. Se quitan con dos rechazos muy estrechos,
# sólo en ese tramo, para no tocar la voz. Frecuencias medidas sobre la toma.
CONV_AVISOS = {"desde": 71.8, "hasta": 81.5, "notas_hz": (2114, 5796)}

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

    if bloque.ritmo != 1.0:
        ida_y_vuelta(bloque, destino, filtros)
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


def ida_y_vuelta(bloque: Bloque, destino: Path, filtros: str) -> None:
    """Acelera el plano y, si no llega, lo repite hacia atrás hasta cubrir la voz."""
    pasada = f"setpts=PTS/{bloque.ritmo},{filtros}"
    dura_pasada = (duracion(bloque.fuente) - bloque.desde) / bloque.ritmo
    if dura_pasada >= bloque.duracion:
        cadena = pasada
    else:
        cadena = f"{pasada},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0"
    corre([
        "ffmpeg", "-y", "-ss", str(bloque.desde), "-i", str(bloque.fuente),
        "-filter_complex", cadena, "-t", str(bloque.duracion),
        "-c:v", "h264_videotoolbox", "-b:v", "6M", "-pix_fmt", "yuv420p",
        "-an", str(destino),
    ])


def main() -> None:
    TRABAJO.mkdir(exist_ok=True)
    for viejo in TRABAJO.glob("*.mp4"):
        viejo.unlink()

    print("Cortando la imagen de cada bloque…")
    portada = TRABAJO / f"{PORTADA.nombre}.mp4"
    plano_de(PORTADA, portada)
    piezas: list[Path] = [portada]
    print(f"  {PORTADA.nombre}: {PORTADA.duracion:.1f}s")
    for bloque in sorted(BLOQUES, key=lambda b: b.voz_desde):
        destino = TRABAJO / f"{bloque.nombre}.mp4"
        plano_de(bloque, destino)
        piezas.append(destino)
        print(f"  {bloque.nombre}: {bloque.duracion:.1f}s")

        # La conversación en directo se intercala tras el bloque que la anuncia.
        if bloque.nombre == "3-presenta":
            for i, (desde, hasta) in enumerate(CONV_TROZOS, start=1):
                conv = TRABAJO / f"conversacion-{i}.mp4"
                # Los tiempos del filtro van relativos al trozo, no a la toma.
                tramo = (f"between(t,{CONV_AVISOS['desde'] - desde:.2f},"
                         f"{CONV_AVISOS['hasta'] - desde:.2f})")
                rechazos = ",".join(
                    f"equalizer=f={hz}:t=h:w=40:g=-40:enable='{tramo}'"
                    for hz in CONV_AVISOS["notas_hz"]
                )
                corre([
                    "ffmpeg", "-y", "-ss", str(desde), "-i", str(CONVERSACION),
                    "-t", str(hasta - desde),
                    "-vf", RECORTE + "," + TELEFONO,
                    "-af", f"pan=mono|c0=c0,{rechazos},loudnorm=I=-18:TP=-2,"
                           f"afade=t=in:d={CONV_FUNDIDO_SECS}",
                    "-c:v", "h264_videotoolbox", "-b:v", "6M", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "1",
                    str(conv),
                ])
                piezas.append(conv)
                print(f"  conversación {i}: {hasta - desde:.1f}s")

    print("Uniendo la imagen…")
    lista = TRABAJO / "piezas.txt"
    lista.write_text("".join(f"file '{p.name}'\n" for p in piezas))
    mudo = TRABAJO / "imagen.mp4"
    corre(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lista),
           "-c:v", "copy", "-an", str(mudo)])

    print("Pegando la voz…")
    # La voz y la imagen no comparten reloj: la conversación en directo ocupa
    # su propio tiempo en el vídeo y sólo el silencio que la anuncia en la voz.
    # Se corta la voz en dos y la conversación va entre medias con su sonido.
    corte_video = sum(
        b.duracion for b in sorted(BLOQUES, key=lambda b: b.voz_desde)
        if b.voz_desde < CONV_ANCLA
    )
    voz_a, voz_b = TRABAJO / "voz-a.m4a", TRABAJO / "voz-b.m4a"
    norma = "loudnorm=I=-18:TP=-2,aformat=sample_rates=48000:channel_layouts=mono"

    silencio = TRABAJO / "silencio.m4a"
    corre(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono",
           "-t", str(PORTADA.duracion), "-c:a", "aac", "-b:a", "192k", str(silencio)])
    corre(["ffmpeg", "-y", "-ss", "6.5", "-to", str(CONV_ANCLA),
           "-i", str(VOZ), "-af", norma, "-c:a", "aac", "-b:a", "192k", str(voz_a)])
    corre(["ffmpeg", "-y", "-ss", str(CONV_ANCLA + 5.0),
           "-i", str(VOZ), "-af", norma, "-c:a", "aac", "-b:a", "192k", str(voz_b)])
    nombres_conv = []
    for i in range(1, len(CONV_TROZOS) + 1):
        pista = TRABAJO / f"conv-{i}.m4a"
        corre(["ffmpeg", "-y", "-i", str(TRABAJO / f"conversacion-{i}.mp4"),
               "-vn", "-c:a", "aac", "-b:a", "192k", str(pista)])
        nombres_conv.append(pista.name)

    lista_audio = TRABAJO / "audio.txt"
    lista_audio.write_text("".join(
        f"file '{n}'\n" for n in ["silencio.m4a", "voz-a.m4a", *nombres_conv, "voz-b.m4a"]
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
