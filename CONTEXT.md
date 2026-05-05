# CONTEXT — Falando Português

## Purpose

Falando Português is a voice-first mobile app for practising **spoken European Portuguese (PT-PT)** with a real-time AI tutor. The user speaks into the microphone; the tutor listens, responds in Portuguese, and corrects grammar — all in under two seconds end-to-end.

---

## Domain Glossary

| Term | Definition |
|------|-----------|
| **Session** | A single real-time voice conversation between one user and one tutor bot, hosted in a LiveKit room |
| **Room** | A LiveKit WebRTC room that carries the audio stream for one session (`tutor-<hex8>`) |
| **Tutor bot** | The Python Pipecat pipeline that joins the room as a participant and handles STT → LLM → TTS |
| **Turn** | One complete exchange: user speaks → Deepgram detects end of speech → LLM generates reply → ElevenLabs speaks |
| **Transcript** | The text record of a turn, published over the LiveKit data channel as `{type, speaker, text}` |
| **Correction** | Inline grammar or vocabulary correction embedded in the tutor's reply |
| **Level** | CEFR proficiency level selected by the user: A1, A2, B1, B2, C1, C2 |
| **Topic** | Conversation theme: `viagens`, `trabalho`, `familia`, `comida`, `cultura`, `livre` |
| **Voice** | ElevenLabs voice ID for the tutor — must always be a PT-PT (Portugal) voice, never PT-BR |

---

## Key Invariants

These must never be violated without an explicit architecture decision:

1. **Portugal Portuguese only** — the ElevenLabs voice, Deepgram language code (`pt`), and all tutor copy must be PT-PT, not PT-BR.
2. **One bot per room** — `main.py` spawns exactly one Pipecat pipeline per session. No shared state between sessions.
3. **Immutable state** — message arrays and session state are never mutated in place; always return new objects.
4. **Serial LLM calls** — `_SerialAnthropicLLM` holds an `asyncio.Lock` during generation. Concurrent Anthropic API calls are dropped to prevent HTTP 429.
5. **Max file size** — 400 lines per file. Extract utilities early.
6. **Model** — backend uses `claude-haiku-4-5-20251001` (speed + cost). Never swap to Sonnet without an ADR.
7. **No RTVI handshake** — `PipelineTask(pipeline, enable_rtvi=False)`. The app connects via LiveKit directly.

---

## External System Boundaries

| System | Role | Key constraint |
|--------|------|---------------|
| **LiveKit Cloud** | WebRTC audio transport + data channel for transcripts | Room tokens expire; bot and user each need their own participant token |
| **Deepgram** | Speech-to-text (`nova-3-general`, `language=pt`) | `endpointing=1000ms` to reduce false end-of-turn; interim results enabled |
| **Anthropic Claude** | Tutor LLM (`claude-haiku-4-5-20251001`, `max_tokens=256`) | Rate-limited; serial calls enforced via lock |
| **ElevenLabs** | Text-to-speech (`eleven_multilingual_v2`) | Voice ID must be PT-PT; HTTP TTS service (not streaming WebSocket) |
| **FastAPI / uvicorn** | HTTP backend on port 8000 | `/session` creates room + spawns bot; `/translate` for word lookup; `/health` for infra checks |

---

## Architecture Flow

```
User mic
  └─► LiveKit room (WebRTC)
          └─► Pipecat pipeline (Python, ARM, port 8000)
                  ├─ Deepgram STT  →  TranscriptionFrame
                  ├─ _SerialAnthropicLLM  →  TextFrame (reply + correction)
                  └─ ElevenLabsHttpTTS  →  audio out → LiveKit room → user speaker

LiveKit data channel (parallel):
  TranscriptPublisher("user")   → publishes user speech text
  TranscriptPublisher("tutor")  → publishes full tutor response text
  Mobile app receives both and renders transcript in real time
```

---

## Bounded Contexts

### Voice Pipeline (backend/bot.py)
Owns the real-time audio loop. Stateless per session — no database writes. Communicates with the mobile app exclusively via LiveKit (audio + data channel).

### Session API (backend/main.py)
Owns HTTP contract with the mobile app. Creates LiveKit rooms, issues participant tokens, spawns the pipeline as a background task, rate-limits requests.

### Auth (backend/auth_router.py + database.py)
Owns user identity and access tokens. Sessions require a valid Bearer token.

### Mobile UI (root Expo app)
Owns user interaction: mic button, speaking indicator, real-time transcript, level/topic selector, session history. Communicates with the backend via HTTP (session creation) and with LiveKit directly (audio + data channel).

The active Expo app lives at the repository root (`app/`, `src/`, root `package.json`). The `mobile/` directory is retained as a separate legacy/reference package and should be tested with its own scripts.

---

## Latency Budget

| Stage | Target |
|-------|--------|
| End-of-speech detection (Deepgram) | ≤ 1 000 ms |
| LLM first token (Haiku) | ≤ 500 ms |
| TTS audio start (ElevenLabs HTTP) | ≤ 800 ms |
| **Total perceived latency** | **≤ 2 500 ms** |
