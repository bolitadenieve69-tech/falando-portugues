# Handoff — Falando Português

Documento de traspaso del trabajo realizado sobre el MVP. Pensado para que otra
persona u otra herramienta pueda continuar sin contexto previo de las sesiones
anteriores.

- **Repositorio**: `https://github.com/bolitadenieve69-tech/falando-portugues` (privado)
- **Rama por defecto**: `main`
- **Estado**: MVP privado. Portugués listo técnicamente; francés/italiano/inglés con
  arquitectura preparada pero sin voces configuradas (no activables aún).
- **Fecha del traspaso**: 2026-07-24

---

## 1. Qué es el proyecto

App móvil de voz para practicar **portugués europeo (PT-PT)** hablado con un tutor
de IA en tiempo real. El usuario habla por el micrófono; el tutor escucha, responde
en portugués y corrige la gramática, todo en tiempo real (presupuesto de latencia
≤ 2,5 s).

**Arquitectura de alto nivel:**

```
App (React Native + Expo, raíz del repo)
  └── LiveKit SDK  ←── audio en tiempo real ──→  LiveKit Cloud (sala)
                                                       ↕
                                        Backend Python (FastAPI + Pipecat)
                                          Deepgram STT
                                              ↓
                                          Claude Haiku (tutor)
                                              ↓
                                          ElevenLabs TTS (voz PT-PT)
```

La app activa vive en la **raíz** del repo (`app/`, `src/`, `package.json` raíz).
El directorio `mobile/` es un paquete legacy/referencia y se prueba con sus propios
scripts; **no forma parte de la app activa**.

Documentos base del proyecto: [CLAUDE.md](../CLAUDE.md), [CONTEXT.md](../CONTEXT.md),
[README.md](../README.md), y los docs de beta en [docs/beta/](beta/).

---

## 2. Trabajo realizado (Fases 0–2)

Todo está en `main`. Commits en orden:

| Commit | Descripción |
|--------|-------------|
| `0aaca74` | Fase 0 — caducidad de tokens, caché de `/translate`, límite de duración de sesión |
| `a2d3dda` | Fase 1a — TTS por WebSocket (streaming) para bajar latencia |
| `1435db6` | Fase 1b — historial de sesiones en el servidor |
| `7a14816` | Fase 2 — motor multiidioma (perfiles de idioma) |

### Fase 0 — Cimientos y seguridad

- **Respaldo git**: el repo ya existía en local; se configuró el remoto privado en
  GitHub y se subieron todas las ramas. `main` es la rama por defecto.
- **Caducidad de tokens** (`backend/database.py`): los tokens de sesión caducan a los
  `TOKEN_TTL_DAYS` (30 por defecto). El login renueva el plazo. Migración automática
  para BD antiguas: se añade la columna `token_expires_at` y se rellenan los tokens
  vivos existentes (no se desloguea a nadie).
- **`/translate` async + caché** (`backend/main.py`, `database.py`): se pasó de cliente
  síncrono de Anthropic (bloqueaba el event loop) a `AsyncAnthropic`. Las traducciones
  se cachean en SQLite (clave: palabra en minúsculas + par de idiomas).
- **Límite de duración de sesión** (`backend/bot.py`): un watchdog cancela el pipeline
  a los `MAX_SESSION_MINUTES` (30 por defecto) para no consumir créditos indefinidamente.

### Fase 1 — Terminar el núcleo portugués

- **TTS en streaming** (`backend/bot.py`): `ElevenLabsHttpTTSService` →
  `ElevenLabsTTSService` (WebSocket). El audio empieza a reproducirse con el primer
  chunk en vez de esperar la síntesis completa. Modelo configurable con
  `ELEVENLABS_TTS_MODEL` (probar `eleven_flash_v2_5` para menor latencia).
- **Historial de sesiones en el servidor**:
  - Backend: tabla `sessions` por usuario (indexada por `user_id, started_at`),
    con `save_session`/`get_sessions` y los endpoints `POST /sessions` y `GET /sessions`
    (ambos autenticados; la sesión se guarda siempre bajo el ID del usuario autenticado).
  - Móvil: `saveSessionRemote`/`fetchSessionsRemote` en `src/services/api.ts`
    (best-effort, nunca lanzan). `useVoiceSession` sube cada sesión terminada; el
    almacenamiento local sigue siendo la fuente de verdad. La pantalla de historial
    se hidrata desde el servidor al abrirse (`mergeRemoteSessions`), así un dispositivo
    reinstalado recupera su historial.

