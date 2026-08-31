# Apartado 5 — Conclusiones y proyección futura

## Lecciones aprendidas

### La arquitectura aguantó; lo que faltaba era enfrentarla a la realidad

Diseñé y construí el sistema entero antes de que sostuviera su primera conversación de verdad.
El día que por fin lo puse a funcionar contra los servicios de producción salieron **cinco
fallos en una sola sesión**: una dependencia que había eliminado un parámetro al cambiar de
versión, una clave de API que en realidad era su identificador, un tokenizador sin permisos de
lectura dentro del contenedor, un analizador de respuestas demasiado estricto y una etapa mal
instrumentada.

Ninguno era de arquitectura. Eso me tranquilizó, pero la lección iba por otro lado: aplazar la
primera prueba real sale caro, y el precio sube con lo que llevas construido. Los cinco fallos
aparecieron a la vez, enredados unos con otros, y separarlos costó bastante más de lo que habría
costado encontrarlos de uno en uno.

### Los presupuestos escritos de antemano se corrigen midiendo

En el reparto de latencia del apartado 2 le di hasta un segundo al reconocimiento de voz, porque
intuitivamente parecía la etapa más lenta. Cuando instrumenté el sistema me encontré con lo
contrario: la transcripción termina unos 350 ms **antes** de que el turno se dé por cerrado, así
que no consume presupuesto ninguno. El cuello de botella está en el modelo de lenguaje, que se
come con creces el medio segundo que yo le había asignado.

No creo que fuera un error de cálculo, sino de método: escribí el presupuesto antes de tener con
qué comprobarlo. Su utilidad real fue obligarme a instrumentar el sistema para verificarlo, y
fue ahí donde apareció el dato que lo desmentía.

### En una tubería por capas, acertar la capa importa más que afinar el número

El fallo que más me enseñó fue una interrupción constante: el tutor tomaba la palabra mientras yo
seguía buscando cómo acabar la frase. Lo primero que hice fue subir el parámetro `endpointing`
de Deepgram, de dos segundos a más de tres.

No cambió nada, y los registros lo dejaron claro: el turno se seguía cerrando 370 ms después de
cada frase. Resulta que `endpointing` decide cuándo un **transcrito** es definitivo, mientras que
el fin del **turno** lo decide otra cosa distinta, un modelo semántico de toma de turno
(Smart Turn v3) que trae su propio tope de tres segundos.

Dos parámetros con nombres parecidos, en capas diferentes, gobernando cosas diferentes. Sin la
medición, el cambio habría parecido de lo más sensato y lo habría dado por bueno.

### Un test puede estar en verde mientras la funcionalidad está muerta

Añadí que el tutor reconociera al alumno por su nombre. Las pruebas pasaron, desplegué, y el
tutor siguió preguntándome quién era. El test comprobaba que la función que lanza el bot recibía
bien los datos, pero nadie comprobaba **la llamada real**, que seguía tirando de los valores por
defecto.

La pieza estaba bien probada. La costura entre piezas, no. Y un test que verifica el componente
pero no dónde se enchufa da una confianza falsa, que para mi gusto es peor que no tener test.

### A un modelo de lenguaje no le basta con que le prohíbas: hay que decirle qué hacer en su lugar

Cuando le puse límites al tutor para que no afirmara datos legales que cambian con frecuencia,
empezó a devolver respuestas vacías. Se quedaba callado, sin más. La prohibición dejaba un hueco
y el modelo no sabía con qué llenarlo. Sólo cuando le escribí la frase concreta con la que debía
salir del paso volvió a comportarse.

### Un prompt es una petición; un analizador es una garantía

El tutor tenía que marcar sus correcciones con la palabra portuguesa «Correção». Un día escribió
«Corrección», en español. El analizador no reconoció esa grafía, no la recortó, y el sintetizador
**se la leyó en voz alta al alumno**.

Lo peor es que no fue un fallo ruidoso: no dejó ni un error en los registros, sólo un tutor
diciendo cosas raras. Lo arreglé en dos capas, y el orden de importancia es el contrario al que
parece: el prompt insiste en la forma correcta, pero es el analizador el que garantiza que,
escriba lo que escriba el modelo, esa marca no llegue nunca al altavoz.

### Una transcripción mal hecha puede acabar convertida en un reproche al alumno

El problema de calidad más grave que me encontré no fue técnico. Dije «Alentejo», el reconocedor
escribió «1 entejo», y el tutor me anunció muy convencido que lo correcto era «um enterro» —un
entierro— y a continuación se negó a seguir la conversación por considerarla un asunto personal
delicado.

