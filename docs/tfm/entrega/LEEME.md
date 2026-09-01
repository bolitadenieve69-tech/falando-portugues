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
3. **Decidir sobre la difusión pública.** Racks se reserva publicar la memoria en su web,
   redes y eventos. Si no se quiere, hay que pedirlo por escrito a la misma dirección antes de
   entregar. La propiedad del proyecto en sí (aplicación y código) es del autor en todo caso.
4. **Exportar a PDF** si se prefiere ese formato: el enunciado admite cualquiera, pero un PDF
   viaja mejor por correo que un fichero Markdown.

## Cómo se regenera la memoria

El documento se monta a partir de los cinco apartados sueltos de `docs/tfm/`. Si se edita
alguno, hay que volver a montarlo con `python3 docs/tfm/montar_memoria.py` en la raíz del
repositorio.
