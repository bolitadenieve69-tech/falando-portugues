#!/usr/bin/env python3
"""Dibuja las tarjetas del vídeo que no tienen imagen de aplicación.

Los bloques de arquitectura, mediciones y depuración no se pueden ilustrar con
la app: hablan de lo que hay por debajo. Se dibujan aquí a 1920x1080, con la
misma paleta que la aplicación para que el vídeo no parezca dos cosas pegadas.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

AQUI = Path(__file__).parent
W, H = 1920, 1080

FONDO = (8, 12, 9)
ORO = (241, 170, 79)
TEXTO = (232, 228, 220)
TENUE = (125, 133, 121)
BIEN = (76, 175, 125)
MAL = (213, 52, 47)

_FUENTES = [
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]
_MONO = [
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Supplemental/Courier New.ttf",
]


def fuente(tam: int, mono: bool = False, negrita: bool = False):
    for ruta in (_MONO if mono else _FUENTES):
        if Path(ruta).exists():
            try:
                return ImageFont.truetype(ruta, tam, index=1 if negrita else 0)
            except Exception:
                return ImageFont.truetype(ruta, tam)
    return ImageFont.load_default()


def lienzo():
    img = Image.new("RGB", (W, H), FONDO)
    return img, ImageDraw.Draw(img)


def centrado(d, y, texto, f, color):
    ancho = d.textlength(texto, font=f)
    d.text(((W - ancho) / 2, y), texto, font=f, fill=color)
    return ancho


def titulo(d, texto):
    centrado(d, 90, texto.upper(), fuente(40, negrita=True), TENUE)


# ── Portada ──────────────────────────────────────────────────────────────────

ICONO = AQUI.parent.parent.parent.parent / "assets" / "icon.png"


def portada():
    """Icono y nombre de la aplicación, y quién la presenta."""
    img, d = lienzo()

    icono = Image.open(ICONO).convert("RGBA").resize((300, 300), Image.LANCZOS)
    mascara = Image.new("L", icono.size, 0)
    ImageDraw.Draw(mascara).rounded_rectangle([0, 0, 299, 299], radius=66, fill=255)
    img.paste(icono, ((W - 300) // 2, 150), mascara)

    centrado(d, 500, "Falando Português", fuente(88, negrita=True), TEXTO)
    centrado(d, 618, "Práctica oral de portugués europeo con un tutor de IA en tiempo real",
             fuente(32), TENUE)

    centrado(d, 760, "Trabajo final · Especialista en Inteligencia Artificial · Racks Academy",
             fuente(26), TENUE)
    centrado(d, 806, "Ángel Guerra Iglesias · septiembre de 2026", fuente(26), ORO)

    f_nota = fuente(21)
    centrado(d, 950, "«Falando Português» es el nombre de la versión portuguesa. Si la plataforma "
             "pasa a ser multilingüe, tendrá un nombre propio", f_nota, TENUE)
    centrado(d, 984, "y cada idioma el suyo: Falando Português · Parlant Français · "
             "Parlando Italiano · Speaking English.", f_nota, TENUE)
    img.save(AQUI / "portada.png")


# ── Arquitectura ─────────────────────────────────────────────────────────────

def arquitectura():
    img, d = lienzo()
    titulo(d, "Una tubería de cinco piezas")

    piezas = [
        ("LiveKit", "transporta el audio"),
        ("Deepgram", "transcribe mientras hablas"),
        ("Claude Haiku", "hace de tutor"),
        ("ElevenLabs", "pone la voz"),
    ]
    ancho, alto, hueco = 360, 210, 60
    total = len(piezas) * ancho + (len(piezas) - 1) * hueco
    x = (W - total) / 2
    y = 380

    f_nombre, f_papel, f_flecha = fuente(38, negrita=True), fuente(24), fuente(38)
    for i, (nombre, papel) in enumerate(piezas):
        d.rounded_rectangle([x, y, x + ancho, y + alto], radius=20,
                            fill=(18, 22, 18), outline=(70, 55, 32), width=2)
        n_ancho = d.textlength(nombre, font=f_nombre)
        d.text((x + (ancho - n_ancho) / 2, y + 62), nombre, font=f_nombre, fill=ORO)
        p_ancho = d.textlength(papel, font=f_papel)
        d.text((x + (ancho - p_ancho) / 2, y + 122), papel, font=f_papel, fill=TENUE)
        if i < len(piezas) - 1:
            fx, fy = x + ancho + hueco / 2, y + alto / 2
            d.line([(fx - 16, fy), (fx + 12, fy)], fill=(110, 80, 45), width=3)
            d.polygon([(fx + 18, fy), (fx + 6, fy - 7), (fx + 6, fy + 7)], fill=(110, 80, 45))
        x += ancho + hueco

    f_pie = fuente(28)
    centrado(d, 700, "Pipecat orquesta el conjunto.", f_pie, TEXTO)
    centrado(d, 752, "Cada idioma es un fichero de configuración,", f_pie, TENUE)
    centrado(d, 796, "no una copia del proyecto.", f_pie, TENUE)
    img.save(AQUI / "arquitectura.png")


# ── Mediciones ───────────────────────────────────────────────────────────────

def mediciones():
    img, d = lienzo()
    titulo(d, "El sistema se mide a sí mismo")
    centrado(d, 152, "170 turnos hablados · 15 sesiones", fuente(26), TENUE)

    cols = [300, 1090, 1310, 1530, 1640]
    f_cab, f_fila, f_dest = fuente(22, negrita=True), fuente(30), fuente(34, negrita=True)

    y = 300
    for texto, x in zip(["ETAPA", "MEDIANA", "P90", "OBJETIVO", ""], cols):
        if not texto:
            continue
        ancho = d.textlength(texto, font=f_cab)
        d.text((x if x == cols[0] else x - ancho, y), texto, font=f_cab, fill=TENUE)

    filas = [
        ("Transcripción hasta el primer token", "1.457 ms", "2.034 ms", "500 ms", "no", MAL, False),
        ("Primer token hasta el primer audio", "489 ms", "1.195 ms", "800 ms", "sí", BIEN, False),
        ("Latencia percibida total", "1.593 ms", "2.810 ms", "2.500 ms", "sí", BIEN, True),
    ]
    y = 370
    for etapa, med, p90, obj, ver, color, destacada in filas:
        f = f_dest if destacada else f_fila
        d.line([(cols[0], y - 18), (cols[4], y - 18)], fill=(40, 44, 40), width=1)
        d.text((cols[0], y + 8), etapa, font=f, fill=TEXTO if destacada else TENUE)
        for valor, x, col in ((med, cols[1], ORO), (p90, cols[2], TENUE), (obj, cols[3], TENUE)):
            ancho = d.textlength(valor, font=f)
            d.text((x - ancho, y + 8), valor, font=f, fill=col)
        ancho = d.textlength(ver, font=f)
        d.text((cols[4] - ancho, y + 8), ver, font=f, fill=color)
        y += 96

    f_pie = fuente(28)
    centrado(d, 760, "El 86 % de los turnos entra en el presupuesto.", f_pie, TEXTO)
    centrado(d, 820, "Pero el reconocimiento de voz termina 350 ms antes de que", f_pie, TENUE)
    centrado(d, 864, "se cierre el turno: no consume presupuesto, lo devuelve.", f_pie, TENUE)
    img.save(AQUI / "mediciones.png")


# ── Los tres intentos ────────────────────────────────────────────────────────

def intentos():
    img, d = lienzo()
    titulo(d, "Arreglarlo costó tres intentos")

    filas = [
        ("1", "Subir un parámetro de la transcripción",
         "La capa equivocada", "sin efecto", MAL),
        ("2", "Configurar el modelo de toma de turno",
         "La capa correcta, pero la pieza estaba muerta", "sin efecto", MAL),
        ("3", "Darle un detector de voz que lo despertara",
         "Estaba cargado y ciego", "funcionó", BIEN),
    ]
    x0, ancho, alto = 300, 1320, 128
    y = 220
    f_n, f_que, f_sub, f_ver = (
        fuente(42, negrita=True), fuente(32), fuente(24), fuente(26, negrita=True)
    )
    for n, que, sub, ver, color in filas:
        d.rounded_rectangle([x0, y, x0 + ancho, y + alto], radius=12, fill=(16, 20, 16))
        d.rectangle([x0, y, x0 + 5, y + alto], fill=color)
        d.text((x0 + 42, y + 42), n, font=f_n, fill=TENUE)
        d.text((x0 + 120, y + 30), que, font=f_que, fill=TEXTO)
        d.text((x0 + 120, y + 78), sub, font=f_sub, fill=TENUE)
        v_ancho = d.textlength(ver, font=f_ver)
        d.text((x0 + ancho - v_ancho - 40, y + 50), ver, font=f_ver, fill=color)
        y += alto + 24

    f_mono = fuente(26, mono=True)
    caja_y = y + 40
    d.rounded_rectangle([x0, caja_y, x0 + ancho, caja_y + 190], radius=12, fill=(4, 6, 4))
    lineas = [
        ("Loading Local Smart Turn v3 model...", "<- cargado", ORO),
        ("[bot] turn patience: 5.0s (level B1)", "<- con mi configuracion", ORO),
        ("End of Turn result: ...", "<- 0 veces", MAL),
    ]
    ly = caja_y + 30
    for izq, der, color in lineas:
        d.text((x0 + 40, ly), izq, font=f_mono, fill=TENUE)
        d.text((x0 + 720, ly), der, font=f_mono, fill=color)
        ly += 48
    img.save(AQUI / "intentos.png")


if __name__ == "__main__":
    portada()
    arquitectura()
    mediciones()
    intentos()
    print("tarjetas dibujadas:", *(p.name for p in sorted(AQUI.glob("*.png"))))
