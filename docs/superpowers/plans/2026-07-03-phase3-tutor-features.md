# Phase 3 — Tutor Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real end-to-end tutor loop — backend parses grammar corrections into structured data-channel messages, mobile connects to real LiveKit and renders corrections inline.

**Architecture:** Backend gains a pure `parse_correction()` used by `TranscriptPublisher` before publishing tutor transcripts. Mobile fixes its API contract (`/session`, `X-App-Token`, `participant_name`/`voice_id`, snake→camel mapping), replaces the LiveKit stub with a real `livekit-client` Room behind the **same service interface**, and renders `entry.correction` in `TranscriptBubble`.

**Tech Stack:** Python 3.12 / FastAPI / Pipecat / pytest (backend); Expo 52 / livekit-client + @livekit/react-native / jest-expo (mobile).

**Spec:** `docs/superpowers/specs/2026-07-03-phase3-tutor-features-design.md`

**Runners:**
- Backend tests: `cd backend && pytest tests/ -q` (Homebrew pytest; venvs have no pytest)
- Mobile tests: `cd mobile && npx jest <path> --no-coverage`; full pass `npm run test:coverage && npm run ts`

---

## File Map

```
backend/
├── utils/corrections.py            ← NEW: parse_correction()
├── bot.py                          ← MODIFY: TranscriptPublisher publishes correction
└── tests/
    ├── test_corrections.py         ← NEW
    └── test_bot.py                 ← MODIFY: tutor payload assertions

mobile/
├── .env.example                    ← MODIFY: + EXPO_PUBLIC_APP_TOKEN, EXPO_PUBLIC_LIVEKIT_MOCK
├── app/
│   ├── _layout.tsx                 ← MODIFY: registerGlobals()
│   ├── (tabs)/index.tsx            ← MODIFY: no more SessionProvider/startSession (fixes double bot spawn)
│   ├── (tabs)/settings.tsx         ← MODIFY: real voice list (Tiago/Joana/Patrício)
│   └── session/[roomName].tsx      ← MODIFY: startSession(config, meta)
├── src/
│   ├── features/session/types.ts   ← MODIFY: TranscriptEntry.correction?
│   ├── services/
│   │   ├── api.ts                  ← MODIFY: contract fixes
│   │   ├── livekit.ts              ← REWRITE: real Room + parseDataMessage + mock flag
│   │   ├── livekitMock.ts          ← NEW: current timer mock moved here
│   │   ├── __tests__/api.test.ts   ← MODIFY
│   │   └── __tests__/livekit.test.ts ← REWRITE: parseDataMessage tests
│   ├── components/
│   │   ├── TranscriptBubble.tsx    ← MODIFY: correction line
│   │   └── __tests__/VoiceComponents.test.tsx ← MODIFY
│   └── contexts/
│       ├── SessionContext.tsx      ← MODIFY: startSession(config, meta)
│       └── __tests__/SessionContext.test.tsx ← MODIFY
└── __tests__/screens/
    ├── HomeScreen.test.tsx         ← MODIFY: drop api/livekit mocks
    └── SessionScreen.test.tsx      ← MODIFY: meta in startSession path
```

---

### Task 1: Backend — `parse_correction()`

**Files:**
- Create: `backend/utils/corrections.py`
- Test: `backend/tests/test_corrections.py`

- [ ] **Step 1: Write the failing test** — create `backend/tests/test_corrections.py`:

```python
"""Tests for utils.corrections.parse_correction."""

from utils.corrections import parse_correction


class TestParseCorrection:
    def test_correction_with_reply(self):
        correction, text = parse_correction(
            "(Correção: diz-se fui em vez de fui a.) Boa pergunta! Eu também gosto de viajar."
        )
        assert correction == "diz-se fui em vez de fui a."
        assert text == "Boa pergunta! Eu também gosto de viajar."

    def test_no_correction(self):
        correction, text = parse_correction("Olá! Como estás hoje?")
        assert correction is None
        assert text == "Olá! Como estás hoje?"

    def test_legacy_spelling_correccao(self):
        correction, text = parse_correction("(Correcção: usa-se o tu aqui.) Certo.")
        assert correction == "usa-se o tu aqui."
        assert text == "Certo."

    def test_case_insensitive_and_leading_whitespace(self):
        correction, text = parse_correction("  (correção: falta o acento em está.) Sim!")
        assert correction == "falta o acento em está."
        assert text == "Sim!"

    def test_correction_only_no_reply(self):
        correction, text = parse_correction("(Correção: diz-se obrigado.)")
        assert correction == "diz-se obrigado."
        assert text == ""

    def test_multiline_reply_preserved(self):
        correction, text = parse_correction("(Correção: X em vez de Y.) Primeira. Segunda frase.")
        assert correction == "X em vez de Y."
        assert text == "Primeira. Segunda frase."

    def test_parenthetical_mid_text_is_not_a_correction(self):
        correction, text = parse_correction("Sim (claro) — vamos falar de comida.")
        assert correction is None
        assert text == "Sim (claro) — vamos falar de comida."
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_corrections.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'utils.corrections'`