### Fase 2 — Motor multiidioma

El motor pasó de tener el portugués incrustado a ser **agnóstico al idioma**. Cada
idioma es una configuración (un archivo), no un fork.

**Paquete nuevo `backend/languages/`:**

```
languages/
├── profile.py     # dataclasses LanguageProfile y Voice + build_system_prompt
├── __init__.py    # registro: get_language(), list_languages(), DEFAULT_LANGUAGE
├── pt_pt.py       # Portugués (referencia, contenido verbatim del original)
├── fr_fr.py       # Francés  (prompt completo, voces vacías)
├── it_it.py       # Italiano (prompt completo, voces vacías)
└── en_gb.py       # Inglés   (prompt completo, voces vacías)
```

Un `LanguageProfile` contiene: código (`pt-PT`…), nombre visible, código STT de
Deepgram, plantilla de system prompt, instrucciones por nivel, etiquetas de tema,
voces (id + nombre + texto de preview) y voz por defecto. La propiedad `ready` es
`True` solo si el idioma tiene al menos una voz configurada.

**Invariantes de diseño importantes:**

- Las **claves de tema** (`viagens`, `trabalho`, `familia`, `comida`, `cultura`,
  `livre`) y los **niveles CEFR** (`A1`–`C2`) son **idénticos entre idiomas** a
  propósito, para que la app y los registros de sesión guardados sigan siendo
  independientes del idioma. Solo cambian las etiquetas visibles y el prompt.
- `backend/prompts/tutor_pt.py` se mantiene como shim delgado sobre el perfil
  `PT_PT`, para no romper imports/tests existentes.

**Cambios en el motor:**

- `main.py`: `SessionRequest` tiene campo `language` (por defecto `pt-PT`, para
  compatibilidad con la app actual que no lo envía). Validación de voz por idioma
  vía `model_validator`. Endpoint nuevo `GET /languages` (la app obtiene de aquí el
  catálogo: códigos, etiquetas, temas, voces y flag `ready`; nada hardcodeado en la
  app). `/voice-preview` y `/translate` ahora dependen del idioma.
- `bot.py`: `run_bot` recibe `language` y usa el código STT y el prompt del perfil.

**Parsers de corrección** (`backend/utils/corrections.py` y
`src/features/session/utils/parseCorrection.ts`): reconocen los marcadores de los 4
idiomas (`Correção`/`Correcção`, `Correction`, `Correzione`) sin cambiar el
comportamiento portugués.

**Estado de los idiomas:** solo `pt-PT` está `ready`. `fr-FR`, `it-IT`, `en-GB` tienen
prompts, niveles, temas y código STT completos, pero su tupla `_VOICES` está **vacía**.
`/session` rechaza un idioma hasta que tenga al menos una voz. Esto demuestra que la
arquitectura generaliza sin lanzar un idioma a medio configurar.

---

## 3. Cómo añadir/activar un idioma

1. Abrir el perfil en `backend/languages/` (o crear uno copiando `pt_pt.py`).
2. Elegir voces en la biblioteca de ElevenLabs para ese idioma/dialecto y añadirlas
   a la tupla `_VOICES` (id, nombre visible, frase de preview). Fijar `default_voice_id`.
3. Si el idioma es nuevo, registrarlo en `languages/__init__.py` (`_PROFILES`).
4. Verificar que el marcador de corrección del idioma está cubierto por los parsers
   (`utils/corrections.py` y `parseCorrection.ts`).
5. Probar calidad de STT + TTS con un hablante real antes de invitar testers.

El cliente móvil ya acepta un `language` opcional en `createSession` y puede listar
idiomas con `fetchLanguages()`. El selector de idioma en la UI **no está construido**
a propósito (el roadmap recomienda no añadirlo hasta que la beta portuguesa dé
feedback positivo). Detalle completo en
[docs/beta/multilanguage-roadmap.md](beta/multilanguage-roadmap.md).

---

## 4. Variables de entorno nuevas

Añadidas en `backend/.env.example` (revisar `backend/.env` en el VPS):

