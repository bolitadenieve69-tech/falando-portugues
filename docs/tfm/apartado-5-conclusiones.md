# Apartado 5 — Conclusiones y proyección futura

## Lecciones aprendidas

### La arquitectura no era el problema; el contacto con la realidad sí

El sistema se diseñó y se construyó por completo antes de sostener su primera conversación real.
Cuando por fin se puso en marcha contra los servicios de producción, aparecieron **cinco fallos
en la primera sesión**. Ninguno era de arquitectura: una dependencia que había eliminado un
parámetro entre versiones, una clave de API confundida con su identificador, un tokenizador sin
permisos de lectura dentro del contenedor, un analizador de respuestas demasiado estricto y una
etapa mal instrumentada.

La lección no es que el diseño previo sobre. Es que **el diseño previo no sustituye a la
ejecución**, y que el coste de aplazar la primera prueba real crece con lo construido: los cinco
fallos aparecieron juntos, y separarlos costó más que si se hubieran encontrado de uno en uno.

### Los presupuestos escritos a priori se corrigen midiendo

El reparto de latencia por etapas (apartado 2) asignaba hasta un segundo al reconocimiento de
voz, por ser la etapa que intuitivamente parecía más lenta. La instrumentación demostró lo
contrario: **la transcripción termina unos 350 ms antes de que el turno se dé por cerrado**, de
modo que no consume presupuesto en absoluto. El cuello de botella real es el modelo de lenguaje,
que triplica holgadamente el medio segundo que se le había asignado.

El presupuesto no era incorrecto por descuido, sino por escribirse antes de tener con qué
comprobarlo. Su valor estuvo en obligar a instrumentar el sistema para verificarlo, y ahí es
donde apareció el dato que lo contradecía.

### En una tubería por capas, acertar la capa importa más que afinar el número

El fallo más instructivo del desarrollo fue una interrupción sistemática: el tutor tomaba la
palabra mientras el alumno seguía buscando cómo terminar la frase. La primera reparación
aumentó el parámetro `endpointing` de Deepgram, de dos a más de tres segundos.

No cambió absolutamente nada, y los registros lo demostraron: el turno seguía cerrándose 370 ms
después de cada frase. La razón es que `endpointing` decide cuándo un **transcrito** es
definitivo, mientras que el fin del **turno** lo decide un componente distinto, un modelo
semántico de toma de turno (Smart Turn v3) con su propio tope de tres segundos.

Dos parámetros con nombres parecidos, en capas distintas, gobernando cosas distintas. Sin la
medición, el cambio habría parecido razonable y se habría dado por bueno.

### Un test puede pasar mientras la funcionalidad está muerta

Al añadir el reconocimiento del alumno por su nombre, la batería de pruebas quedó en verde y la
funcionalidad no llegó a funcionar. El test comprobaba la función que lanza el bot pasándole los
datos correctos, pero **nadie comprobaba la llamada real**, que seguía usando los valores por
defecto.

La pieza estaba bien probada; la costura entre piezas, no. Un test que verifica el componente
pero no dónde se enchufa produce una confianza falsa, que es peor que no tener test.

### A un modelo de lenguaje no basta con prohibirle: hay que decirle qué hacer en su lugar

Al restringir al tutor para que no afirmara datos legales cambiantes, empezó a devolver
respuestas vacías: se quedaba callado. La prohibición dejaba un hueco sin alternativa. Sólo al
prescribir la frase concreta con la que debía salir del paso volvió a comportarse.

### Un prompt es una petición; un analizador es una garantía

El tutor debía marcar sus correcciones con la palabra portuguesa «Correção». En una sesión real
escribió «Corrección», en español. El analizador no reconoció esa grafía, no la recortó, y el
sintetizador de voz **se la leyó al alumno en voz alta**.

El fallo no era ruidoso: no produjo ningún error en los registros, sólo un tutor diciendo cosas
raras. La reparación se hizo en dos capas, y el orden de importancia es el inverso al intuitivo:
el prompt insiste en la forma correcta, pero es el analizador el que garantiza que, escriba lo
que escriba el modelo, la marca no llegue al altavoz.