- [ ] **Step 3: Implement** — create `backend/utils/corrections.py`:

```python
"""Parse the tutor's correction format: '(Correção: X.) Reply.'"""

import re

_CORRECTION_RE = re.compile(
    r"^\s*\(\s*corre[cç]{1,2}[ãa]o\s*:\s*(.+?)\s*\)\s*(.*)$",
    re.IGNORECASE | re.DOTALL,
)


def parse_correction(text: str) -> tuple[str | None, str]:
    """Split a tutor reply into (correction, clean_text).

    Returns (None, text) when the reply does not start with the
    '(Correção: ...)' marker defined in prompts/tutor_pt.py.
    """
    match = _CORRECTION_RE.match(text)
    if not match:
        return None, text
    return match.group(1), match.group(2).strip()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_corrections.py -q`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/utils/corrections.py backend/tests/test_corrections.py
git commit -m "feat: add parse_correction for tutor correction format"
```

---

### Task 2: Backend — publish structured corrections

**Files:**
- Modify: `backend/bot.py` (TranscriptPublisher: tutor branch + `_publish`)
- Modify: `backend/tests/test_bot.py` (tutor payload assertions)

- [ ] **Step 1: Add failing tests** — in `backend/tests/test_bot.py`, inside `TestTranscriptPublisherTutor`, add:

```python
    @pytest.mark.asyncio
    async def test_correction_is_parsed_into_payload(self):
        published: list = []
        pub = self._publisher(published)
        await pub.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)
        await pub.process_frame(
            TextFrame(text="(Correção: diz-se fui em vez de fui a.) Boa pergunta!"),
            FrameDirection.DOWNSTREAM,
        )
        await pub.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)
        assert published == [{
            "type": "transcript",
            "speaker": "tutor",
            "text": "Boa pergunta!",
            "correction": "diz-se fui em vez de fui a.",
        }]

    @pytest.mark.asyncio
    async def test_no_correction_publishes_null(self):
        published: list = []
        pub = self._publisher(published)
        await pub.process_frame(LLMFullResponseStartFrame(), FrameDirection.DOWNSTREAM)
        await pub.process_frame(TextFrame(text="Bom dia!"), FrameDirection.DOWNSTREAM)
        await pub.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)
        assert published[0]["correction"] is None
```

And update the existing exact-payload assertion in `test_full_response_published_on_end` to:

```python
        assert published[0] == {
            "type": "transcript",
            "speaker": "tutor",
            "text": "Bom dia!",
            "correction": None,
        }
```

(User-speaker tests stay untouched — user payloads never carry `correction`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/test_bot.py -q`
Expected: FAIL — 3 tutor tests (missing `correction` key / unparsed text)

- [ ] **Step 3: Implement in `backend/bot.py`**

Add import near the other project imports (next to `from prompts.tutor_pt import build_system_prompt`):

```python
from utils.corrections import parse_correction
```

In the tutor branch of `process_frame`, replace `await self._publish(full)` with:

```python
                    correction, clean = parse_correction(full)
                    await self._publish(clean or full, correction=correction)
```

Change `_publish` signature and payload:

```python
    async def _publish(self, text: str, correction: str | None = None) -> None:
        try:
            message: dict = {"type": "transcript", "speaker": self._speaker, "text": text}
            if self._speaker == "tutor":
                message["correction"] = correction
            payload = json.dumps(message).encode()
```

