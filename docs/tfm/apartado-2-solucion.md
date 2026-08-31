# Apartado 2 — Diseño de la solución con IA

## Planteamiento

Hay una restricción que condiciona todo lo demás: si el tutor tarda demasiado en contestar, deja
de ser una conversación. Por eso fijé desde el principio un requisito no funcional explícito y
medible: la latencia percibida, desde que el usuario termina de hablar hasta que empieza a oír
la respuesta, no debe pasar de 2,5 segundos.

Repartí ese presupuesto por etapas, y con él en la mano elegí cada componente:

| Etapa | Presupuesto |
|---|---|
| Detección de fin de habla y transcripción | ≤ 1.000 ms |
| Primer token del modelo de lenguaje | ≤ 500 ms |
| Inicio del audio sintetizado | ≤ 800 ms |
| **Total percibido** | **≤ 2.500 ms** |

Conviene decir ya que este reparto resultó estar equivocado en una de sus partidas. Lo explico
en el apartado 3, cuando aparecen las mediciones.

## Selección de herramientas y justificación

**LiveKit (transporte de audio por WebRTC).** El audio viaja en los dos sentidos de forma
continua y con cancelación de eco. Descarté la arquitectura clásica de petición y respuesta
sobre HTTP porque obliga a grabar, enviar, esperar y reproducir; con ese ciclo no hay manera de
que aquello parezca un diálogo. WebRTC es el estándar de las videollamadas precisamente por eso.

**Deepgram, modelo nova-3 (voz a texto en streaming).** Transcribe mientras el usuario habla, sin
esperar a que termine. Lo elegí sobre todo por su detección de fin de intervención, que creía
que era la variable que más pesaba en la latencia: decidir demasiado pronto te corta a media
frase, y demasiado tarde deja un silencio incómodo.

**Claude Haiku 4.5 (el tutor).** Interpreta lo que dice el usuario, contesta en portugués europeo
y corrige los errores gramaticales. Escogí a propósito un modelo rápido y barato en lugar de uno
mayor: hablando, medio segundo de espera molesta más de lo que ayuda una respuesta un poco más
elaborada. Es una decisión de diseño y no una limitación de presupuesto.

**ElevenLabs, modelo multilingüe (texto a voz).** Pone la voz del tutor. Es de los pocos
proveedores con voces auténticas de portugués de Portugal y no de Brasil, que para este producto
es innegociable. Uso la variante de streaming por WebSocket, que empieza a emitir en cuanto
tiene el primer fragmento sintetizado en vez de esperar a la frase entera.

**Pipecat (orquestación del pipeline).** Encadena todo lo anterior en un flujo de fotogramas de
audio y texto, pasando de una etapa a la siguiente sin ir acumulando latencia por el camino.

**FastAPI y SQLite (servidor y persistencia).** Exponen el contrato con la aplicación móvil
—crear sesión, autenticación, historial, traducción de palabras— y guardan usuarios y sesiones.

**React Native con Expo (aplicación móvil).** Un solo código para iOS y Android, con acceso
nativo al micrófono y al SDK de LiveKit.

## Metodología

**1. El pipeline de voz.** Cada turno funciona así: el micrófono captura la voz y la manda por
WebRTC; Deepgram transcribe en streaming y detecta el fin de la intervención; el texto se añade
al historial y va al modelo; la respuesta se sintetiza en voz y vuelve al usuario por el mismo
canal. En paralelo, un canal de datos publica las transcripciones para pintarlas en pantalla.

**2. Diseño del prompt del tutor.** El comportamiento del tutor lo define un *system prompt*
parametrizado por nivel (A1 a C2, según el Marco Común Europeo de Referencia) y por tema de
conversación. Le puse tres restricciones que salen del medio, no del contenido:

- **Máximo dos frases por respuesta.** Todo esto se va a leer en voz alta, y una respuesta larga
  rompe el ritmo del diálogo además de multiplicar el coste de síntesis.
- **Texto plano, sin formato.** El sintetizador leería los símbolos de marcado en voz alta.
- **Formato fijo de corrección.** El tutor antepone las correcciones gramaticales con una marca
  reconocible; el servidor la separa del resto de la respuesta y la manda como campo aparte,
  para que la aplicación pueda mostrarla de otra forma. Esta pieza, aparentemente menor, me dio
  después dos disgustos que cuento en el apartado 5.

**3. Arquitectura multiidioma: cada idioma es una configuración, no una copia del proyecto.**
Agrupo en un perfil todo lo que cambia de un idioma a otro: prompt del tutor, instrucciones por
nivel, etiquetas de tema, código de reconocimiento de voz y voces disponibles. Añadir un idioma
es escribir ese perfil y registrarlo, sin tocar el motor. Portugués está operativo; francés,
italiano e inglés tienen el perfil completo y esperan a que les asigne voces.

**4. Control de concurrencia.** Si el usuario interrumpe mientras el tutor está generando, las
peticiones se solapan y la API del modelo devuelve errores de límite de tasa. Puse un mecanismo
que serializa las llamadas y se queda solo con la intervención más reciente, que es la que
refleja lo que el usuario quiere decir de verdad.

**5. Instrumentación desde el diseño.** Un presupuesto de latencia que no se mide no sirve para
nada. El sistema registra, en cada turno hablado, las marcas de tiempo de cada etapa. Eso me
permite contrastar el objetivo con el comportamiento real y, cuando un turno sale lento, saber
qué componente concreto lo causó.

## Nota sobre el método de desarrollo

Trabajé con varias herramientas de inteligencia artificial sobre el mismo repositorio,
coordinándolas mediante un documento de traspaso que permite a cualquiera de ellas retomar el
trabajo sin contexto previo. Yo dirigí el desarrollo, tomé las decisiones de producto y probé
personalmente cada versión.

Menciono el método porque es el objeto mismo de esta formación, y porque dio un resultado que
merece la pena: una de las herramientas encontró un fallo de seguridad en código escrito por
otra. Lo detallo en las conclusiones.
