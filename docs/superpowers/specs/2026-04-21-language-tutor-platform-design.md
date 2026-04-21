# Language Tutor Platform — Design Spec
**Date:** 2026-04-21  
**Status:** Approved

---

## Vision

A platform of 5 language-learning apps powered by AI voice tutors. Each app has its own visual identity inspired by the target language's culture. A single backend serves all apps. Revenue via freemium + subscription model.

---

## Apps

| App | Language taught | Target audience | Colors |
|-----|----------------|-----------------|--------|
| **Speaking English** | English | Portuguese/Brazilian speakers | Navy blue + red |
| **Hablando Español** | Spanish | Portuguese/Brazilian speakers | Red + yellow |
| **Falando Português** | Portuguese (PT-PT) | Spanish/English speakers | Dark green (existing) |
| **Parlant Français** | French | European/African speakers | Blue + white + red |
| **Parlando Italiano** | Italian | European speakers | Green + white + red |

**Launch order:** Speaking English → Hablando Español → Falando Português (redesign) → Parlant Français → Parlando Italiano (one every 2-3 weeks)

---

## Monetization

| Plan | Price | Includes |
|------|-------|---------|
| Free | €0 | 3 sessions/month, 1 language |
| Single Language | €4.99/month | Unlimited sessions, 1 language |
| All Languages | €8.99/month | Unlimited sessions, all languages |

Apple/Google take 15-30%. Estimated break-even: ~15 paying subscribers per app.

Estimated monthly costs at 100 active users across all apps: €55-95 (VPS + APIs).

---

## Architecture

### Monorepo Structure

```
language-tutor-platform/
├── backend/                  ← Single FastAPI + Pipecat server
│   ├── main.py
│   ├── bot.py                ← Language-aware pipeline
│   ├── prompts/
│   │   ├── english.py
│   │   ├── spanish.py
│   │   ├── portuguese.py
│   │   ├── french.py
│   │   └── italian.py
│   ├── utils/
│   └── requirements.txt
├── apps/
│   ├── speaking-english/     ← Expo app (config + assets only)
│   ├── hablando-espanol/
│   ├── falando-portugues/
│   ├── parlant-francais/
│   └── parlando-italiano/
├── shared/
│   ├── components/           ← Reusable UI (VoiceOrb, TranscriptView, etc.)
│   ├── features/             ← Auth, session, history, settings logic
│   ├── services/             ← API client, LiveKit, preferences
│   └── theme/
│       ├── base.ts           ← Shared typography, spacing, border radius
│       └── apps/
│           ├── english.ts    ← Colors + app name
│           ├── spanish.ts
│           ├── portuguese.ts
│           ├── french.ts
│           └── italian.ts
└── docs/
    └── specs/
```

Each app in `apps/` contains only:
- `app.json` (name, bundle ID, icon, splash)
- `app/` (Expo Router entry, imports from `shared/`)
- `assets/` (icon, splash screen, flag imagery)
- `.env` (points to backend, sets `APP_LANGUAGE`)

Approximately **80% of code lives in `shared/` and `backend/`**.

---

## Backend Changes

### Language-aware session endpoint

`POST /session` receives a `language` parameter (already has `level`, `topic`):

```
language: "english" | "spanish" | "portuguese" | "french" | "italian"
```

The bot pipeline:
1. Loads the correct prompt from `prompts/<language>.py`
2. Passes the correct Deepgram language code to STT
3. Uses the configured ElevenLabs voice ID for that language

### Per-language environment variables

```
ENGLISH_VOICE_ID=
SPANISH_VOICE_ID=
PORTUGUESE_VOICE_ID=DMcOknq8n1B6XshFIJKJ
FRENCH_VOICE_ID=
ITALIAN_VOICE_ID=
```

### Subscription enforcement

Backend checks user's plan before creating a session:
- Free: max 3 sessions/month
- Single Language: unlimited for purchased language only
- All Languages: unlimited for all

---

## Mobile — Per-App Visual Identity

Each app loads its theme at startup via `APP_LANGUAGE` env var. The theme drives:
- Primary color (hero color, buttons, accents)
- Secondary color (backgrounds, chips)
- App name and tagline
- Flag/cultural imagery on home screen

No conditional logic in components — they just consume the theme.

### Example themes

**Speaking English**
- Primary: `#003087` (navy blue)
- Secondary: `#CF142B` (red)
- Tagline: "Your AI English tutor"

**Hablando Español**
- Primary: `#AA151B` (red)
- Secondary: `#F1BF00` (yellow)
- Tagline: "Tu tutor de español con IA"

**Falando Português** (existing, minor refresh)
- Primary: `#1B5E20` (dark green)
- Tagline: "O teu tutor de português europeu"

---

## Subscription Infrastructure

- **In-app purchases:** `react-native-purchases` (RevenueCat) — handles Apple + Google billing, webhooks, entitlements
- **RevenueCat** stores subscription state, backend validates entitlement via RevenueCat API
- No custom billing logic needed

---

## Data Model Changes

Add `language` and `plan` fields to user table:

```sql
ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'portuguese';
ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN sessions_this_month INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN plan_expires_at TEXT;
```

---

## Testing Strategy

- Backend: pytest per language prompt + session creation
- Mobile: Jest unit tests on theme loading, session logic
- Integration: one LiveKit test room per language with recorded fixtures
- E2E: critical path per app (register → start session → hear tutor)

---

## Migration Plan

1. Create new `language-tutor-platform/` repo (monorepo)
2. Copy `backend/` from current project, make language-aware
3. Create `shared/` by extracting components from current mobile app
4. Build `apps/speaking-english/` first as the template
5. Validate full flow (register → session → billing) on Speaking English
6. Clone pattern for remaining 4 apps
7. Submit Speaking English to App Store
8. Repeat for each app every 2-3 weeks
