# Guion del vídeo demostrativo

**Requisito de Racks Academy:** *«Es obligatorio incluir un vídeo mostrando tu proyecto en
acción y explicando su funcionamiento.»* Las dos cosas: enseñarlo funcionando **y** explicarlo.

**Duración objetivo: 6–8 minutos.** Ni más ni menos. Menos no da tiempo a explicar; más y quien
lo evalúa deja de mirar.

---

## Antes de grabar

**Comprobaciones técnicas**

- [ ] Servidor desplegado con la última versión y contenedor sano.
- [ ] Simulador iPhone 17 Pro arrancado y sesión iniciada en la app.
- [ ] Auriculares puestos. Sin ellos el eco mete la voz del tutor en el micrófono.
- [ ] Habitación en silencio, televisión apagada. El detector de voz toma cualquier voz
      humana por la tuya.
- [ ] Notificaciones del Mac silenciadas (modo concentración).
- [ ] Ensayar la conversación una vez sin grabar, para saber de qué vas a hablar.

**Qué NO puede aparecer en pantalla**

- [ ] Ficheros `.env`, claves de API, tokens.
- [ ] La contraseña al entrar en la app: entra antes de empezar a grabar.
- [ ] Nada de terceras personas.

**Grabación:** QuickTime → Nueva grabación de pantalla, con audio del micrófono para tu voz.
Graba la ventana del simulador, no la pantalla entera.

---

## Escena 1 — Qué es y qué problema resuelve (45 s)

*En pantalla: la aplicación abierta en la pantalla de inicio.*

> Esto es Falando Português, una aplicación para practicar portugués europeo hablado con un
> tutor de inteligencia artificial. Nace de un problema concreto: al aprender un idioma, hablar
> es la única destreza que no puedes practicar solo. Una clase de conversación cuesta entre 15 y
> 30 euros la hora y hay que reservarla; esto está disponible a cualquier hora y cuesta unos
> céntimos por conversación.

**No leas esto de corrido.** Dilo con tus palabras, que se note que es tuyo.

---

## Escena 2 — La conversación real (2 min) — **la escena importante**

*Inicia una conversación y habla en portugués con el tutor. Cuatro o cinco turnos.*

Qué tiene que verse, sin forzarlo:

1. **El saludo por tu nombre.** Prueba de que el sistema te reconoce entre sesiones.
2. **Una pausa larga tuya, de cuatro o cinco segundos, buscando una palabra** — y el tutor
   esperando. Es la escena que demuestra el trabajo de toma de turno. Provócala a propósito.
3. **Una corrección**, apareciendo como nota al margen separada de la respuesta.

Comenta por encima mientras ocurre, sin tapar al tutor:

> Fíjate en que acabo de quedarme callado casi cinco segundos buscando la palabra, y no me ha
> interrumpido. Eso no salió gratis: cuento luego lo que costó.

---

## Escena 3 — El diccionario (40 s)

*Toca una palabra del tutor. Luego mantén pulsada otra para una expresión.*

> Cualquier palabra del tutor se puede consultar tocándola. Y si es un modismo, manteniendo
> pulsado consulta la expresión entera, porque traducir palabra por palabra no sirve de nada
> con la jerga.

---

## Escena 4 — Nivel, tema y voz (30 s)

*Enseña la selección de nivel A1–C2, los temas y las voces del tutor.*

> El tutor se adapta al nivel del Marco Común Europeo, de A1 a C2, y hay temas de conversación
> preparados, incluido uno sobre costumbres portuguesas con el temario de la prueba de
> ciudadanía. Se puede elegir voz masculina o femenina.

---

## Escena 5 — Cómo funciona por dentro (1 min 30 s)

*En pantalla: un diagrama sencillo del pipeline, o el código de `bot.py`.*

> Por debajo hay una tubería de cinco piezas: LiveKit transporta el audio por WebRTC, Deepgram
> transcribe mientras hablo, Claude Haiku hace de tutor, ElevenLabs pone la voz y Pipecat
> orquesta el conjunto. Elegí un modelo de lenguaje rápido y barato a propósito: hablando, medio
> segundo de espera molesta más que una respuesta algo menos elaborada.

Y el punto de arquitectura que conviene decir:

> Cada idioma es un fichero de configuración, no una copia del proyecto. Francés, italiano e
> inglés ya tienen su perfil escrito; sólo les faltan las voces.

---

## Escena 6 — La medición (1 min 30 s) — **lo que te distingue**

*En pantalla: la terminal ejecutando el informe de latencias.*

```bash
python scripts/latency_report.py /data/latency.jsonl
```

> El sistema se mide a sí mismo. Sobre 170 turnos hablados, la latencia percibida mediana es de
> 1.593 milisegundos y el 86 % de los turnos entra en el presupuesto de dos segundos y medio que
> me había fijado.

Y ahora **lo que de verdad demuestra método**, que es reconocer un error:

> Pero el reparto por etapas que escribí antes de medir estaba equivocado. Yo le había dado un
> segundo entero al reconocimiento de voz por parecer lo más lento, y resulta que termina 350
> milisegundos *antes* de que se cierre el turno. El cuello de botella es el modelo de lenguaje,
> que triplica lo que le había asignado. Sin instrumentar el sistema habría optimizado justo la
> parte que ya iba bien.

---

## Escena 7 — Los tres intentos (1 min)

*Puedes enseñar el registro con las tres líneas.*

> Arreglar las interrupciones me costó tres intentos. Primero subí un parámetro de la
> transcripción: no cambió nada, porque era la capa equivocada. Después configuré el modelo de
> toma de turno, y tampoco: el registro mostraba que estaba cargado, con mis parámetros, y no se
> ejecutaba ni una sola vez. Le faltaba un detector de actividad de voz que lo despertara.
> Estaba encendido y ciego.

> Los dos primeros arreglos parecían razonables, el código era correcto y las pruebas estaban en
> verde. Lo que los descartó fue medir, no razonar.

---

## Escena 8 — Cierre (30 s)

> El proyecto tiene 293 pruebas automáticas y se despliega con Docker en un servidor propio.
> Está validado con un único usuario, que soy yo, así que mide cómo se comporta el sistema y no
> lo que aprende nadie: para eso haría falta un estudio con varios estudiantes, que es el
> siguiente paso.

Cerrar reconociendo el límite deja mejor impresión que cerrar prometiendo de más.

---

## Consejos de grabación

**Si te trabas, no cortes.** Repite la frase y sigue: se edita después. Parar y volver a empezar
desde el principio es la forma más segura de no terminar nunca.

**Graba la escena 2 varias veces.** Es la única que depende de que el sistema se porte bien en
ese momento. Las demás las controlas tú.

**Habla despacio.** Al explicar algo que dominas, todo el mundo acelera.