(rest of `_publish` unchanged). Note the `clean or full` guard: a correction-only
reply (empty clean text) still publishes the original text so TTS transcript and
data channel never diverge into an empty bubble.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && pytest tests/ -q`
Expected: ALL PASS (full backend suite, no regressions)

- [ ] **Step 5: Commit**

```bash
git add backend/bot.py backend/tests/test_bot.py
git commit -m "feat: publish structured corrections on the LiveKit data channel"
```

---

### Task 3: Mobile — API contract fixes

**Files:**
- Modify: `mobile/src/services/api.ts`
- Modify: `mobile/src/services/__tests__/api.test.ts`
- Modify: `mobile/.env.example`

Contract defects fixed here: `/sessions`→`/session`; missing `X-App-Token`; missing `participant_name`/`voice_id`; snake_case response unmapped; translate sends `{text}` but backend wants `{word}`; voice preview path is `/voice-preview/{id}` (GET).

- [ ] **Step 1: Update the api tests** — replace the `createSession`, `translate` and `voicePreview` describe blocks in `mobile/src/services/__tests__/api.test.ts` (keep the login/register blocks as they are):

```typescript
describe('createSession', () => {
  it('posts to /session with app token and full body, maps snake_case response', async () => {
    process.env.EXPO_PUBLIC_APP_TOKEN = 'app-tok';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ room_name: 'room-1', token: 'lk-tok', livekit_url: 'wss://test' }),
    });
    const result = await createSession(
      { level: 'B1', topic: 'livre' },
      'user-tok',
      { voiceId: 'DMcOknq8n1B6XshFIJKJ', participantName: 'angel' }
    );
    expect(result).toEqual({ roomName: 'room-1', token: 'lk-tok', livekitUrl: 'wss://test' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/session'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer user-tok',
          'X-App-Token': 'app-tok',
        }),
        body: JSON.stringify({
          level: 'B1',
          topic: 'livre',
          voice_id: 'DMcOknq8n1B6XshFIJKJ',
          participant_name: 'angel',
        }),
      })
    );
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' });
    await expect(
      createSession({ level: 'A1', topic: 'comida' }, 'tok', { voiceId: 'v', participantName: 'u' })
    ).rejects.toThrow();
  });
});

describe('translate', () => {
  it('posts word field to /translate', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ word: 'casa', translation: 'casa' }) });
    await translate('casa', 'tok');
    const [, options] = mockFetch.mock.calls[0];
    expect(JSON.parse(options.body).word).toBe('casa');
  });
});

describe('voicePreview', () => {
  it('GETs /voice-preview/{id}', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await voicePreview('DMcOknq8n1B6XshFIJKJ', 'tok');
    expect(mockFetch.mock.calls[0][0]).toContain('/voice-preview/DMcOknq8n1B6XshFIJKJ');
  });
});
```

Adjust the existing imports/`mockFetch` setup in that file only if names differ — read the file first; the login/register tests define the conventions.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest src/services/__tests__/api.test.ts --no-coverage`
Expected: FAIL (wrong paths/body/headers)

- [ ] **Step 3: Implement in `mobile/src/services/api.ts`**

```typescript
import type { SessionConfig, LiveKitSessionData } from '../features/session/types'

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'

export interface SessionMeta {
  voiceId: string
  participantName: string
}

function authHeaders(token: string): Record<string, string> {
  const appToken = process.env.EXPO_PUBLIC_APP_TOKEN ?? ''
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(appToken ? { 'X-App-Token': appToken } : {}),
  }
}
```

(`handleResponse`, `login`, `register` unchanged.) Replace `createSession`, `translate`, `voicePreview`:

