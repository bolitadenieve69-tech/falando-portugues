# Estado del trabajo final — 31 de agosto de 2026

## Entrega

**Fecha objetivo: 17 de septiembre de 2026** (un año desde el alta del curso, el 17 de
septiembre de 2025). Por teléfono confirmaron flexibilidad de una o dos semanas si hiciera
falta, pero el plan es entregar en fecha.

Entrega por correo a **trabajofinal@rackslabs.com**. Dos piezas: **un documento** con cinco
apartados y **un vídeo** obligatorio mostrando el proyecto en acción y explicándolo.
Calificación APTO / NO APTO. La tasa del certificado se comunica una vez aprobado.

**Decidido (01-09-2026):** el autor acepta que Racks difunda públicamente la memoria. No hay
que hacer nada. La propiedad del proyecto (app y código) sigue siendo suya en cualquier caso.

## Documento

| Apartado | Estado |
|---|---|
| 1. Identificación del problema | Escrito |
| 2. Diseño de la solución con IA | Escrito |
| 3. Implementación y validación | Escrito, con las cifras definitivas |
| 4. Vinculación con competencias | **Escrito, pendiente de recortar a las aulas cursadas** |
| 5. Conclusiones y proyección futura | Escrito |

Los cinco están en `docs/tfm/`, redactados en primera persona. Los datos en bruto de los que
salen las cifras están en `docs/tfm/datos/`.

**Guion del vídeo:** `docs/tfm/guion-video.md`, con ocho escenas, tiempos y qué decir en cada
una. **El vídeo no está grabado.**

## Cifras de validación

- **170 turnos hablados** en 15 sesiones.
- Latencia percibida mediana **1.593 ms**, P90 2.810 ms. El **85,9 %** entra en el presupuesto
  de 2.500 ms.
- Cuello de botella: el modelo de lenguaje (1.457 ms de mediana frente a 500 ms de objetivo).
  La transcripción **no consume presupuesto**: termina 352 ms antes de cerrarse el turno.
- Toma de turno: de 0 predicciones a **82**, con esperas de 7,9 s de mediana durante las dudas
  del alumno (antes había un tope duro de 3 s).

Reproducibles con `backend/scripts/latency_report.py` y `backend/scripts/turn_report.py`.

## Estado técnico

- **293 pruebas automáticas**: 198 del servidor, 95 de la aplicación. Todas en verde.
- Servidor desplegado en `37.27.196.137` con la última versión del backend.
- Simulador iPhone 17 Pro (`CA411915-1DF1-47BA-ACD9-D8FAD7AF5A26`) con la app instalada y la
  cuenta iniciada. **La identidad va ligada al aparato (IDFV): en otro simulador no existe la
  cuenta.**
- Metro se arranca con `./node_modules/.bin/expo start --dev-client` (no `npx expo`).

### Desplegado hoy

Toma de turno con detector de voz Silero, guardia contra correcciones inventadas sobre
transcripciones erróneas, marcador de corrección en español recortado, saludo por nombre,
traducción de expresiones.

### En el repositorio y **sin desplegar** (sólo afecta a la app, lo recarga Metro)

Nada pendiente en el servidor. Los cambios de app de la última tanda (diccionario visible,
resumen del historial, crédito con el emblema de cristal) están en `main`.

## Lo que quedó abierto

**Recompensas y estadísticas.** El usuario dice, con razón, que no motivan ni enseñan nada. El
`88 %` por tema es «mensajes menos correcciones» y no dice qué estudiar. Lo que ayudaría:

1. **Errores repetidos.** Hoy sólo se guarda *cuántas* correcciones hubo, no cuáles. Guardarlas
   permitiría decir «has confundido ser y estar 6 veces este mes». Requiere cambiar
   `SessionRecord`, la subida al servidor y el historial.
2. **Diccionario personal.** Guardar las palabras y expresiones consultadas. Funcionalidad
   nueva: almacenamiento, pantalla y sincronización.
3. **Minutos hablados** como número principal en lugar de porcentajes.

Se aparcó conscientemente para no arriesgar la entrega. Está recogido en el apartado 5 como
proyección futura.

**Diseño.** Se arreglaron puntos concretos (crédito del estudio, resúmenes del historial). El
usuario planteó un rediseño visual completo; se recomendó grabar el vídeo antes, por riesgo.

**Tamaño del emblema.** A 96 px el anillo de texto del logo apenas se lee. Queda a decisión del
usuario dejarlo así o subirlo a ~130 px.

## Plan del 2 de septiembre

Antes de entregar:

1. **Grabar el vídeo** siguiendo `trabajo/guion-video.md`. Es lo único obligatorio que falta.
2. **Revisión de seguridad** del servidor y de la aplicación.
3. **Repaso final**: buscar cualquier cosa que quede coja antes de enviar. Conviene revisar la
   memoria buscando cifras que se contradigan entre apartados; ya apareció un caso (el
   recuento de pruebas figuraba como 216, 273 y 286 en sitios distintos; las reales son 293).

Después de entregar, en la siguiente versión:

4. **Activar el francés.** El perfil está escrito; faltan identificadores de voz reales y una
   revisión del prompt por un hablante nativo.
5. **Guardar las correcciones del tutor** para poder repasarlas. Hoy sólo se almacena cuántas
   hubo, no cuáles. Requiere cambiar `SessionRecord`, la subida al servidor y el historial.
6. **Diccionario personal**: guardar las palabras y expresiones consultadas.

El apartado 4 ya está terminado: no hay nada que recortar.
