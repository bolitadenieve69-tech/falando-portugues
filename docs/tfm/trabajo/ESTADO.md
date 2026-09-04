# Estado del trabajo final — 4 de septiembre de 2026

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
| 4. Vinculación con competencias | Escrito |
| 5. Conclusiones y proyección futura | Escrito |

Los cinco están en `docs/tfm/`, redactados en primera persona. Los datos en bruto de los que
salen las cifras están en `docs/tfm/datos/`.

El documento montado para enviar está en `entrega/memoria-falando-portugues.md`; se regenera
con `python3 docs/tfm/montar_memoria.py` cada vez que se retoca un apartado.

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

- **297 pruebas automáticas**: 202 del servidor, 95 de la aplicación. Todas en verde.
- Servidor desplegado en `37.27.196.137` con la última versión del backend.
- Simulador iPhone 17 Pro (`CA411915-1DF1-47BA-ACD9-D8FAD7AF5A26`) con la app instalada y la
  cuenta iniciada. **La identidad va ligada al aparato (IDFV): en otro simulador no existe la
  cuenta.**
- Metro se arranca con `./node_modules/.bin/expo start --dev-client` (no `npx expo`).

Nada pendiente de desplegar: servidor y repositorio van a la par.

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

## Estado al 4 de septiembre

**La memoria está terminada.** Los cinco apartados, montados en un solo documento en
`entrega/memoria-falando-portugues.md`.

**El vídeo está montado**: `video/falando-portugues-demo.mp4`, 7 min 17 s. Voz grabada aparte
por el autor, planos del simulador, tarjetas dibujadas para los bloques técnicos y la
conversación con su propio sonido. Se rehace con `python3 docs/tfm/video/montar.py`.

**Servidor al día**, con el arreglo del bloqueo desplegado y verificado (paciencia 5,0 s, red
de seguridad 7,0 s).

### Lo único pendiente

**Regrabar la conversación con el tutor.** La toma actual tiene seis segundos de silencio
entre los segundos 32 y 41 —el sistema esperando, que es la función funcionando, pero en
pantalla se lee como vacío— y termina con el tutor bloqueado por una interrupción.

Para la toma nueva: dejarle terminar antes de hablar, una pausa larga deliberada de cuatro o
cinco segundos, alguna equivocación que provoque una corrección, y cuatro o cinco intercambios
en minuto y medio.

Se graba con **⌘⇧5 → cuarto icono (pantalla entera) → Opciones → Micrófono: Dispositivo
agregado**. El encuadre no importa: el montaje recorta el simulador con
`crop=780:1580:1975:245`.

Después basta con cambiar `CONV_TROZOS` en `montar.py` y volver a lanzarlo.

### Montaje de audio del Mac

Ya configurado y probado. Salida del sistema en **«Dispositivo de salida múltiple»**
(auriculares + BlackHole) y grabación desde el **«Dispositivo agregado»** (micrófono +
BlackHole). Si se toca esa configuración, **hay que reiniciar el simulador** o seguirá usando
el dispositivo anterior.

### Entrega

A **trabajofinal@rackslabs.com**, antes del **17 de septiembre de 2026**. El autor acepta que
Racks difunda públicamente la memoria: no hay que hacer nada.