| Variable | Por defecto | Qué hace |
|----------|-------------|----------|
| `TOKEN_TTL_DAYS` | `30` | Días antes de que caduque un token; el login lo renueva |
| `MAX_SESSION_MINUTES` | `30` | Tope de duración de una sesión antes de cancelar el bot |
| `ELEVENLABS_TTS_MODEL` | `eleven_multilingual_v2` | Modelo TTS; probar `eleven_flash_v2_5` para menor latencia |

Variables previas relevantes: `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`,
`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
`LIVEKIT_API_SECRET`, `APP_TOKEN`, `ALLOWED_ORIGINS`.

---

## 5. Cómo verificar (comandos)

**Repositorio (app activa):**
```bash
npm run ts                        # typecheck TypeScript
npx jest --watchAll=false         # tests móviles (41 tests)
```

**Backend** — requiere un entorno Python con las deps de `backend/requirements.txt`.
El virtualenv `backend/luso_tutor_arm/` (ARM, con pipecat real) se usó en desarrollo,
pero es un artefacto local desechable (ignorado por git). Los tests usan stubs de
pipecat (`backend/tests/conftest.py`), así que corren en cualquier venv con
`pytest`, `fastapi`, `httpx`, `aiosqlite`, `bcrypt`, `anthropic`, `slowapi`, `python-dotenv`:
```bash
cd backend && python -m pytest tests/ -q     # 115 tests
```

**Estado de la última verificación (2026-07-24):** 115 backend + 41 móvil + `tsc`
limpio. Además se arrancó el backend real con el `.env` y se probó el contrato HTTP
(`/health`, `/auth/*`, `/languages`, rechazos de `/session`): 13/13 checks OK.

---

## 6. Estado de validación (beta portuguesa)

Ver criterios en [docs/beta/qa-checklist.md](beta/qa-checklist.md).

**Verificado técnicamente (verde):** checks de repositorio, contrato HTTP del backend,
y salvaguardas de código (un bot por sesión, crashes logueados, candado anti-429 de
Anthropic, formato de corrección, voces configuradas como PT-PT).

**Pendiente (requiere móvil real + testers, no automatizable):**
- Pipeline de voz en vivo (Deepgram oye, Claude en PT-PT, voz ElevenLabs suena a
  Portugal, audio en dispositivo, latencia percibida ≤ 2,5 s).
- App en iPhone/Android (permisos, estados de sesión, mute, transcripción, historial).
- Escenarios de dispositivo (Wi-Fi/datos, auriculares/altavoz, bloqueo, segundo plano,
  red mala, micro denegado).
- Criterios de salida: ≥5 sesiones reales completas, ≥3 testers que repetirían.

---

## 7. Tareas pendientes / próximos pasos

1. **Desplegar Fases 0–2 en el VPS** (aún no desplegadas):
   ```bash
   cd /ruta/en/el/vps && git pull && docker compose up -d --build
   curl https://37-27-196-137.nip.io/health
   ```
2. **Verificar `APP_TOKEN` en el VPS**: el `backend/.env` **local** lo tiene **vacío**,
   lo que desactiva la barrera `X-App-Token` en `/session` y `/translate`. Confirmar que
   en el VPS está puesto (valor aleatorio, reflejado en la app como `EXPO_PUBLIC_APP_TOKEN`).
   Es un riesgo de coste si queda abierto (registro abierto + endpoints de pago).
3. **Correr la beta portuguesa** (Ronda 1: 3-5 testers) con
   [docs/beta/private-beta-guide.md](beta/private-beta-guide.md).
4. **Solo después de validar el portugués**: activar francés (elegir voces reales de
   ElevenLabs) como primer idioma piloto, luego italiano e inglés.

**Ideas no implementadas (opcionales):** CI en GitHub Actions con los checks de arriba,
Sentry en la app, ping externo a `/health` (UptimeRobot), y el selector de idioma en la UI.

---

## 8. Deudas técnicas conocidas

- Archivos de UI que superan la regla de 400 líneas del proyecto: `app/(tabs)/settings.tsx`
  (659), `app/(tabs)/index.tsx` (649), `app/session/[id].tsx` (630), `app/(tabs)/history.tsx`
  (583). No urgente.
- El paquete legacy `mobile/` no compila con `npm run ts:mobile` por dependencias no
  instaladas (`@testing-library/react-native`, `@types/uuid`). No afecta a la app activa.
- El móvil descarta el campo `correction` que envía el backend en el canal de datos y
  reparsea el texto localmente; funciona, pero es una duplicación de lógica que
  convendría unificar en algún momento.
