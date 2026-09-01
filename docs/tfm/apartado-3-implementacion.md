# Apartado 3 — Implementación y validación

## Proceso de desarrollo

Construí el sistema en cuatro fases, y la tercera fue la que de verdad cambió el producto.

**Prototipo del pipeline de voz.** Encadené transporte, transcripción, modelo y síntesis hasta
conseguir un turno completo de conversación. Aquí no había métricas todavía: el objetivo era
comprobar que las cuatro piezas encajaban.

**Instrumentación.** Antes de optimizar nada añadí el registro de tiempos por etapa. Cada turno
hablado deja una línea con las marcas de cada tramo, lo que permite contrastar el presupuesto
del apartado 2 con lo que ocurre de verdad y, cuando un turno sale lento, saber qué componente
lo causó. Esta decisión es la que hace posible todo lo que viene después.

**Puesta en producción y primera conversación real.** Despliegue en un servidor propio con
Docker y Caddy, y primera conversación contra los servicios reales. Aparecieron cinco fallos en
una sola sesión, todos de configuración, versiones o permisos, ninguno de arquitectura.

**Ciclo de medición y corrección.** A partir de ahí el trabajo dejó de ser construir y pasó a
ser medir, encontrar el fallo, repararlo y volver a medir. Los tres intentos que costó arreglar
la toma de turno, que cuento más abajo, son el mejor ejemplo de para qué sirve esto.

El proyecto tiene hoy **293 pruebas automáticas** (198 del servidor y 95 de la aplicación) que
se ejecutan en integración continua con cada cambio.

## Métricas de éxito

Definí dos indicadores cuantitativos antes de empezar a medir.

**Latencia percibida.** El tiempo desde que dejo de hablar hasta que empiezo a oír la respuesta.
El objetivo, fijado en el apartado 2, era no pasar de 2.500 ms.

**Conversación sin interrupciones.** La proporción de respuestas del tutor que no llegan a
oírse porque el sistema dio mi turno por terminado antes de tiempo y yo retomé la frase. Es un
indicador que no había previsto: nació de un problema que sólo apareció al hablar con la
aplicación de verdad.

Ambos se miden con herramientas incluidas en el repositorio (`scripts/latency_report.py` y
`scripts/turn_report.py`), de modo que cualquiera puede reproducir las cifras a partir de los
registros en bruto.

## Resultados de latencia

Sobre **170 turnos hablados completos, repartidos en 15 sesiones**:

| Etapa | Mediana | P90 | Objetivo | Cumple |
|---|---|---|---|---|
| Transcripción → primer token del modelo | 1.457 ms | 2.034 ms | 500 ms | **No** |
| Primer token → primer audio | 489 ms | 1.195 ms | 800 ms | Sí |
| **Latencia percibida total** | **1.593 ms** | **2.810 ms** | **2.500 ms** | **Sí** |

**El 85,9 % de los turnos entra dentro del presupuesto de 2,5 segundos.**

El objetivo global se cumple con holgura en la mediana, pero el reparto por etapas que había
escrito estaba equivocado, y la medición lo demostró de una forma que no esperaba.

**El reconocimiento de voz no consume presupuesto: lo devuelve.** Le había asignado hasta un
segundo por parecer la etapa más lenta. En realidad la transcripción está lista **352 ms antes**
de que el turno se dé por cerrado, porque trabaja en streaming mientras hablo. Ese adelanto es
tiempo que el resto del sistema se puede gastar.

**El cuello de botella es el modelo de lenguaje.** Con 1.457 ms de mediana triplica los 500 ms
que le había asignado, y es responsable de prácticamente toda la latencia percibida. Elegí un
modelo rápido y económico precisamente por esto (apartado 2) y aun así es la etapa dominante.

La conclusión práctica es que optimizar la transcripción no habría servido de nada, que es
exactamente donde habría invertido el esfuerzo sin instrumentación.

## Evidencias del impacto: la toma de turno

Este es el hallazgo principal de la validación, y llegar a él costó tres intentos. Lo cuento
entero porque los dos primeros fracasos enseñan más que el acierto final.

**El problema.** Al hablar con el tutor me cortaba constantemente: yo hacía una pausa buscando
la palabra, el sistema daba mi turno por terminado, el tutor empezaba a hablar y yo retomaba la
frase, con lo que su respuesta se descartaba a medias. Medí mis pausas en el registro: **3,6 y
5,0 segundos** dentro de una misma frase.

**Primer intento: la capa equivocada.** Subí el parámetro `endpointing` de Deepgram de 2.000 a
3.200 ms. No cambió nada, y el registro dijo por qué: el turno se seguía cerrando 370 ms después
de cada frase. Ese parámetro decide cuándo un *transcrito* es definitivo, no cuándo termina el
*turno*.