Un error de máquina se transformó en una corrección falsa contra el alumno y descarriló el
diálogo entero. El fondo del asunto es que el tutor trataba la transcripción como si fuera
exactamente lo que yo había dicho. Ahora, cuando una palabra no encaja en el contexto, pregunta
en lugar de corregir.

### Una funcionalidad que no se ve no existe

Desde las primeras versiones se podía tocar cualquier palabra del tutor para
consultar su traducción. Está implementada, probada, con caché en el servidor para no
pagar dos veces la misma consulta. Y llevaba semanas usando la aplicación sin
descubrirla, hasta que propuse añadir «una especie de diccionario consultable» sin saber
que ya lo tenía delante.

La causa era de una sencillez incómoda: las palabras llevaban un subrayado punteado al
33 % de opacidad sobre un fondo casi negro. Técnicamente la señal estaba ahí; para un
ojo humano, no.

Ninguna prueba automática podía detectar esto, porque el código funcionaba
perfectamente. Y si el autor de la aplicación no encuentra una funcionalidad suya, nadie
la va a encontrar. Lo arreglé subiendo el contraste del subrayado y, sobre todo,
diciéndolo con palabras encima de la conversación, que era lo que faltaba de verdad.

### Dudar no es el caso raro: es el caso de uso

La conclusión que más ha cambiado el producto es también la más simple. El sistema tomaba mis
pausas largas por el final de mi turno, y yo llegué a disculparme por hacer pausas mientras
buscaba la palabra.

En una aplicación cuyo propósito entero es ayudar a hablar a quien todavía no lo hace con
soltura, vacilar no es una desviación de lo esperado: es exactamente lo que va a pasar todo el
rato. Los valores que había puesto salían de lo que resulta natural entre dos personas que ya
dominan el idioma, y esa era la referencia equivocada desde el principio.

## Escalabilidad y mejora continua

### Ampliación a otros idiomas

La arquitectura separa lo que cambia entre idiomas —prompt, voces, código de reconocimiento,
etiquetas de temas— de lo que no cambia: la tubería de audio, la gestión de turno, el registro de
latencias y el almacenamiento. Cada idioma es un perfil de configuración y no una bifurcación
del código.

El registro ya contempla francés, italiano e inglés británico, marcados como no disponibles
mientras no les asigne identificadores de voz reales y no revise los prompts con hablantes
nativos. Las pruebas verifican que los tres comparten las mismas claves de tema y de nivel que
el portugués, así que activarlos consiste en rellenar datos, no en reescribir lógica.

### Validación con usuarios reales

Es la limitación principal del trabajo y prefiero decirlo sin rodeos: **lo he validado con un
único usuario, que soy yo**. Las cifras del apartado 3 miden cómo se comporta el sistema, no lo
que aprende nadie. Para afirmar cualquier cosa sobre eficacia didáctica haría falta un estudio
con varios estudiantes, un grupo de control y una medida de progreso independiente.

El paso siguiente sería una prueba con diez o quince estudiantes durante unas semanas, midiendo
minutos hablados por sesión y cómo evoluciona la proporción de correcciones.

### Identidad ligada al aparato

La cuenta se identifica hoy por el identificador que iOS le asigna a la aplicación en cada
dispositivo. Lo decidí así a propósito para la fase de pruebas, porque quita de en medio todo el
trámite de registro, pero tiene una consecuencia que no es menor: quien cambia de teléfono
pierde su historial y no hay forma de recuperarlo.

Lo descubrí de la peor manera, probando la aplicación en un simulador distinto del habitual y
encontrándome con que el servidor no me conocía. La ruta de salida está clara: añadir una
identidad independiente del aparato, por correo o identificación federada, y dejar el acceso
actual como opción de invitado.

### Paciencia adaptativa

Hoy ajusto la tolerancia a las pausas según el nivel declarado, pero dentro de un mismo nivel
caben ritmos muy distintos. Y el sistema tiene delante la información que necesitaría para
hacerlo mejor: sabe perfectamente cuándo ha interrumpido a alguien, porque esa persona retoma la
frase y su propia respuesta se descarta.

Ese descarte es una señal de error que ahora mismo se está desaprovechando. Un ajuste que subiera
la paciencia después de cada interrupción detectada convergería al ritmo de cada persona en unos
pocos minutos de conversación, sin pedirle que configure nada.

### Observabilidad en producción

El registro de latencias funciona y produce datos por turno, pero dejé el seguimiento de errores
(Sentry) instalado y sin activar, y no monté vigilancia de disponibilidad del servicio. Para
abrir esto a usuarios reales las dos cosas son requisito previo y no mejora opcional: sin ellas,
un fallo en producción sólo se detecta cuando alguien se molesta en quejarse.
