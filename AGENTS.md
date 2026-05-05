# Falando Portugues — Codex Instructions

## Project Overview

Voice-first mobile app for practicing **spoken Portuguese (Portugal)** with an AI tutor.
The user speaks into the mic, the AI understands, responds in Portuguese, and corrects grammar — all in real time.

## Architecture

```
Mobile App (React Native + Expo)
  └── LiveKit SDK  ←── real-time audio ──→  LiveKit Cloud (room)
                                                    ↕
                                         Python Backend (Pipecat)
                                           Deepgram STT
                                               ↓
                                        Codex API (LLM tutor)
                                               ↓
                                        ElevenLabs TTS
                                        (Portugal voice)
```

### Why this stack
- **Pipecat**: Industry-standard Python framework for real-time voice AI pipelines
- **Deepgram**: Fastest STT, best end-of-speech detection (critical for low latency)
- **Codex API** (`Codex-haiku-4-5`): Tutor brain — corrects grammar, explains vocabulary
- **ElevenLabs** + Portugal voice + `eleven_multilingual_v2`: Authentic PT-PT accent
- **LiveKit**: Production-grade WebRTC audio transport (no echo, no lag)

## Repository Structure

```
falando-portugues/
├── AGENTS.md
├── .env.example
│
├── backend/                    ← Python (Pipecat) server
│   ├── requirements.txt
│   ├── main.py                 ← Entry point
│   ├── bot.py                  ← Pipecat pipeline definition
│   ├── prompts/
│   │   └── tutor_pt.py         ← System prompt (tutor role)
│   └── utils/
│       └── livekit_token.py    ← Token generation helper
│
└── mobile/                     ← React Native + Expo app
    ├── app/
    │   ├── (tabs)/
    │   │   ├── index.tsx       ← Home: start session
    │   │   ├── history.tsx     ← Past sessions
    │   │   └── settings.tsx    ← Level, topic preferences
    │   └── session/
    │       └── [roomName].tsx  ← Active voice session
    ├── src/
    │   ├── features/
    │   │   ├── session/
    │   │   │   ├── hooks/      ← useVoiceSession, useLiveKit
    │   │   │   ├── components/ ← VoiceOrb, TranscriptView
    │   │   │   └── types.ts
    │   │   └── settings/
    │   │       ├── hooks/      ← useSettings
    │   │       └── types.ts    ← UserLevel, Topic
    │   ├── services/
    │   │   ├── livekit.ts      ← LiveKit room connection
    │   │   └── api.ts          ← Backend HTTP client
    │   └── constants/
    └── package.json
```

## Key Decisions

- **Voice first**: Primary UX is mic button → AI speaks back. Text transcript is secondary.
- **Backend model**: `Codex-haiku-4-5` (fast enough for real-time, 3x cheaper than Sonnet)
- **Portugal Portuguese only**: ElevenLabs voice ID must be PT-PT, not PT-BR
- **Immutability**: Never mutate message arrays or state in place — always return new objects
- **File size**: Max 400 lines per file. Extract early.

## Environment Variables

### Backend (`backend/.env`)
```
ANTHROPIC_API_KEY=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=         # Must be a Portugal (PT-PT) voice
LIVEKIT_URL=                 # wss://your-project.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

### Mobile (`mobile/.env`)
```
EXPO_PUBLIC_BACKEND_URL=     # http://localhost:8000 in dev
EXPO_PUBLIC_LIVEKIT_URL=     # wss://your-project.livekit.cloud
```

## Development Phases

### Phase 0 — Setup (Do First)
- [ ] Install Python 3.10+, create virtualenv `luso_tutor`
- [ ] `pip install pipecat-ai[daily,openai,deepgram,elevenlabs]`
- [ ] Get API keys: Deepgram, Anthropic, ElevenLabs, LiveKit Cloud
- [ ] Test Pipecat "Hello World" script locally (mic → speaker on laptop)

### Phase 1 — Backend Pipeline
- [ ] Pipecat pipeline: Deepgram STT → Codex → ElevenLabs TTS
- [ ] LiveKit transport layer
- [ ] System prompt: Codex as strict but friendly PT-PT tutor
- [ ] HTTP endpoint to create LiveKit room + return token to mobile

### Phase 2 — Mobile Foundation
- [ ] Expo Router setup
- [ ] LiveKit SDK integration
- [ ] Voice session screen (mic button, speaking indicator)
- [ ] Real-time transcript display

### Phase 3 — Tutor Features
- [ ] Level selector (A1–C2) passed to backend as system prompt variable
- [ ] Topic selector (travels, work, family, food, culture, free)
- [ ] Inline corrections displayed in transcript
- [ ] Session history (AsyncStorage)

### Phase 4 — Polish
- [ ] Word tap → translation popup
- [ ] Progress / stats screen
- [ ] Offline / error handling

## Running Locally

```bash
# Backend
cd backend
python -m venv luso_tutor && source luso_tutor/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in keys
python main.py

# Mobile
cd mobile
npm install
npm run ios
```

## Testing

- Backend: pytest, min 80% coverage on `bot.py` and `utils/`
- Mobile: Jest + React Native Testing Library, min 80% on `src/`
- Integration: Real LiveKit test room + recorded Deepgram fixtures (no mocking audio pipeline)

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