**Segundo intento: la pieza muerta.** Localicé al responsable real, un modelo semántico de toma
de turno (Smart Turn v3) con un tope propio de 3 segundos, y lo configuré con márgenes de entre
3,5 y 6 segundos según el nivel. Tampoco cambió nada. La evidencia fue concluyente:

```
Loading Local Smart Turn v3 model...     ← cargado
[bot] turn patience: 5.0s (level B1)     ← con mi configuración
End of Turn result: ...                  ← 0 veces en toda la conversación
```

**Cero predicciones.** El modelo estaba cargado, había aceptado mis parámetros y no se ejecutaba
nunca. El transporte de LiveKit no incorpora detector de actividad de voz en esta versión de
Pipecat, así que nunca se emitían los eventos de inicio y fin de habla que despiertan al
analizador. Estaba encendido y ciego.

**Tercer intento: darle oídos.** Añadí un detector de actividad de voz (Silero) que alimenta al
analizador. A partir de ahí el modelo empezó a trabajar.

### Antes y después

| | Antes | Después |
|---|---|---|
| Predicciones del modelo de turno | 0 | **82** |
| Tope de espera | 3 s, fijo | decidido por el modelo |
| Espera real durante una duda (mediana) | — | **7,9 s** |
| Espera máxima observada | — | **26,8 s** |
| Esperas por encima del tope antiguo de 3 s | — | **10 de 13** |

En la conversación de validación —**74 turnos míos a lo largo de nueve minutos**— el modelo
emitió 50 veredictos de «frase inacabada» frente a 32 de «frase terminada». Se ve funcionando en
el registro: mientras yo decía *«Refetivamente,» «Europa,» «não só em Portugal,» «se não»* en
trozos sueltos, el modelo dictaminó INCOMPLETE cuatro veces seguidas y me dejó acabar. Con el
sistema anterior habrían sido cuatro cortes. El tutor respondió corrigiendo **la frase entera**,
reconstruida a partir de los cuatro fragmentos.

### Una advertencia sobre la comparación

El indicador de respuestas descartadas subió del 23 % al 50 %, y presentarlo como un
empeoramiento sería deshonesto, porque **después de la reparación ya no mide lo mismo**.

Antes contaba una sola cosa: el sistema me cortaba. Ahora mezcla esa con otra distinta y
legítima: que yo retome la palabra tras una pausa que sonaba terminada y el sistema descarte una
respuesta que ya no venía a cuento, que es justo lo que hace una persona cuando la interrumpen.
Esa segunda situación antes no podía darse, porque no había nada esperando.

Por eso el indicador válido para el antes y el después es el tiempo que el sistema aguanta
mientras el alumno duda, no el recuento de descartes.

### Validación cualitativa

Dentro de la propia conversación de nueve minutos, sin tocar ningún parámetro:

| | Entregadas | Descartadas | |
|---|---|---|---|
| Primera mitad | 7 | 11 | 61 % |
| Segunda mitad | 11 | 7 | **39 %** |

Mi impresión al hablar coincide con la cifra: *«era cuestión de coger el ritmo de pregunta y
respuesta, y al poco tiempo la conversación fluía sin interrupciones»*.

Esto merece una lectura honesta en las dos direcciones. Por un lado, el sistema pasó a ser
utilizable para una conversación adulta y sostenida. Por otro, **parte de la mejora la puse yo
adaptándome a la máquina**, y un usuario nuevo no sabrá hacer eso: se encontrará el primer
minuto malo y puede abandonar ahí. El problema se ha desplazado del mecanismo a los primeros
compases de uso, que es donde apunta la propuesta de paciencia adaptativa del apartado 5.

## Otras evidencias de la corrección

Estos fallos aparecieron en conversaciones reales y se detallan en el apartado 5. Los recojo
aquí porque comparten un mismo patrón: ninguno produjo un error en los registros y ninguno se
habría encontrado sin hablar con la aplicación.

| Fallo observado | Efecto sobre el alumno | Estado |
|---|---|---|
| El tutor «corregía» erratas de la transcripción | Se le reprochaban errores que no había cometido | Corregido |
| «Alentejo» transcrito como «1 entejo» → el tutor corrigió a «um enterro» | La conversación descarriló | Corregido: ahora pregunta |
| Marca de corrección escrita en español | El sintetizador la leyó en voz alta | Corregido en dos capas |
| El tutor preguntaba el nombre en cada sesión | Repetición y falta de continuidad | Corregido |
| Una conexión caída dejaba su error sobre la sesión siguiente | Aviso de error sobre una sesión correcta | Corregido |

## Alcance de la validación

Conviene delimitar qué demuestran estas cifras. Miden **el comportamiento del sistema**: latencia
por etapa, toma de turno y ausencia de defectos observables. No miden aprendizaje, y no pueden
hacerlo, porque las 15 sesiones son de un único usuario, que además soy yo. Cualquier afirmación
sobre eficacia didáctica exigiría el estudio con varios estudiantes que propongo en el apartado 5.
