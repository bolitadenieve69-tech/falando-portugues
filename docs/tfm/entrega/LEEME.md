# Carpeta de entrega

Lo que se envía a **trabajofinal@rackslabs.com**. Nada más de este repositorio hace falta.

## Contenido

| Fichero | Qué es |
|---|---|
| `memoria-falando-portugues.md` | La memoria completa, con los cinco apartados |
| *(pendiente)* `video-demostrativo.mp4` | El vídeo. Guion en `../trabajo/guion-video.md` |

## Antes de enviar

1. **Recortar el apartado 4** a las aulas realmente cursadas. Declarar un módulo no cursado
   sería una afirmación falsa, y el apartado aguanta igual con menos filas.
2. **Grabar el vídeo** siguiendo el guion.
3. **Exportar a PDF** si se prefiere ese formato: el enunciado admite cualquiera, pero un PDF
   viaja mejor por correo que un fichero Markdown.

## Difusión pública: decidido

El autor **acepta** que Racks Academy publique la memoria en su web, redes y eventos. No hay
que hacer nada: es lo que ocurre por defecto, y solo habría que escribirles para impedirlo.

La propiedad del proyecto en sí —la aplicación y su código— sigue siendo del autor en
cualquier caso.

## Cómo se regenera la memoria

El documento se monta a partir de los cinco apartados sueltos de `docs/tfm/`. Si se edita
alguno, hay que volver a montarlo con `python3 docs/tfm/montar_memoria.py` en la raíz del
repositorio.
