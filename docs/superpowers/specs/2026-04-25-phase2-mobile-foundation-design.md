# Phase 2 — Mobile Foundation Design

**Date:** 2026-04-25
**Project:** Falando Português
**Phase:** 2 — Mobile Foundation
**Status:** Approved

---

## Goal

Build the React Native + Expo mobile app foundation: auth flow, tab navigation, home screen, session screen (LiveKit stubbed), history, and settings. LiveKit is stubbed so all screens are testable without native builds.

---

## Design System

### Palette

| Token | Value | Usage |
|---|---|---|
| `Background` | `#0A0A0F` | Root background |
| `Surface` | `#13131A` | Cards, modals |
| `Surface2` | `#1C1C27` | Inputs, secondary elements |
| `Accent` | `#7C3AED` | Primary actions, orb fill |
| `AccentGlow` | `#7C3AED33` | Orb pulse rings |
| `AccentLight` | `#A78BFA` | Text on accent, hover states |
| `Success` | `#10B981` | Active connection, corrections accepted |
| `Error` | `#EF4444` | Errors, disconnection |
| `TextPrimary` | `#F9FAFB` | Main text |
| `TextSecondary` | `#6B7280` | Secondary text, placeholders |
| `Border` | `#ffffff0D` | Subtle borders (5% white) |

### Typography

- Font family: `Inter` (via `expo-font`)
- Headings: `700–800` weight, sizes 28–40
- Body: `400` weight, size 16
- Transcript: `500` weight, size 15, line-height 22

### Component Tokens

- Button primary: background `Accent`, border-radius 14, violet shadow
- Input: background `Surface2`, border `Border`, focus ring `Accent`
- Card: background `Surface`, border `Border`, border-radius 20
- Voice orb: circle `Accent`, 3 pulsing rings `AccentGlow`

---

## Navigation Structure

```
app/
├── _layout.tsx              ← Root layout (fonts, theme, auth gate)
├── (auth)/
│   ├── _layout.tsx          ← Stack, no tabs
│   ├── welcome.tsx          ← Welcome + CTA
│   ├── register.tsx         ← Register (username, password)
│   └── login.tsx            ← Login
├── (tabs)/
│   ├── _layout.tsx          ← Dark tab bar with icons
│   ├── index.tsx            ← Home: level/topic selector + start button
│   ├── history.tsx          ← Past sessions list
│   └── settings.tsx         ← Voice, default level, logout
└── session/
    └── [roomName].tsx       ← Active voice session (orb + transcript)
```

### Auth Gate (in `_layout.tsx`)

- On app load: read `auth_token` from AsyncStorage
- Token present → redirect to `(tabs)`
- No token → redirect to `(auth)/welcome`

---

## User Flow

```
App opens
  └─ Token in storage? ──No──→ (auth)/welcome → register or login
                        └─Yes─→ (tabs)/index

(tabs)/index
  └─ Select level (A1–C2 chips) + topic → tap "Iniciar" → POST /session
  └─ On response → navigate to session/[roomName]

session/[roomName]
  └─ Orb pulses (connecting) → active (LiveKit stub fires transcript events)
  └─ Transcript entries appear below orb in real time
  └─ Tap "Terminar" → disconnect → back to (tabs)/index, save to history
```

---

## Screens

### `(auth)/welcome`
- Logo (large, centered)
- Tagline: "Fala português como um nativo."
- Button: "Criar conta" → register
- Link: "Já tenho conta" → login

### `(auth)/register`
- Input: nome de utilizador
- Input: palavra-passe (masked)
- Button: "Registar"
- Link: "Já tenho conta" → login
- Validation: username 2–32 chars, password 4+ chars
- On success: save token + username, redirect to `(tabs)`

### `(auth)/login`
- Input: palavra-passe (masked)
- Button: "Entrar"
- Link: "Criar conta" → register
- On success: save token + username, redirect to `(tabs)`
- Note: `device_id` = `expo-device` identifiers joined + uuid fallback, generated once on first launch and stored in AsyncStorage under key `device_id`. Never regenerated.

### `(tabs)/index — Home`
- Header: "Olá, {username}" (TextSecondary greeting)
- Level selector: horizontal chips A1 A2 B1 B2 C1 C2 (selected = Accent fill)
- Topic selector: grid of 6 topic cards with icon + label
- Button "Iniciar sessão" (large, primary, full-width)
- Loading state during POST /session

### `session/[roomName]`
- Status bar: room name + connection status pill (connecting/active/ended)
- Voice orb: centered, 120px, 3 pulse rings animated with `Animated` API
  - Idle: slow pulse
  - User speaking: fast large pulse
  - Tutor speaking: medium steady pulse
- Transcript list: scrollable, below orb
  - User entries: right-aligned, `Surface2` bubble
  - Tutor entries: left-aligned, `Surface` bubble with `AccentLight` name label
  - Corrections shown inline in `Success` color
- Button "Terminar sessão": bottom, destructive style
- LiveKit is **stubbed** in Phase 2: fires mock transcript events on a timer

### `(tabs)/history`
- Empty state: illustration + "Ainda não tens sessões"
- Session list: card per entry showing date, duration, level badge, topic
- Tap card: shows full transcript in a modal sheet

### `(tabs)/settings`
- Section: Voz — 3 voice cards (Tiago / Joana / Patrício), each with a preview play button
- Section: Nível padrão — same A1–C2 chips as Home
- Section: Conta — username display, "Terminar sessão" (logout) button

