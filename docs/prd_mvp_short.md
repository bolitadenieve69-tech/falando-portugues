# PRD — MVP privado (resumen)

Objetivo
-------
Preparar y desplegar la versión MVP privada del tutor de portugués (backend + app Expo) en un VPS para una beta controlada con testers conocidos.

Alcance (esta fase)
--------------------
- Levantar backend en VPS con Docker Compose y Caddy (nip.io provisional).
- Flujo móvil: register/login por dispositivo, iniciar sesión de tutor (LiveKit room), reproducir/recibir audio en tiempo real.
- Bot tutor: pipeline STT (Deepgram) → LLM (Anthropic) → TTS (ElevenLabs) operativo con límites de sesión.
- Persistencia: SQLite para usuarios, cache de traducciones y sesión histórica.

Criterios de aceptación (mínimos)
--------------------------------
- Backend arrancable en VPS con `docker compose up -d --build` usando `backend/.env` rellenado.
- Endpoint `/session` crea room y tokens; cliente Expo puede unirse y recibir audio del bot.
- Registro/login por dispositivo funcionan; tokens rotan en login; llamadas protegidas por `X-App-Token` y Bearer token.
- Tests: cobertura mínima en backend para `auth` y `database` (unitarios básicos, objetivo >= 60% en esta fase).
- Latencia aceptable: primer reply del bot en < 5s en condiciones normales (meta, no bloqueo para merge).

Entregables
-----------
- `docs/prd_mvp_short.md` (este archivo).
- Playbook de despliegue en `docs/deploy.md` (siguiente paso).
- CI básica con tests unitarios en GitHub Actions.

Riesgos conocidos (resumen)
--------------------------
- Dependencia de APIs de terceros (Anthropic, Deepgram, ElevenLabs, LiveKit). Plan de pruebas con stubs necesario.
- SQLite en VPS es suficiente para beta, pero evaluar migración si la carga crece.

Cronograma sugerido
-------------------
- Semana 1: entorno reproducible + health endpoints + logging.
- Semana 2: auth, DB tests, estabilizar bot pipeline.
- Semana 3: mobile UX + CI + despliegue VPS mínimo.

Contacto y próximos pasos
------------------------
Confirma y aprueba este PRD corto. Después empiezo con "Configurar entorno reproducible (Docker, scripts)".
