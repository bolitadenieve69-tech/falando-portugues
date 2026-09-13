# Carpeta de entrega

Lo que se envía a **trabajofinal@rackslabs.com**. Nada más de este repositorio hace falta.

## Contenido

| Fichero | Qué es |
|---|---|
| `memoria-falando-portugues.pdf` | La memoria completa, con los cinco apartados, lista para adjuntar |
| `memoria-falando-portugues.md` | La misma memoria en texto, de la que sale el PDF |
| `../video/falando-portugues-demo.mp4` | El vídeo demostrativo (7 min 25 s, 65 MB) |

## Cómo se regenera

Los cinco apartados sueltos están en `docs/tfm/`. Si se edita alguno, desde la raíz del
repositorio:

    python3 docs/tfm/montar_memoria.py      # monta el .md
    python3.12 docs/tfm/exportar_pdf.py      # convierte el .md en PDF con Chrome

El vídeo se rehace con `python3 docs/tfm/video/montar.py` (necesita las tomas, que no van en
el repositorio).

## Envío

El vídeo pesa 65 MB, demasiado para adjuntarlo por correo. El enunciado admite un enlace a un
Drive público: subir el vídeo (y opcionalmente el PDF) a Drive, compartir «con cualquiera que
tenga el enlace», y poner el enlace en el correo. El PDF sí cabe como adjunto.

## Difusión pública: decidido

El autor **acepta** que Racks Academy publique la memoria en su web, redes y eventos. No hay
que hacer nada: es lo que ocurre por defecto, y solo habría que escribirles para impedirlo.

La propiedad del proyecto en sí —la aplicación y su código— sigue siendo del autor en
cualquier caso.