---

## State Management

### AuthContext

```typescript
interface AuthState {
  token: string | null;
  username: string | null;
}
// Actions: login, register, logout
// Persistence: AsyncStorage keys auth_token, auth_username
```

### SessionContext

```typescript
interface SessionState {
  status: 'idle' | 'connecting' | 'active' | 'ended' | 'error';
  transcript: TranscriptEntry[];
  config: SessionConfig | null;
  livekitData: LiveKitSessionData | null;
}
// Actions: startSession, addTranscriptEntry, endSession, setError
```

### SettingsContext

```typescript
interface SettingsState {
  defaultLevel: UserLevel;
  defaultTopic: ConversationTopic;
  preferredVoiceId: string;
}
// Persistence: AsyncStorage key settings
// Default: level B1, topic livre, voice DMcOknq8n1B6XshFIJKJ (Patrício)
```

---

## Services

### `src/services/api.ts`

```typescript
createSession(config: SessionConfig, token: string): Promise<LiveKitSessionData>
translate(word: string, token: string): Promise<string>
voicePreview(voiceId: string, token: string): Promise<ArrayBuffer>
```

Base URL from `EXPO_PUBLIC_BACKEND_URL`. All requests include `Authorization: Bearer {token}` and `X-App-Token` headers.

### `src/services/livekit.ts` (stub in Phase 2)

```typescript
connect(data: LiveKitSessionData): Promise<MockRoom>
disconnect(room: MockRoom): void
onTranscript(room: MockRoom, cb: (entry: TranscriptEntry) => void): void
```

Stub fires 3 mock transcript entries (tutor greeting + 2 exchanges) on a 1.5s interval after `connect()`.

### `src/services/storage.ts`

```typescript
saveAuthToken(token: string, username: string): Promise<void>
getAuthToken(): Promise<{ token: string; username: string } | null>
clearAuth(): Promise<void>
saveSetting(key: string, value: unknown): Promise<void>
getSettings(): Promise<SettingsState>
saveSession(entry: SessionHistoryEntry): Promise<void>
getSessions(): Promise<SessionHistoryEntry[]>
```

---

## Data Persistence (AsyncStorage)

| Key | Content |
|---|---|
| `auth_token` | Session token string |
| `auth_username` | Username string |
| `device_id` | Generated once on first launch |
| `settings` | JSON: defaultLevel, defaultTopic, preferredVoiceId |
| `sessions` | JSON array of SessionHistoryEntry |

---

## Testing Plan

**Stack:** Jest + React Native Testing Library (included with Expo).
**Target:** ≥80% coverage on `src/`.

| Test | Type | Focus |
|---|---|---|
| `api.ts` | Unit | createSession, translate — fetch mock |
| `storage.ts` | Unit | save/get sessions and settings — AsyncStorage mock |
| `AuthContext` | Integration | login, register, logout, token persistence |
| `SettingsContext` | Unit | update and read defaults |
| `HomeScreen` | Component | level/topic selection, start button |
| `RegisterScreen` | Component | field validation, success flow |
| `LoginScreen` | Component | field validation, success flow |
| `SessionScreen` | Component | status transitions idle→connecting→active→ended |
| `HistoryScreen` | Component | empty state and populated list |

LiveKit and animations are excluded from Phase 2 tests.

---

## File Map

```
mobile/
├── app/
│   ├── _layout.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx
│   │   ├── register.tsx
│   │   └── login.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── history.tsx
│   │   └── settings.tsx
│   └── session/
│       └── [roomName].tsx
├── src/
│   ├── constants/
│   │   └── theme.ts              ← Design tokens
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── SessionContext.tsx
│   │   └── SettingsContext.tsx
│   ├── features/
│   │   └── session/
│   │       └── types.ts          ← Already exists
│   ├── services/
│   │   ├── api.ts
│   │   ├── livekit.ts            ← Stub
│   │   └── storage.ts
│   └── components/
│       ├── VoiceOrb.tsx          ← Animated orb
│       ├── TranscriptBubble.tsx
│       ├── LevelChip.tsx
│       ├── TopicCard.tsx
│       └── PrimaryButton.tsx
├── __tests__/
│   ├── services/
│   │   ├── api.test.ts
│   │   └── storage.test.ts
│   ├── contexts/
│   │   ├── AuthContext.test.tsx
│   │   └── SettingsContext.test.tsx
│   └── screens/
│       ├── HomeScreen.test.tsx
│       ├── RegisterScreen.test.tsx
│       ├── LoginScreen.test.tsx
│       ├── SessionScreen.test.tsx
│       └── HistoryScreen.test.tsx
├── package.json
├── app.json
├── tsconfig.json
└── .env.example
```

---

## Dependencies to Add

```json
"expo": "~52.0.0",
"expo-router": "~4.0.0",
"expo-font": "~13.0.0",
"expo-device": "~7.0.0",
"@react-native-async-storage/async-storage": "^2.0.0",
"react-native-reanimated": "~3.16.0",
"@livekit/react-native": "^2.0.0"
```

`@livekit/react-native` is installed but only the stub is used in Phase 2. Real integration happens in Phase 3.

---

## Out of Scope (Phase 2)

- Real LiveKit connection
- Word tap → translation popup (Phase 3)
- Progress / stats screen (Phase 4)
- Offline handling (Phase 4)
- Push notifications
