# Apartado 4 — Vinculación con competencias adquiridas

Conviene decir de entrada con qué profundidad he seguido la formación: he pasado por casi
todas las aulas, en unas a fondo y en otras viendo una parte de las clases. Lo que recojo aquí
no es un certificado de finalización, sino aquello que efectivamente he aplicado en el
proyecto, con el elemento concreto del sistema que lo justifica en cada caso. Un vínculo que
no pudiera señalar dentro del código no lo he puesto.

## Lo que ha sostenido el proyecto

**Aula Audiovisual y Creación.** Es la que más me ha interesado y la que más peso tiene en el
producto, porque en una aplicación para hablar **la voz es el producto**. De aquí sale la
elección del proveedor de síntesis por la existencia de voces auténticas de portugués de
Portugal y no de Brasil, que era un requisito irrenunciable; la comparación entre modelos de
generación buscando el equilibrio entre calidad y velocidad; la decisión de usar la variante
de streaming por WebSocket, que empieza a emitir audio con el primer fragmento sintetizado en
lugar de esperar a la frase completa; y la selección de tres voces con carácter distinto para
que el alumno elija con quién quiere hablar. También la producción del vídeo de demostración
que acompaña a esta memoria.

**Aula LLMs.** El tutor está gobernado por un modelo de lenguaje (Claude Haiku). De aquí
proviene el diseño de los *system prompts*, parametrizados por idioma y por nivel del Marco
Común Europeo de Referencia; la restricción de respuesta a dos frases mediante el límite de
tokens de salida; y el criterio para elegir un modelo rápido y económico frente a uno mayor,
dado que hablando la latencia manda sobre la sofisticación de la respuesta.

Es también donde aprendí algo que sólo se ve al usarlo: que a un modelo no le basta con que
le prohíbas, sino que hay que decirle qué hacer en su lugar. Al restringirle los datos legales
cambiantes empezó a devolver respuestas vacías, y sólo se corrigió al prescribirle la frase
con la que debía salir del paso.

**Aula Bots.** El tutor es un bot conversacional en sentido estricto: un proceso autónomo que
se une a la sala como un participante más, mantiene el estado de la conversación y gestiona el
turno de palabra. Incluye control de concurrencia para que dos peticiones al modelo no se
solapen cuando el usuario interrumpe.

**Aula Developers.** Construcción completa del sistema: servidor en Python con FastAPI,
aplicación móvil en React Native con Expo, **318 pruebas automáticas**, control de versiones
con Git y revisión de código.

**Aula Fundamentos Técnicos.** Arquitectura del sistema y sus límites, diseño de la API REST,
contenerización con Docker y despliegue en servidor propio con proxy inverso y HTTPS.

**Aula Análisis de Datos.** Instrumentación del sistema para medir la latencia por etapas, y
análisis de los resultados (mediana y percentil 90) contrastados con el presupuesto declarado
como requisito no funcional. Es la competencia que más rendimiento ha dado: sin ella, dos
reparaciones que parecían razonables habrían pasado por buenas sin arreglar nada, como se
detalla en el apartado 3.

**Aula Automatizaciones.** Integración continua en GitHub Actions que ejecuta la comprobación
de tipos y la batería de pruebas con cada cambio, y generación automática del informe de
métricas.

## Aportación complementaria

**Aula Webs.** Diseño de la interfaz: sistema de tokens de color derivado en espacio OKLCH,
verificación de contraste y maquetación de las pantallas.

**Aula SAAS y Aula Triple A.** Estudio de viabilidad: coste marginal por sesión frente al
precio de una clase de conversación, análisis de la competencia directa y delimitación del
nicho (portugués europeo frente al brasileño, que es el que ofrecen por defecto las
alternativas).

**Aula Freelance.** Entrega profesional: alcance por fases, documentación de traspaso para que
otra persona pueda continuar el trabajo sin contexto previo, y valoración económica.

## Nota de método

El desarrollo se apoyó en varias herramientas de IA trabajando sobre el mismo repositorio,
coordinadas mediante un documento de traspaso. Durante el proceso, una de ellas detectó un
fallo de seguridad en código generado por otra: la función de guardado de sesiones permitía
que un usuario sobrescribiera las de otro. Se corrigió con una escritura atómica que comprueba
la propiedad del registro, y se cubrió con pruebas específicas.
