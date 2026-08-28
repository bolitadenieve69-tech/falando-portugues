# Apartado 4 — Vinculación con competencias adquiridas

> Borrador. **Antes de entregar, elimina las filas de las aulas que no hayas cursado
> realmente.** Declarar un módulo no cursado sería una afirmación falsa, y el apartado
> queda igual de sólido con menos filas.

El proyecto aplica de forma directa y verificable lo trabajado en las siguientes aulas
de la formación. Cada vínculo señala el elemento concreto del sistema que lo justifica.

## Aulas con peso central en el proyecto

**Aula LLMs.** El tutor está gobernado por un modelo de lenguaje (Claude Haiku). De aquí
proviene el diseño de los *system prompts*, parametrizados por idioma y por nivel del Marco
Común Europeo de Referencia, la restricción de respuesta a dos frases mediante el límite de
tokens de salida, y el criterio para elegir un modelo rápido y económico frente a uno mayor,
dado que la latencia percibida manda sobre la sofisticación de la respuesta.

**Aula Bots.** El tutor es un bot conversacional en el sentido estricto: un proceso autónomo
que se une a la sala como un participante más, mantiene el estado de la conversación y
gestiona el turno de palabra. Incluye control de concurrencia para que dos peticiones al
modelo no se solapen cuando el usuario interrumpe.

**Aula Developers.** Construcción completa del sistema: backend en Python con FastAPI, app
móvil en React Native con Expo, 216 pruebas automatizadas, control de versiones con Git y
revisión de código.

**Aula Fundamentos Técnicos.** Arquitectura del sistema y sus límites, diseño de la API REST,
contenerización con Docker y despliegue en servidor propio con proxy inverso y HTTPS.

**Aula Análisis de Datos.** Instrumentación del sistema para medir la latencia por etapas y
análisis estadístico de los resultados (mediana y percentil 90) contrastados con el
presupuesto de latencia declarado como requisito no funcional.

**Aula Audiovisual y Creación.** Síntesis de voz con ElevenLabs, incluida la comparativa
entre modelos de generación por calidad y velocidad, y la producción del vídeo de
demostración del proyecto.

**Aula Automatizaciones.** Integración continua en GitHub Actions que ejecuta comprobación de
tipos y batería de pruebas en cada cambio, y automatización del informe de métricas.

## Aulas con aportación complementaria

**Aula SAAS.** Análisis de viabilidad del producto: coste marginal por sesión, márgenes según
plan de suscripción y estudio del mercado competidor.

**Aula Webs.** Diseño de la interfaz: sistema de tokens de color derivado en espacio OKLCH,
verificación de contraste según WCAG y maquetación de las pantallas.

**Aula Foundations.** Fundamentos que sostienen las decisiones anteriores: comprensión de las
capacidades y límites de los modelos generativos, y criterio para seleccionar la herramienta
adecuada a cada parte del problema en lugar de aplicar una sola a todo.

**Aula Freelance.** Enfoque de entrega profesional: delimitación del alcance por fases,
documentación de traspaso para que otra persona pueda continuar el trabajo, y valoración
económica de la solución.

---

## Nota de método

Merece mención aparte que el desarrollo se apoyó en varias herramientas de IA trabajando
sobre el mismo repositorio, coordinadas mediante un documento de traspaso. Durante ese
proceso, una de ellas detectó un fallo de seguridad en código generado por otra: la función
de guardado de sesiones permitía que un usuario sobrescribiera las sesiones de otro. Se
corrigió con una escritura atómica que comprueba la propiedad del registro, y se cubrió con
pruebas específicas.