### Una transcripción errónea puede convertirse en un reproche al alumno

El caso más grave de calidad no fue técnico. El alumno dijo «Alentejo», el reconocedor escribió
«1 entejo», y el tutor anunció que lo correcto era «um enterro» —un entierro— y acto seguido se
negó a seguir la conversación por considerarla un asunto personal delicado.

Un error de máquina se transformó en una corrección falsa contra el alumno y descarriló el
diálogo. La causa de fondo es que el tutor trataba la transcripción como si fuera lo dicho.
Ahora, ante una palabra que no encaja en el contexto, pregunta en lugar de corregir.

### Dudar no es el caso raro: es el caso de uso

La conclusión que más ha condicionado el producto es la más simple. El sistema interpretaba una
pausa larga como final de turno, y el usuario que lo probaba se disculpaba por hacer pausas
mientras buscaba la palabra.

En una aplicación cuyo propósito entero es ayudar a hablar a quien todavía no sabe hacerlo con
soltura, la vacilación no es una desviación del comportamiento esperado: **es el comportamiento
esperado**. Los valores iniciales se habían tomado de lo que resulta natural entre dos personas
que ya dominan el idioma, que era la referencia equivocada.

## Escalabilidad y mejora continua

### Ampliación a otros idiomas

La arquitectura separa lo que cambia entre idiomas (prompt, voces, código de reconocimiento,
etiquetas de temas) de lo que no cambia (la tubería de audio, la gestión de turno, el registro
de latencias, el almacenamiento). Cada idioma es un **perfil de configuración**, no una
bifurcación del código.

El registro ya contempla francés, italiano e inglés británico, marcados como no disponibles a
la espera de identificadores de voz reales y de una revisión de los prompts por hablantes
nativos. Las pruebas verifican que los tres comparten las mismas claves de tema y de nivel que
el portugués, de modo que activarlos es completar datos, no reescribir lógica.

### Validación con usuarios reales

Es la limitación principal del trabajo y conviene decirla sin rodeos: **el sistema se ha validado
con un único usuario**. Las cifras del apartado 3 miden el comportamiento del sistema, no el
aprendizaje de nadie. Cualquier afirmación sobre eficacia didáctica exigiría un estudio con
varios estudiantes, un grupo de control y una medida de progreso independiente.

El siguiente paso natural es una prueba con diez o quince estudiantes reales durante varias
semanas, midiendo minutos hablados por sesión y evolución de la proporción de correcciones.

### Identidad ligada al aparato

La cuenta se identifica hoy por el identificador que iOS asigna a la aplicación en cada
dispositivo. Es una decisión deliberada para la fase de pruebas, porque elimina toda fricción de
registro, pero tiene una consecuencia real: **quien cambia de teléfono pierde su historial**, sin
forma de recuperarlo.

La ruta de migración está clara: añadir una identidad independiente del aparato (correo o
identificación federada) manteniendo el acceso actual como opción de invitado.

### Paciencia adaptativa

La tolerancia a las pausas se ajusta hoy por nivel declarado. Un mismo nivel esconde ritmos muy
distintos, y el sistema tiene la información necesaria para hacerlo mejor: sabe cuándo ha
interrumpido a alguien, porque el usuario retoma la frase y su propia respuesta se descarta.

Ese descarte es una señal de error aprovechable. Un ajuste que aumentara la paciencia tras cada
interrupción detectada convergería al ritmo de cada persona en pocos minutos de conversación,
sin pedirle que configure nada.

### Observabilidad en producción

El registro de latencias está integrado y produce datos por turno, pero el seguimiento de errores
(Sentry) quedó instalado y sin activar, y no hay vigilancia de disponibilidad del servicio. Para
un despliegue con usuarios reales ambos son requisito previo, no mejora opcional: sin ellos, un
fallo en producción sólo se detecta cuando alguien se queja.
