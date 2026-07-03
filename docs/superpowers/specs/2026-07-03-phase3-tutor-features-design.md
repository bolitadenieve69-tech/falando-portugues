# Phase 3 — Tutor Features: Real LiveKit + Inline Corrections (Design)

**Date:** 2026-07-03
**Status:** Approved approach — Option A (backend parses corrections)

## Goal

Make the tutor loop work end-to-end with real audio and structured grammar
corrections:

1. Mobile connects to a **real LiveKit room** (replacing the Phase 2 stub) and
   receives live transcripts over the data channel.
2. The backend bot **parses the tutor's correction format** and publishes it as
   structured data; mobile renders corrections inline in the transcript.
3. The **mobile↔backend API contract is fixed** (today a real session would fail).

Already done (verified, not in scope): level/topic selectors, level/topic in the
tutor system prompt (`build_system_prompt`), session history in AsyncStorage.

## Current defects this design fixes

| # | Defect | Where |
|---|--------|-------|
| 1 | Mobile calls `POST /sessions`; backend exposes `POST /session` | `mobile/src/services/api.ts` |
| 2 | Backend requires `X-App-Token` header; mobile never sends it | api.ts |
| 3 | Backend `SessionRequest` needs `participant_name` (and accepts `voice_id`); mobile sends only `{level, topic}` | api.ts + SessionContext |
| 4 | Backend responds snake_case (`room_name`, `livekit_url`); mobile types expect camelCase | api.ts (map at the boundary) |
| 5 | Tutor corrections `"(Correção: …)"` reach mobile as raw text; `hasCorrection` is never set | bot.py + mobile |
| 6 | `livekit.ts` is a timer-based mock | mobile |

## Block 1 — Backend: correction parser

New module `backend/utils/corrections.py`:

```python
def parse_correction(text: str) -> tuple[str | None, str]:
    """Split '(Correção: X.) Rest' → ('X.', 'Rest'). No match → (None, text)."""
```

- Regex anchored at start, case-insensitive, tolerant of whitespace:
  `^\s*\(\s*corre[çc][ãa]o\s*:\s*(.+?)\)\s*(.*)$` with DOTALL.
- `TranscriptPublisher._publish` (tutor branch only) publishes:

```json
{"type": "transcript", "speaker": "tutor", "text": "<clean reply>", "correction": "<text or null>"}
```

- User-speaker payloads are unchanged (`correction` absent).
- pytest: parser cases (with/without correction, multi-sentence, `Correcção`
  legacy spelling, correction-only reply) + publisher payload test. Keep ≥80%
  coverage on touched modules.
- Requires backend redeploy on the VPS after merge.

## Block 2 — Mobile: API contract fixes

In `mobile/src/services/api.ts`:

- `POST /session` (singular).
- Request body: `{level, topic, voice_id, participant_name}`.
- Header `X-App-Token: process.env.EXPO_PUBLIC_APP_TOKEN` (new env var; add to
  `mobile/.env.example`).
- Map response `{room_name, token, livekit_url}` → `LiveKitSessionData`
  (`roomName`, `token`, `livekitUrl`) at this boundary; the rest of the app
  keeps camelCase.
- `createSession(config, token)` signature grows: config becomes
  `{level, topic, voiceId, participantName}`. `SessionContext.startSession`
  passes `voiceId` (from Settings) and `participantName` (username from Auth);
  Home screen supplies both when calling `startSession`.

## Block 3 — Mobile: real LiveKit service

Rewrite `mobile/src/services/livekit.ts` **keeping the existing interface** so
`SessionContext` and all existing tests are untouched:

```ts
interface RoomHandle {            // exported also as MockRoom alias for compat
  disconnect: () => void
  onTranscript: (handler: (entry: TranscriptEntry) => void) => void
}
export function connect(data: LiveKitSessionData): RoomHandle
export function disconnect(room: RoomHandle): void
```

- Internals: `Room` from `livekit-client` (via `@livekit/react-native`, already
  in package.json). `connect()` returns the handle synchronously and performs
  the async `room.connect(livekitUrl, token)` + `setMicrophoneEnabled(true)`
  internally. Connection errors are logged and retried once; if the retry also
  fails the handle stays silent. SessionContext error handling is unchanged —
  it already guards `createSession` failures, which cover auth/network
  problems.
- `RoomEvent.DataReceived` → exported pure function
  `parseDataMessage(payload: Uint8Array): TranscriptEntry | null`:
  validates `type === 'transcript'`, builds
  `{id, speaker, text, timestamp: Date.now(), hasCorrection: !!correction, correction}`.
  Malformed JSON → `null` (ignored).
- `registerGlobals()` from `@livekit/react-native` called once in
  `app/_layout.tsx` (guarded so jest never executes it).
- **Mock escape hatch:** if `process.env.EXPO_PUBLIC_LIVEKIT_MOCK === '1'`,
  `connect()` returns the current timer-based mock (moved to
  `livekitMock.ts`). Lets Expo Go / CI run without native WebRTC.
- Jest: unit tests for `parseDataMessage` (valid tutor msg with/without
  correction, user msg, malformed JSON, wrong type). The native `Room` is not
  unit-tested; screens keep mocking the service module.

## Block 4 — Mobile: corrections UI

- `TranscriptEntry` gains optional `correction?: string`
  (`src/features/session/types.ts`). `hasCorrection` stays (compat) and equals
  `!!correction` for new entries.
- `TranscriptBubble`: when `entry.correction` is set, render above the reply
  text a highlighted line inside the tutor bubble:
  `✏️ {correction}` — color `Colors.success`, size `Typography.sizes.sm`.
  The old "whole text green when hasCorrection" styling is removed.
- Component tests updated accordingly.

## Block 5 — History

No changes. `SessionHistoryEntry.transcript` already stores `TranscriptEntry`,
so corrections persist and render in the history modal for free.

## Error handling summary

- API errors → existing `SessionContext` error state (unchanged).
- LiveKit connect failure → warn + one retry, session stays in `active` UI with
  no transcript; user can end the session normally.
- Malformed data-channel messages → ignored (`parseDataMessage` returns null).

## Testing & acceptance

- Backend: pytest green, ≥80% on touched modules.
- Mobile: all jest suites green, `tsc --noEmit` clean, ≥80% coverage on `src/`.
- Acceptance (manual, on device/dev build): start session → speak → user and
  tutor bubbles appear live; make a deliberate grammar error → tutor bubble
  shows the ✏️ correction line; end session → history entry shows corrections.
- Known constraint: LiveKit native modules don't run in Expo Go; use the dev
  build or `EXPO_PUBLIC_LIVEKIT_MOCK=1`.

## Out of scope

- Word-tap translation popup, stats screen, offline banner (Phase 4).
- Backend deploy automation changes.
- Voice preview playback in Settings.