```typescript
export async function createSession(
  config: SessionConfig,
  token: string,
  meta: SessionMeta
): Promise<LiveKitSessionData> {
  const res = await fetch(`${BASE_URL}/session`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      level: config.level,
      topic: config.topic,
      voice_id: meta.voiceId,
      participant_name: meta.participantName,
    }),
  })
  const data = await handleResponse<{ room_name: string; token: string; livekit_url: string }>(res)
  return { roomName: data.room_name, token: data.token, livekitUrl: data.livekit_url }
}

export async function translate(
  word: string,
  token: string
): Promise<{ translation: string }> {
  const res = await fetch(`${BASE_URL}/translate`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ word }),
  })
  return handleResponse(res)
}

export async function voicePreview(
  voiceId: string,
  token: string
): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/voice-preview/${voiceId}`, {
    method: 'GET',
    headers: authHeaders(token),
  })
  return handleResponse(res)
}
```

Note: keep the return types compatible with existing callers — read
`src/services/__tests__/api.test.ts` login/register blocks and any `translate`
callers before changing signatures beyond what is shown here.

- [ ] **Step 4: Update `mobile/.env.example`** — append:

```
EXPO_PUBLIC_APP_TOKEN=
EXPO_PUBLIC_LIVEKIT_MOCK=
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd mobile && npx jest src/services/__tests__/api.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/src/services/api.ts mobile/src/services/__tests__/api.test.ts mobile/.env.example
git commit -m "fix: align mobile API client with backend contract (/session, app token, snake_case)"
```

---

### Task 4: Mobile — SessionContext meta + single session start

**Files:**
- Modify: `mobile/src/contexts/SessionContext.tsx`
- Modify: `mobile/src/contexts/__tests__/SessionContext.test.tsx`
- Modify: `mobile/app/(tabs)/index.tsx`
- Modify: `mobile/app/session/[roomName].tsx`
- Modify: `mobile/__tests__/screens/HomeScreen.test.tsx`
- Modify: `mobile/__tests__/screens/SessionScreen.test.tsx`

**Why:** today Home calls `startSession` AND SessionScreen calls it again in its own provider — with a real backend that spawns **two bots** per session. Home must only navigate; SessionScreen owns the session.

- [ ] **Step 1: Update SessionContext test** — in `mobile/src/contexts/__tests__/SessionContext.test.tsx`, change every `startSession({ level: ..., topic: ... })` call to:

```typescript
await result.current.startSession(
  { level: 'B1', topic: 'livre' },
  { voiceId: 'DMcOknq8n1B6XshFIJKJ', participantName: 'angel' }
);
```

and add one assertion in the "startSession" test:

```typescript
expect(api.createSession).toHaveBeenCalledWith(
  { level: 'B1', topic: 'livre' },
  'test-tok',
  { voiceId: 'DMcOknq8n1B6XshFIJKJ', participantName: 'angel' }
);
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/contexts/__tests__/SessionContext.test.tsx --no-coverage`
Expected: FAIL (extra argument not accepted / assertion mismatch)

- [ ] **Step 3: Implement in `mobile/src/contexts/SessionContext.tsx`**

```typescript
import type { SessionMeta } from '../services/api'
```

Interface: `startSession: (config: SessionConfig, meta: SessionMeta) => Promise<void>`.
Function:

```typescript
  async function startSession(config: SessionConfig, meta: SessionMeta): Promise<void> {
    configRef.current = config
    startTimeRef.current = Date.now()
    setState({ status: 'connecting', transcript: [], livekitData: null, error: null })

    try {
      const livekitData = await apiCreateSession(config, token, meta)
      // ... rest unchanged
```

- [ ] **Step 4: Simplify Home** — in `mobile/app/(tabs)/index.tsx`: remove the `SessionProvider`/`useSession` imports and wrapper, remove `startSession` from `handleStart`, and export a single component:

```typescript
  function handleStart() {
    router.push(`/session/${level}-${topic}-${Date.now()}`)
  }
```

(`loading`/`error` state around `startSession` goes away; keep the button without `loading`.) The default export is the previous `HomeContent` body directly — no provider.

- [ ] **Step 5: SessionScreen passes meta** — in `mobile/app/session/[roomName].tsx` `SessionContent`, the effect becomes:

```typescript
  const { username } = useAuth();

  useEffect(() => {
    const parts = (roomName ?? '').split('-');
    const level = (parts[0] as UserLevel) || settings.level;
    const topic = (parts[1] as ConversationTopic) || settings.topic;
    startSession(
      { level, topic },
      { voiceId: settings.voiceId, participantName: username ?? 'user' }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 6: Update screen tests** — `HomeScreen.test.tsx`: delete the `jest.mock('.../api')` and `jest.mock('.../livekit')` blocks (no longer used by Home). `SessionScreen.test.tsx`: no structural change needed (it already mocks api/livekit); run it to confirm.

- [ ] **Step 7: Run the whole mobile suite**

Run: `cd mobile && npx jest --no-coverage`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add mobile/src/contexts mobile/app "mobile/__tests__/screens"
git commit -m "fix: single session start in SessionScreen, pass voice and participant to backend"
```

---

### Task 5: Mobile — real voice list in Settings

**Files:**
- Modify: `mobile/app/(tabs)/settings.tsx`

The backend only accepts these `voice_id`s (`_KNOWN_VOICE_IDS` in `backend/main.py`); two of the current mobile entries would be rejected with HTTP 422.

- [ ] **Step 1: Replace the VOICES constant**

```typescript
const VOICES = [
  { id: 'c0rzOw18hxEhaSybUod2', name: 'Tiago', description: 'Lisboa · Conversacional' },
  { id: 'nJ5NFqyKb8kn9JBPmo6i', name: 'Joana', description: 'Lisboa · Natural e clara' },
  { id: 'DMcOknq8n1B6XshFIJKJ', name: 'Patrício', description: 'Porto · Profunda e calma' },
];
```

- [ ] **Step 2: Run settings-related suites + tsc**

Run: `cd mobile && npx jest --no-coverage && npm run ts`
Expected: ALL PASS, no type errors

- [ ] **Step 3: Commit**

```bash
git add "mobile/app/(tabs)/settings.tsx"
git commit -m "fix: settings voice list matches backend known voice IDs"
```

---

### Task 6: Mobile — `correction` field + TranscriptBubble UI

**Files:**
- Modify: `mobile/src/features/session/types.ts`
- Modify: `mobile/src/components/TranscriptBubble.tsx`
- Modify: `mobile/src/components/__tests__/VoiceComponents.test.tsx`

- [ ] **Step 1: Add failing test** — in `VoiceComponents.test.tsx`, add to the TranscriptBubble describe:

```typescript
  it('renders correction line when entry has a correction', () => {
    const { getByText } = render(
      <TranscriptBubble
        entry={{
          id: '3',
          speaker: 'tutor',
          text: 'Boa pergunta!',
          timestamp: 0,
          hasCorrection: true,
          correction: 'diz-se fui em vez de fui a.',
        }}
      />
    );
    expect(getByText(/diz-se fui em vez de fui a\./)).toBeTruthy();
    expect(getByText('Boa pergunta!')).toBeTruthy();
  });

  it('renders no correction line without correction', () => {
    const { queryByText } = render(
      <TranscriptBubble
        entry={{ id: '4', speaker: 'tutor', text: 'Olá!', timestamp: 0, hasCorrection: false }}
      />
    );
    expect(queryByText(/✏️/)).toBeNull();
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/components/__tests__/VoiceComponents.test.tsx --no-coverage`
Expected: FAIL — `correction` not in type / no correction line rendered

- [ ] **Step 3: Add the field** — in `mobile/src/features/session/types.ts`:

```typescript
export interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'tutor';
  text: string;
  timestamp: number;
  hasCorrection: boolean;
  correction?: string;
}
```

- [ ] **Step 4: Render it** — in `TranscriptBubble.tsx`, inside the bubble `<View>`, before the text:

```tsx
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.tutorBubble]}>
        {entry.correction ? (
          <Text style={styles.correctionLine}>✏️ {entry.correction}</Text>
        ) : null}
        <Text style={styles.text}>{entry.text}</Text>
      </View>
```

Remove the `entry.hasCorrection && styles.correction` conditional from the text
style and replace the `correction` style with:

```typescript
  correctionLine: {
    color: Colors.success,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
```

(import `Typography` from theme — it is not imported today).

- [ ] **Step 5: Run to verify it passes**

Run: `cd mobile && npx jest src/components/__tests__/VoiceComponents.test.tsx --no-coverage`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add mobile/src/features/session/types.ts mobile/src/components/TranscriptBubble.tsx mobile/src/components/__tests__/VoiceComponents.test.tsx
git commit -m "feat: render inline grammar correction in tutor bubble"
```

---

### Task 7: Mobile — real LiveKit service

**Files:**
- Create: `mobile/src/services/livekitMock.ts`
- Rewrite: `mobile/src/services/livekit.ts`
- Rewrite: `mobile/src/services/__tests__/livekit.test.ts`
- Modify: `mobile/app/_layout.tsx`

Interface stays identical (`connect(data): handle`, `handle.onTranscript`, `handle.disconnect`) so `SessionContext` and all screen tests are untouched. Native modules are `require`d lazily inside `connect()` so jest never loads them.

- [ ] **Step 1: Move the mock** — create `mobile/src/services/livekitMock.ts` with the current stub logic:

```typescript
import type { LiveKitSessionData, TranscriptEntry } from '../features/session/types'
import type { RoomHandle } from './livekit'

const MOCK_SCRIPT: Array<Omit<TranscriptEntry, 'id' | 'timestamp'>> = [
  { speaker: 'tutor', text: 'Olá! Como posso ajudá-lo hoje?', hasCorrection: false },
  { speaker: 'user', text: 'Quero praticar o meu português.', hasCorrection: false },
  {
    speaker: 'tutor',
    text: 'Ótimo! Vamos praticar.',
    hasCorrection: true,
    correction: 'diz-se "praticar português", sem o artigo.',
  },
]

export function createMockRoom(_data: LiveKitSessionData): RoomHandle {
  let transcriptHandler: ((entry: TranscriptEntry) => void) | null = null
  const timers: ReturnType<typeof setTimeout>[] = []

  MOCK_SCRIPT.forEach((line, i) => {
    timers.push(
      setTimeout(() => {
        transcriptHandler?.({ ...line, id: `mock-${i}`, timestamp: Date.now() })
      }, 1500 * (i + 1))
    )
  })

  return {
    disconnect: () => timers.forEach(clearTimeout),
    onTranscript: (handler) => {
      transcriptHandler = handler
    },
  }
}
```

- [ ] **Step 2: Write the failing parseDataMessage test** — replace `mobile/src/services/__tests__/livekit.test.ts`:

```typescript
import { parseDataMessage } from '../livekit'

function encode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj))
}

describe('parseDataMessage', () => {
  it('parses a tutor message with correction', () => {
    const entry = parseDataMessage(
      encode({ type: 'transcript', speaker: 'tutor', text: 'Boa!', correction: 'diz-se X.' })
    )
    expect(entry).toMatchObject({
      speaker: 'tutor',
      text: 'Boa!',
      correction: 'diz-se X.',
      hasCorrection: true,
    })
    expect(entry?.id).toBeTruthy()
    expect(typeof entry?.timestamp).toBe('number')
  })

  it('parses a tutor message with null correction', () => {
    const entry = parseDataMessage(
      encode({ type: 'transcript', speaker: 'tutor', text: 'Olá!', correction: null })
    )
    expect(entry).toMatchObject({ text: 'Olá!', hasCorrection: false })
    expect(entry?.correction).toBeUndefined()
  })

  it('parses a user message without correction key', () => {
    const entry = parseDataMessage(encode({ type: 'transcript', speaker: 'user', text: 'Eu fui.' }))
    expect(entry).toMatchObject({ speaker: 'user', text: 'Eu fui.', hasCorrection: false })
  })

  it('returns null for non-transcript messages', () => {
    expect(parseDataMessage(encode({ type: 'ping' }))).toBeNull()
  })

  it('returns null for malformed payloads', () => {
    expect(parseDataMessage(new TextEncoder().encode('not json'))).toBeNull()
    expect(parseDataMessage(encode({ type: 'transcript', speaker: 'alien', text: 'x' }))).toBeNull()
    expect(parseDataMessage(encode({ type: 'transcript', speaker: 'user' }))).toBeNull()
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd mobile && npx jest src/services/__tests__/livekit.test.ts --no-coverage`
Expected: FAIL — `parseDataMessage` is not exported

- [ ] **Step 4: Rewrite `mobile/src/services/livekit.ts`**

```typescript
import type { LiveKitSessionData, TranscriptEntry } from '../features/session/types'
import { createMockRoom } from './livekitMock'

export interface RoomHandle {
  disconnect: () => void
  onTranscript: (handler: (entry: TranscriptEntry) => void) => void
}

// Kept for existing imports (SessionContext types the ref as MockRoom).
export type MockRoom = RoomHandle

let entryCounter = 0

export function parseDataMessage(payload: Uint8Array): TranscriptEntry | null {
  try {
    const raw: unknown = JSON.parse(new TextDecoder().decode(payload))
    if (typeof raw !== 'object' || raw === null) return null
    const msg = raw as { type?: string; speaker?: string; text?: string; correction?: string | null }
    if (msg.type !== 'transcript') return null
    if (msg.speaker !== 'user' && msg.speaker !== 'tutor') return null
    if (typeof msg.text !== 'string' || msg.text.length === 0) return null
    const correction = typeof msg.correction === 'string' && msg.correction ? msg.correction : undefined
    entryCounter += 1
    return {
      id: `${msg.speaker}-${Date.now()}-${entryCounter}`,
      speaker: msg.speaker,
      text: msg.text,
      timestamp: Date.now(),
      hasCorrection: Boolean(correction),
      ...(correction ? { correction } : {}),
    }
  } catch {
    return null
  }
}

export function connect(data: LiveKitSessionData): RoomHandle {
  if (process.env.EXPO_PUBLIC_LIVEKIT_MOCK === '1') {
    return createMockRoom(data)
  }

  let handler: ((entry: TranscriptEntry) => void) | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let room: any = null
  let cancelled = false

  async function start(attempt: number): Promise<void> {
    try {
      /* eslint-disable @typescript-eslint/no-var-requires */
      const { AudioSession } = require('@livekit/react-native')
      const { Room, RoomEvent } = require('livekit-client')
      /* eslint-enable @typescript-eslint/no-var-requires */
      await AudioSession.startAudioSession()
      const r = new Room()
      r.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        const entry = parseDataMessage(payload)
        if (entry && handler) handler(entry)
      })
      await r.connect(data.livekitUrl, data.token)
      await r.localParticipant.setMicrophoneEnabled(true)
      if (cancelled) {
        void r.disconnect()
        return
      }
      room = r
    } catch (err) {
      console.warn('[livekit] connect failed', err)
      if (attempt === 0 && !cancelled) {
        await start(1)
      }
    }
  }

  void start(0)

  return {
    disconnect: () => {
      cancelled = true
      if (room) {
        void room.disconnect()
        room = null
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { AudioSession } = require('@livekit/react-native')
        void AudioSession.stopAudioSession()
      } catch {
        // native module unavailable (jest / Expo Go) — nothing to stop
      }
    },
    onTranscript: (h) => {
      handler = h
    },
  }
}

export function disconnect(room: RoomHandle): void {
  room.disconnect()
}
```

- [ ] **Step 5: Register WebRTC globals** — at the top of `mobile/app/_layout.tsx` (before the component definitions):

```typescript
import { registerGlobals } from '@livekit/react-native';

registerGlobals();
```

- [ ] **Step 6: Run to verify it passes + no regressions**

Run: `cd mobile && npx jest --no-coverage`
Expected: ALL PASS (screen tests mock this module; the new test exercises only `parseDataMessage`)

- [ ] **Step 7: Commit**

```bash
git add mobile/src/services/livekit.ts mobile/src/services/livekitMock.ts mobile/src/services/__tests__/livekit.test.ts mobile/app/_layout.tsx
git commit -m "feat: real LiveKit room connection with data-channel transcripts (mock behind env flag)"
```

---

### Task 8: Full verification pass

- [ ] **Step 1: Backend suite**

Run: `cd backend && pytest tests/ -q`
Expected: ALL PASS

- [ ] **Step 2: Mobile coverage + types**

Run: `cd mobile && npm run test:coverage && npm run ts`
Expected: ALL PASS, global line coverage ≥80%, tsc clean

- [ ] **Step 3: Fix anything red, then final commit**

```bash
git add -u
git commit -m "test: Phase 3 verification pass (backend + mobile green)"
```

(Skip the commit if Steps 1-2 left nothing modified.)

---

## Post-plan (manual, not automated here)

1. **Redeploy backend to the VPS** — the correction payload change requires the
   production bot restart (user's usual deploy process for `/opt/falando-portugues`).
2. **Device test** (acceptance from the spec): dev build with
   `EXPO_PUBLIC_APP_TOKEN` set → speak → live bubbles → force a grammar error →
   ✏️ correction appears → end session → history shows the correction.
   Expo Go users: set `EXPO_PUBLIC_LIVEKIT_MOCK=1`.

## Self-Review Notes

- Spec coverage: Block 1 → Tasks 1-2; Block 2 → Task 3 (+ voice list defect in Task 5); Block 3 → Task 7; Block 4 → Task 6; Block 5 → no-op (verified by Task 8). Extra defect found during planning (double bot spawn from Home) → Task 4.
- Type consistency: `SessionMeta` defined in Task 3, consumed in Task 4; `RoomHandle`/`MockRoom` alias in Task 7 matches `SessionContext`'s existing `MockRoom` import; `correction?: string` defined in Task 6, used in Task 7.
