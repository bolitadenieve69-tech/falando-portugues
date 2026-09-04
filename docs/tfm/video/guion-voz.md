# Guion de voz — Falando Português

**Cómo grabarlo:** abre una grabadora de audio (Notas de Voz, o QuickTime → *Nueva grabación
de audio*). Lee del tirón, de arriba abajo. Entre bloque y bloque, **deja dos segundos de
silencio**: me sirven para cortar limpio.

Si te trabas, **para, respira, y repite la frase entera desde el principio**. No cortes la
grabación. Yo me quedo con la buena.

No hay que ajustarse a ningún tiempo. Lee a tu ritmo, que la imagen la ajusto yo.

---

## 1

Esto es Falando Português, una aplicación para practicar portugués europeo hablado con un tutor
de inteligencia artificial.

Nace de un problema que conozco de primera mano, porque aprendo portugués. Al estudiar un
idioma, hablar es lo único que no puedes practicar solo. La gramática la sacas de un libro y el
vocabulario de unas tarjetas, pero para hablar necesitas a alguien enfrente.

Y ese alguien cuesta entre quince y treinta euros la hora, tiene horarios, y da bastante apuro
equivocarse delante de él.

Esta aplicación cubre ese hueco. Está disponible a cualquier hora, no juzga a nadie, y cuesta
unos céntimos por conversación.

*(dos segundos de silencio)*

---

## 2

Elijo con quién quiero hablar, en qué nivel y de qué tema.

Los niveles van del A uno al C dos, según el Marco Común Europeo, y el tutor ajusta su forma de
hablar a cada uno. Los temas van desde las viajes o la gastronomía hasta uno dedicado a
costumbres portuguesas, pensado para quien prepara el examen de ciudadanía.

Y aquí abajo está el idioma. Portugués es el que está en marcha; francés, italiano e inglés ya
tienen su configuración escrita y esperan solamente a que les asigne voces.

*(dos segundos de silencio)*

---

## 3

Ahora voy a mantener una conversación real. Fíjense en dos cosas.

La primera, que cuando me quedo callado buscando una palabra, el tutor espera. No me
interrumpe. Eso costó más trabajo del que parece, y luego cuento por qué.

La segunda, que cuando me equivoco, la corrección aparece aparte, en un recuadro, sin cortar la
conversación.

*(dos segundos de silencio)*

*(AQUÍ VA LA CONVERSACIÓN EN DIRECTO — no hay que leer nada)*

---

## 4

Cualquier palabra que diga el tutor se puede consultar tocándola. Sale su traducción al
español, y queda guardada para no volver a pedirla.

Y si lo que no entiendo es una expresión hecha, mantengo el dedo pulsado y me traduce el giro
entero. Traducir un modismo palabra por palabra no sirve de nada, y ese era justo el caso en
que más falta hacía.

*(dos segundos de silencio)*

---

## 5

Por debajo hay una tubería de cinco piezas.

LiveKit transporta el audio en los dos sentidos. Deepgram transcribe mientras hablo, sin
esperar a que termine. Claude Haiku hace de tutor. ElevenLabs pone la voz. Y Pipecat orquesta
el conjunto.

Elegí un modelo de lenguaje pequeño y rápido a propósito, no por presupuesto. Hablando, medio
segundo de espera molesta más de lo que ayuda una respuesta un poco más elaborada.

Y elegí ese proveedor de voz porque es de los pocos que tiene voces auténticas de Portugal, y
no de Brasil. Para esta aplicación eso no era negociable.

Cada idioma es un fichero de configuración, no una copia del proyecto. Por eso añadir francés
es rellenar datos, y no reescribir el motor.

*(dos segundos de silencio)*

---

## 6

El sistema se mide a sí mismo.

Cada turno hablado deja registrada la marca de tiempo de cada etapa. Sobre ciento setenta
turnos, la latencia percibida mediana es de mil quinientos noventa y tres milisegundos, y el
ochenta y seis por ciento de los turnos entra dentro del presupuesto de dos segundos y medio
que me había fijado.

Pero el reparto por etapas que escribí antes de medir estaba equivocado.

Yo le había dado un segundo entero al reconocimiento de voz, porque parecía la etapa más lenta.
Y resulta que termina trescientos cincuenta milisegundos antes de que se cierre el turno. No
consume presupuesto: lo devuelve.

El cuello de botella está en el modelo de lenguaje, que triplica lo que le había asignado.

Sin instrumentar el sistema habría optimizado justo la parte que ya iba bien.

*(dos segundos de silencio)*

---

## 7

La reparación que más me enseñó fue la de las interrupciones, y me costó tres intentos.

El primero: subí un parámetro de la transcripción. No cambió nada, porque era la capa
equivocada.

El segundo: configuré el modelo que decide cuándo termina el turno. Tampoco cambió nada. Y el
registro me dijo por qué: el modelo estaba cargado, había aceptado mis parámetros, y no se
ejecutaba ni una sola vez. Le faltaba un detector de actividad de voz que lo despertara. Estaba
encendido y ciego.

El tercero funcionó.

Los dos primeros arreglos parecían razonables, el código era correcto y las pruebas estaban en
verde. Lo que los descartó fue medir, no razonar.

*(dos segundos de silencio)*

---

## 8

El proyecto tiene doscientas noventa y siete pruebas automáticas y se despliega con Docker en
un servidor propio.

Está validado con un único usuario, que soy yo. Así que estas cifras miden cómo se comporta el
sistema, no lo que aprende nadie. Para eso haría falta un estudio con varios estudiantes, y ese
es el siguiente paso.

Gracias.
