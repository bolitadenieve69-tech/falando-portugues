# Apartado 2 — Diseño de la solución con IA

## Planteamiento

La conversación hablada impone una restricción que condiciona todo el diseño: **si el tutor
tarda demasiado en responder, deja de ser una conversación.** Por eso el sistema se definió
desde el principio con un requisito no funcional explícito y medible: **la latencia percibida,
desde que el usuario termina de hablar hasta que empieza a oír la respuesta, no debe superar
los 2,5 segundos.**

Ese presupuesto se repartió por etapas y es el criterio con el que se eligió cada componente:

| Etapa | Presupuesto |
|---|---|
| Detección de fin de habla y transcripción | ≤ 1.000 ms |
| Primer token del modelo de lenguaje | ≤ 500 ms |
| Inicio del audio sintetizado | ≤ 800 ms |
| **Total percibido** | **≤ 2.500 ms** |

## Selección de herramientas y justificación

**LiveKit (transporte de audio por WebRTC).** El audio viaja en ambos sentidos de forma continua
y con cancelación de eco. Se descartó una arquitectura convencional de petición y respuesta
sobre HTTP porque obliga a grabar, enviar, esperar y reproducir, un ciclo que hace imposible la
sensación de diálogo. WebRTC es el estándar de las videollamadas precisamente por esto.

**Deepgram, modelo nova-3 (voz a texto en streaming).** Transcribe mientras el usuario habla, en
lugar de esperar a que termine. Se eligió por su detección de fin de intervención, que es la
variable que más pesa en la latencia percibida: decidir demasiado pronto corta al usuario a
media frase, y demasiado tarde introduce un silencio incómodo. El parámetro se ajustó a 1.000
milisegundos tras las pruebas iniciales.

**Claude Haiku 4.5 (el tutor).** Interpreta lo que dice el usuario, responde en portugués
europeo y corrige los errores gramaticales. **Se eligió deliberadamente un modelo rápido y
económico en lugar de uno mayor**: en una conversación hablada, medio segundo de espera
perjudica más que una respuesta ligeramente menos elaborada. Es una decisión de diseño, no una
limitación presupuestaria.

**ElevenLabs, modelo multilingüe (texto a voz).** Genera la voz del tutor. Es de los pocos
proveedores con voces auténticas de **portugués de Portugal**, no de Brasil, lo cual es un
requisito irrenunciable del producto. Se emplea la variante de streaming por WebSocket, que
empieza a emitir audio con el primer fragmento sintetizado en lugar de esperar a la frase
completa.

**Pipecat (orquestación del pipeline).** Encadena los componentes anteriores en un flujo de
fotogramas de audio y texto, gestionando el paso de una etapa a la siguiente sin acumular
latencia.

**FastAPI y SQLite (servidor y persistencia).** Exponen el contrato con la aplicación móvil
(crear sesión, autenticación, historial, traducción de palabras) y almacenan usuarios y sesiones.

**React Native con Expo (aplicación móvil).** Un solo código para iOS y Android, con acceso
nativo al micrófono y al SDK de LiveKit.

## Metodología

**1. El pipeline de voz.** El flujo de cada turno es: el micrófono captura la voz y la envía por
WebRTC; Deepgram transcribe en streaming y detecta el fin de la intervención; el texto se añade
al historial y se envía al modelo; la respuesta se sintetiza en voz y vuelve al usuario por el
mismo canal. En paralelo, un canal de datos publica las transcripciones para mostrarlas en
pantalla.

**2. Diseño del prompt del tutor.** El comportamiento del tutor se define en un *system prompt*
parametrizado por **nivel** (A1 a C2, según el Marco Común Europeo de Referencia) y por **tema**
de conversación. Incorpora tres restricciones derivadas del medio:

- **Máximo dos frases por respuesta.** El texto se va a leer en voz alta: una respuesta larga
  rompe el ritmo del diálogo y multiplica el coste de síntesis.
- **Texto plano, sin formato.** El sintetizador leería los símbolos de marcado en voz alta.
- **Formato fijo de corrección.** El tutor antepone las correcciones gramaticales con una marca
  reconocible, que el servidor separa del resto de la respuesta y envía como campo
  independiente. Así la aplicación puede mostrarla de forma diferenciada.

**3. Arquitectura multiidioma: cada idioma es una configuración, no una copia del proyecto.**
Toda la información específica de un idioma (prompt del tutor, instrucciones por nivel,
etiquetas de tema, código de reconocimiento de voz y voces disponibles) se agrupa en un perfil.
Añadir un idioma consiste en escribir ese perfil y registrarlo, sin tocar el motor. Portugués
está operativo; francés, italiano e inglés tienen su perfil completo a la espera de asignarles
voces.

**4. Control de concurrencia.** Si el usuario interrumpe mientras el tutor está generando, las
peticiones podrían solaparse y provocar errores de límite de tasa en la API del modelo. Se
implementó un mecanismo que serializa las llamadas y conserva únicamente la intervención más
reciente, que es la que refleja la intención real del usuario.

**5. Instrumentación desde el diseño.** El presupuesto de latencia no sirve de nada si no se
mide. El sistema registra, en cada turno hablado, las marcas de tiempo de cada etapa, lo que
permite contrastar el objetivo declarado con el comportamiento real y atribuir un turno lento
al componente concreto que lo causó.

## Nota sobre el método de desarrollo

El proyecto se desarrolló con asistencia de varias herramientas de inteligencia artificial
trabajando sobre el mismo repositorio, coordinadas mediante un documento de traspaso que permite
a cualquiera de ellas retomar el trabajo sin contexto previo. Este enfoque, además de ser el
objeto de estudio de la formación, produjo un hallazgo relevante que se detalla en las
conclusiones: una de las herramientas detectó un fallo de seguridad en código generado por otra.
