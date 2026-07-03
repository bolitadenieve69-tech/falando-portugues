# Phase 2 — Mobile Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React Native + Expo mobile app foundation — auth flow, tab navigation, home screen, session screen (LiveKit stubbed), history, and settings — all fully testable without a native build.

**Architecture:** Expo Router v4 with file-based routing under `mobile/app/`; three React Contexts (Auth, Session, Settings) backed by AsyncStorage; a LiveKit stub that fires mock transcript events on a timer so all session screens are testable without WebRTC.

**Tech Stack:** Expo SDK 52, expo-router v4, @react-native-async-storage/async-storage, react-native-reanimated 3, expo-font, expo-device, jest-expo, @testing-library/react-native.

---

## File Map

```
mobile/
├── app/
│   ├── _layout.tsx                  ← Root layout: fonts, auth gate
│   ├── (auth)/
│   │   ├── _layout.tsx              ← Stack navigator, no tab bar
│   │   ├── welcome.tsx
│   │   ├── register.tsx
│   │   └── login.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx              ← Tab bar with icons
│   │   ├── index.tsx                ← Home: level + topic selector
│   │   ├── history.tsx              ← Past sessions list
│   │   └── settings.tsx             ← Voice, level, logout
│   └── session/
│       └── [roomName].tsx           ← Active voice session
├── src/
│   ├── constants/
│   │   └── theme.ts                 ← Design tokens
│   ├── types.ts                     ← SettingsState, SessionHistoryEntry
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── SessionContext.tsx
│   │   └── SettingsContext.tsx
│   ├── features/
│   │   └── session/
│   │       └── types.ts             ← Already exists — do NOT modify
│   ├── services/
│   │   ├── api.ts
│   │   ├── livekit.ts               ← Stub only in Phase 2
│   │   └── storage.ts
│   └── components/
│       ├── PrimaryButton.tsx
│       ├── LevelChip.tsx
│       ├── TopicCard.tsx
│       ├── VoiceOrb.tsx
│       └── TranscriptBubble.tsx
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
├── babel.config.js
├── tsconfig.json
└── .env.example
```

---

### Task 1: Expo Project Scaffold

**Files:**
- Create: `mobile/package.json`
- Create: `mobile/app.json`
- Create: `mobile/babel.config.js`
- Create: `mobile/tsconfig.json`
- Create: `mobile/.env.example`

- [ ] **Step 1: Create `mobile/package.json`**

```json
{
  "name": "falando-portugues",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "ios": "expo run:ios",
    "android": "expo run:android",
    "test": "jest --watchAll=false",
    "test:coverage": "jest --coverage --watchAll=false",
    "ts": "tsc --noEmit"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-font": "~13.0.0",
    "expo-device": "~7.0.0",
    "@react-native-async-storage/async-storage": "^2.0.0",
    "react-native-reanimated": "~3.16.0",
    "@livekit/react-native": "^2.0.0",
    "react": "18.3.2",
    "react-native": "0.76.5",
    "expo-status-bar": "~2.0.0",
    "expo-splash-screen": "~0.29.0",
    "@expo/vector-icons": "^14.0.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.3.12",
    "@types/react-native": "~0.76.0",
    "@types/uuid": "^10.0.0",
    "@testing-library/react-native": "^12.4.0",
    "@testing-library/jest-native": "^5.4.3",
    "jest": "^29.7.0",
    "jest-expo": "~52.0.0",
    "typescript": "^5.3.0"
  },
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": [],
    "setupFiles": [
      "./jest.setup.ts"
    ],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@livekit/.*|livekit-client)"
    ],
    "collectCoverageFrom": [
      "src/**/*.{ts,tsx}",
      "!src/**/*.d.ts"
    ],
    "coverageThreshold": {
      "global": {
        "lines": 80
      }
    }
  }
}
```

- [ ] **Step 2: Create `mobile/app.json`**

```json
{
  "expo": {
    "name": "Falando Português",
    "slug": "falando-portugues",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0A0A0F"
    },
    "backgroundColor": "#0A0A0F",
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.falando.portugues"
    },
    "android": {
      "adaptiveIcon": {
            "foregroundImage": "./assets/adaptive-icon.png",
            "backgroundColor": "#0A0A0F"
      },
      "package": "com.falando.portugues"
    },
    "plugins": [
      "expo-router",
      [
        "expo-font",
        {
          "fonts": []
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "scheme": "falando"
  }
}
```

- [ ] **Step 3: Create `mobile/babel.config.js`**

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 4: Create `mobile/tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 5: Create `mobile/.env.example`**

```
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
EXPO_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

- [ ] **Step 6: Create `mobile/jest.setup.ts`**

```typescript
import '@testing-library/jest-native/extend-expect';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('expo-device', () => ({
  modelId: 'iPhone14,2',
  osName: 'iOS',
  osVersion: '17.0',
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});
```

- [ ] **Step 7: Create assets placeholder directory**

```bash
mkdir -p /Users/angelguerraiglesias/APP_falando_portugues/mobile/assets
touch /Users/angelguerraiglesias/APP_falando_portugues/mobile/assets/.gitkeep
```

- [ ] **Step 8: Install dependencies**

```bash
cd mobile && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 9: Commit**

```bash
git add mobile/package.json mobile/app.json mobile/babel.config.js mobile/tsconfig.json mobile/.env.example mobile/jest.setup.ts mobile/assets/.gitkeep
git commit -m "chore: scaffold Expo 52 project with jest-expo and router v4"
```

---

### Task 2: Design Tokens

**Files:**
- Create: `mobile/src/constants/theme.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/constants/theme.test.ts`:

```typescript
import { Colors, Typography, Spacing, Radii } from '../../src/constants/theme';

describe('theme', () => {
  it('exports Background token', () => {
    expect(Colors.background).toBe('#0A0A0F');
  });

  it('exports Accent token', () => {
    expect(Colors.accent).toBe('#7C3AED');
  });

  it('exports textPrimary token', () => {
    expect(Colors.textPrimary).toBe('#F9FAFB');
  });

  it('exports font size body', () => {
    expect(Typography.body.fontSize).toBe(16);
  });

  it('exports spacing values', () => {
    expect(typeof Spacing.md).toBe('number');
  });

  it('exports border radii', () => {
    expect(typeof Radii.card).toBe('number');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd mobile && npx jest __tests__/constants/theme.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '../../src/constants/theme'"

- [ ] **Step 3: Implement `mobile/src/constants/theme.ts`**

```typescript
export const Colors = {
  background: '#0A0A0F',
  surface: '#13131A',
  surface2: '#1C1C27',
  accent: '#7C3AED',
  accentGlow: '#7C3AED33',
  accentLight: '#A78BFA',
  success: '#10B981',
  error: '#EF4444',
  textPrimary: '#F9FAFB',
  textSecondary: '#6B7280',
  border: '#ffffff0D',
} as const;

export const Typography = {
  heading1: { fontSize: 40, fontWeight: '800' as const, color: Colors.textPrimary },
  heading2: { fontSize: 28, fontWeight: '700' as const, color: Colors.textPrimary },
  body: { fontSize: 16, fontWeight: '400' as const, color: Colors.textPrimary },
  bodySecondary: { fontSize: 16, fontWeight: '400' as const, color: Colors.textSecondary },
  transcript: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22, color: Colors.textPrimary },
  label: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radii = {
  button: 14,
  input: 12,
  card: 20,
  chip: 8,
  orb: 9999,
} as const;

export const Shadows = {
  accent: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd mobile && npx jest __tests__/constants/theme.test.ts --no-coverage
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/src/constants/theme.ts mobile/__tests__/constants/theme.test.ts
git commit -m "feat: add design tokens (Colors, Typography, Spacing, Radii)"
```

---

### Task 3: Shared Types

**Files:**
- Create: `mobile/src/types.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/types.test.ts`:

```typescript
import type { SettingsState, SessionHistoryEntry } from '../../src/types';
import type { UserLevel, ConversationTopic } from '../../src/features/session/types';

describe('shared types', () => {
  it('SettingsState has required fields', () => {
    const s: SettingsState = {
      defaultLevel: 'B1',
      defaultTopic: 'livre',
      preferredVoiceId: 'DMcOknq8n1B6XshFIJKJ',
    };
    expect(s.defaultLevel).toBe('B1');
  });

  it('SessionHistoryEntry has required fields', () => {
    const entry: SessionHistoryEntry = {
      id: '1',
      roomName: 'room-abc',
      level: 'A2',
      topic: 'viagens',
      startedAt: 1714000000,
      durationSeconds: 300,
      transcript: [],
    };
    expect(entry.level).toBe('A2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd mobile && npx jest __tests__/types.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '../../src/types'"

- [ ] **Step 3: Implement `mobile/src/types.ts`**

```typescript
import type { UserLevel, ConversationTopic, TranscriptEntry } from './features/session/types';

export interface SettingsState {
  defaultLevel: UserLevel;
  defaultTopic: ConversationTopic;
  preferredVoiceId: string;
}

export const DEFAULT_SETTINGS: SettingsState = {
  defaultLevel: 'B1',
  defaultTopic: 'livre',
  preferredVoiceId: 'DMcOknq8n1B6XshFIJKJ',
};

export interface SessionHistoryEntry {
  id: string;
  roomName: string;
  level: UserLevel;
  topic: ConversationTopic;
  startedAt: number;
  durationSeconds: number;
  transcript: TranscriptEntry[];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd mobile && npx jest __tests__/types.test.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/src/types.ts mobile/__tests__/types.test.ts
git commit -m "feat: add shared types (SettingsState, SessionHistoryEntry)"
```

---

### Task 4: Storage Service

**Files:**
- Create: `mobile/src/services/storage.ts`
- Create: `mobile/__tests__/services/storage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/services/storage.test.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveAuthToken,
  getAuthToken,
  clearAuth,
  saveSettings,
  getSettings,
  saveSession,
  getSessions,
  getOrCreateDeviceId,
} from '../../src/services/storage';
import { DEFAULT_SETTINGS } from '../../src/types';

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.clear as jest.Mock).mockResolvedValue(undefined);
});

describe('auth storage', () => {
  it('saves and retrieves auth token', async () => {
    (AsyncStorage.multiSet as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
      ['auth_token', 'tok123'],
      ['auth_username', 'angel'],
    ]);
    await saveAuthToken('tok123', 'angel');
    const result = await getAuthToken();
    expect(result).toEqual({ token: 'tok123', username: 'angel' });
  });

  it('returns null when no token stored', async () => {
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
      ['auth_token', null],
      ['auth_username', null],
    ]);
    const result = await getAuthToken();
    expect(result).toBeNull();
  });

  it('clears auth keys', async () => {
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
    await clearAuth();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['auth_token', 'auth_username']);
  });
});

describe('settings storage', () => {
  it('returns defaults when nothing stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const s = await getSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it('saves and returns settings', async () => {
    const custom = { defaultLevel: 'C1', defaultTopic: 'trabalho', preferredVoiceId: 'abc' };
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(custom));
    await saveSettings(custom as any);
    const result = await getSettings();
    expect(result.defaultLevel).toBe('C1');
  });
});

describe('session history storage', () => {
  it('appends a session entry', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await saveSession({
      id: 'abc',
      roomName: 'room-1',
      level: 'B1',
      topic: 'comida',
      startedAt: 1714000000,
      durationSeconds: 120,
      transcript: [],
    });
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('returns empty array when no sessions stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const sessions = await getSessions();
    expect(sessions).toEqual([]);
  });
});

describe('device id', () => {
  it('creates and persists device id on first call', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    const id = await getOrCreateDeviceId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(8);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('device_id', id);
  });

  it('returns existing device id on subsequent calls', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('existing-device-id');
    const id = await getOrCreateDeviceId();
    expect(id).toBe('existing-device-id');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd mobile && npx jest __tests__/services/storage.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '../../src/services/storage'"

- [ ] **Step 3: Implement `mobile/src/services/storage.ts`**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, type SessionHistoryEntry, type SettingsState } from '../types';

const KEYS = {
  authToken: 'auth_token',
  authUsername: 'auth_username',
  deviceId: 'device_id',
  settings: 'settings',
  sessions: 'sessions',
} as const;

export async function saveAuthToken(token: string, username: string): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.authToken, token],
    [KEYS.authUsername, username],
  ]);
}

export async function getAuthToken(): Promise<{ token: string; username: string } | null> {
  const pairs = await AsyncStorage.multiGet([KEYS.authToken, KEYS.authUsername]);
  const token = pairs[0][1];
  const username = pairs[1][1];
  if (!token || !username) return null;
  return { token, username };
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.authToken, KEYS.authUsername]);
}

export async function saveSettings(settings: SettingsState): Promise<void> {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

export async function getSettings(): Promise<SettingsState> {
  const raw = await AsyncStorage.getItem(KEYS.settings);
  if (!raw) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}

export async function saveSession(entry: SessionHistoryEntry): Promise<void> {
  const existing = await getSessions();
  const updated = [entry, ...existing];
  await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(updated));
}

export async function getSessions(): Promise<SessionHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.sessions);
  if (!raw) return [];
  return JSON.parse(raw) as SessionHistoryEntry[];
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEYS.deviceId);
  if (existing) return existing;
  const { v4: uuidv4 } = await import('uuid');
  const id = uuidv4();
  await AsyncStorage.setItem(KEYS.deviceId, id);
  return id;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd mobile && npx jest __tests__/services/storage.test.ts --no-coverage
```

Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/src/services/storage.ts mobile/__tests__/services/storage.test.ts
git commit -m "feat: add storage service (auth, settings, sessions, device id)"
```

---

### Task 5: API Service

**Files:**
- Create: `mobile/src/services/api.ts`
- Create: `mobile/__tests__/services/api.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/services/api.test.ts`:

```typescript
import { createSession, translate, voicePreview } from '../../src/services/api';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const BASE = 'http://localhost:8000';
process.env.EXPO_PUBLIC_BACKEND_URL = BASE;

const TOKEN = 'test-token';

beforeEach(() => {
  mockFetch.mockReset();
});

describe('createSession', () => {
  it('posts to /session and returns LiveKitSessionData', async () => {
    const data = { roomName: 'room-1', token: 'lk-tok', livekitUrl: 'wss://test' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => data,
    });
    const result = await createSession({ level: 'B1', topic: 'livre' }, TOKEN);
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/session`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      })
    );
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ detail: 'Unauthorized' }) });
    await expect(createSession({ level: 'A1', topic: 'comida' }, TOKEN)).rejects.toThrow('Unauthorized');
  });
});

describe('translate', () => {
  it('posts to /translate and returns translated string', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ translation: 'house' }) });
    const result = await translate('casa', TOKEN);
    expect(result).toBe('house');
  });
});

describe('voicePreview', () => {
  it('posts to /voice-preview and returns ArrayBuffer', async () => {
    const buf = new ArrayBuffer(8);
    mockFetch.mockResolvedValue({ ok: true, arrayBuffer: async () => buf });
    const result = await voicePreview('voice-id-1', TOKEN);
    expect(result).toBe(buf);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd mobile && npx jest __tests__/services/api.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '../../src/services/api'"

- [ ] **Step 3: Implement `mobile/src/services/api.ts`**

```typescript
import type { SessionConfig, LiveKitSessionData } from '../features/session/types';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

function headers(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(APP_TOKEN ? { 'X-App-Token': APP_TOKEN } : {}),
  };
}

async function checkResponse(res: Response): Promise<Response> {
  if (res.ok) return res;
  let detail = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body?.detail) detail = body.detail;
  } catch {
    // ignore parse errors
  }
  throw new Error(detail);
}

export async function createSession(
  config: SessionConfig,
  token: string
): Promise<LiveKitSessionData> {
  const res = await fetch(`${BASE_URL}/session`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(config),
  });
  await checkResponse(res);
  return res.json();
}

export async function translate(word: string, token: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/translate`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ word }),
  });
  await checkResponse(res);
  const data = await res.json();
  return data.translation as string;
}

export async function voicePreview(voiceId: string, token: string): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE_URL}/voice-preview`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ voice_id: voiceId }),
  });
  await checkResponse(res);
  return res.arrayBuffer();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd mobile && npx jest __tests__/services/api.test.ts --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/src/services/api.ts mobile/__tests__/services/api.test.ts
git commit -m "feat: add API service (createSession, translate, voicePreview)"
```

---

### Task 6: LiveKit Stub Service

**Files:**
- Create: `mobile/src/services/livekit.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/services/livekit.test.ts`:

```typescript
import { connect, disconnect, onTranscript } from '../../src/services/livekit';

jest.useFakeTimers();

describe('LiveKit stub', () => {
  it('connect returns a MockRoom object', async () => {
    const room = await connect({ roomName: 'r1', token: 'tok', livekitUrl: 'wss://x' });
    expect(room).toBeDefined();
    expect(room.roomName).toBe('r1');
    disconnect(room);
  });

  it('fires mock transcript entries via onTranscript callback', async () => {
    const room = await connect({ roomName: 'r2', token: 'tok', livekitUrl: 'wss://x' });
    const entries: any[] = [];
    onTranscript(room, (e) => entries.push(e));
    jest.advanceTimersByTime(6000);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries[0].speaker).toBe('tutor');
    disconnect(room);
  });

  it('disconnect stops the timer', async () => {
    const room = await connect({ roomName: 'r3', token: 'tok', livekitUrl: 'wss://x' });
    const entries: any[] = [];
    onTranscript(room, (e) => entries.push(e));
    disconnect(room);
    jest.advanceTimersByTime(10000);
    expect(entries.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd mobile && npx jest __tests__/services/livekit.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '../../src/services/livekit'"

- [ ] **Step 3: Implement `mobile/src/services/livekit.ts`**

```typescript
import type { LiveKitSessionData, TranscriptEntry } from '../features/session/types';

export interface MockRoom {
  roomName: string;
  _timerId: ReturnType<typeof setInterval> | null;
  _callbacks: Array<(entry: TranscriptEntry) => void>;
}

const MOCK_SCRIPT: Array<{ speaker: 'tutor' | 'user'; text: string }> = [
  { speaker: 'tutor', text: 'Olá! Bem-vindo à tua sessão de prática. Como estás hoje?' },
  { speaker: 'user', text: 'Estou bem, obrigado. Quero praticar vocabulário de viagens.' },
  { speaker: 'tutor', text: 'Óptimo! Vamos começar. O que levas normalmente quando viajas?' },
];

export async function connect(data: LiveKitSessionData): Promise<MockRoom> {
  return {
    roomName: data.roomName,
    _timerId: null,
    _callbacks: [],
  };
}

export function disconnect(room: MockRoom): void {
  if (room._timerId !== null) {
    clearInterval(room._timerId);
    room._timerId = null;
  }
  room._callbacks = [];
}

export function onTranscript(
  room: MockRoom,
  cb: (entry: TranscriptEntry) => void
): void {
  room._callbacks.push(cb);
  let index = 0;
  room._timerId = setInterval(() => {
    if (index >= MOCK_SCRIPT.length) {
      if (room._timerId !== null) clearInterval(room._timerId);
      return;
    }
    const script = MOCK_SCRIPT[index];
    const entry: TranscriptEntry = {
      id: `mock-${index}`,
      speaker: script.speaker,
      text: script.text,
      timestamp: Date.now(),
      hasCorrection: false,
    };
    room._callbacks.forEach((fn) => fn(entry));
    index++;
  }, 1500);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd mobile && npx jest __tests__/services/livekit.test.ts --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/src/services/livekit.ts mobile/__tests__/services/livekit.test.ts
git commit -m "feat: add LiveKit stub service (fires mock transcript on timer)"
```

---

### Task 7: AuthContext

**Files:**
- Create: `mobile/src/contexts/AuthContext.tsx`
- Create: `mobile/__tests__/contexts/AuthContext.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/contexts/AuthContext.test.tsx`:

```typescript
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import * as storage from '../../src/services/storage';
import * as api from '../../src/services/api';

jest.mock('../../src/services/storage');
jest.mock('../../src/services/api');

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (storage.getAuthToken as jest.Mock).mockResolvedValue(null);
    (storage.getOrCreateDeviceId as jest.Mock).mockResolvedValue('device-123');
  });

  it('starts with null token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.token).toBeNull();
    expect(result.current.username).toBeNull();
  });

  it('login saves token and updates state', async () => {
    (storage.saveAuthToken as jest.Mock).mockResolvedValue(undefined);
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok-xyz', username: 'angel' }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await result.current.login('pass123');
    });
    expect(result.current.token).toBe('tok-xyz');
    expect(result.current.username).toBe('angel');
    expect(storage.saveAuthToken).toHaveBeenCalledWith('tok-xyz', 'angel');
  });

  it('register saves token and updates state', async () => {
    (storage.saveAuthToken as jest.Mock).mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok-new', username: 'newuser' }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await result.current.register('newuser', 'pass123');
    });
    expect(result.current.token).toBe('tok-new');
  });

  it('logout clears storage and resets state', async () => {
    (storage.clearAuth as jest.Mock).mockResolvedValue(undefined);
    (storage.getAuthToken as jest.Mock).mockResolvedValue({ token: 'existing', username: 'u' });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.token).toBeNull();
    expect(storage.clearAuth).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd mobile && npx jest __tests__/contexts/AuthContext.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '../../src/contexts/AuthContext'"

- [ ] **Step 3: Implement `mobile/src/contexts/AuthContext.tsx`**

```typescript
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getAuthToken, saveAuthToken, clearAuth, getOrCreateDeviceId } from '../services/storage';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

interface AuthState {
  token: string | null;
  username: string | null;
}

interface AuthContextValue extends AuthState {
  login: (password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, username: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAuthToken()
      .then((stored) => {
        if (stored) setState({ token: stored.token, username: stored.username });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (password: string) => {
    const deviceId = await getOrCreateDeviceId();
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.detail ?? `HTTP ${res.status}`);
    }
    const data: { token: string; username: string } = await res.json();
    await saveAuthToken(data.token, data.username);
    setState({ token: data.token, username: data.username });
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const deviceId = await getOrCreateDeviceId();
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.detail ?? `HTTP ${res.status}`);
    }
    const data: { token: string; username: string } = await res.json();
    await saveAuthToken(data.token, data.username);
    setState({ token: data.token, username: data.username });
  }, []);

  const logout = useCallback(async () => {
    await clearAuth();
    setState({ token: null, username: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd mobile && npx jest __tests__/contexts/AuthContext.test.tsx --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/src/contexts/AuthContext.tsx mobile/__tests__/contexts/AuthContext.test.tsx
git commit -m "feat: add AuthContext (login, register, logout, token persistence)"
```

---

### Task 8: SettingsContext

**Files:**
- Create: `mobile/src/contexts/SettingsContext.tsx`
- Create: `mobile/__tests__/contexts/SettingsContext.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/contexts/SettingsContext.test.tsx`:

```typescript
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { SettingsProvider, useSettings } from '../../src/contexts/SettingsContext';
import * as storage from '../../src/services/storage';
import { DEFAULT_SETTINGS } from '../../src/types';

jest.mock('../../src/services/storage');

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

describe('SettingsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (storage.getSettings as jest.Mock).mockResolvedValue({ ...DEFAULT_SETTINGS });
    (storage.saveSettings as jest.Mock).mockResolvedValue(undefined);
  });

  it('loads defaults from storage on mount', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});
    expect(result.current.settings.defaultLevel).toBe('B1');
    expect(result.current.settings.preferredVoiceId).toBe('DMcOknq8n1B6XshFIJKJ');
  });

  it('updateSetting changes a single field and persists it', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await result.current.updateSetting('defaultLevel', 'C2');
    });
    expect(result.current.settings.defaultLevel).toBe('C2');
    expect(storage.saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ defaultLevel: 'C2' })
    );
  });

  it('does not mutate previous settings object', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {});
    const before = result.current.settings;
    await act(async () => {
      await result.current.updateSetting('defaultTopic', 'viagens');
    });
    expect(before.defaultTopic).toBe('livre');
    expect(result.current.settings.defaultTopic).toBe('viagens');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd mobile && npx jest __tests__/contexts/SettingsContext.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '../../src/contexts/SettingsContext'"

- [ ] **Step 3: Implement `mobile/src/contexts/SettingsContext.tsx`**

```typescript
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type SettingsState } from '../types';
import { getSettings, saveSettings } from '../services/storage';

interface SettingsContextValue {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>({ ...DEFAULT_SETTINGS });

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const updateSetting = useCallback(
    async <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      await saveSettings(updated);
    },
    [settings]
  );

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd mobile && npx jest __tests__/contexts/SettingsContext.test.tsx --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/src/contexts/SettingsContext.tsx mobile/__tests__/contexts/SettingsContext.test.tsx
git commit -m "feat: add SettingsContext (load, update, persist settings)"
```

---

### Task 9: SessionContext

**Files:**
- Create: `mobile/src/contexts/SessionContext.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/contexts/SessionContext.test.tsx`:

```typescript
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { SessionProvider, useSession } from '../../src/contexts/SessionContext';
import * as api from '../../src/services/api';
import * as livekit from '../../src/services/livekit';
import * as storage from '../../src/services/storage';

jest.mock('../../src/services/api');
jest.mock('../../src/services/livekit');
jest.mock('../../src/services/storage');

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider token="test-tok">{children}</SessionProvider>
);

describe('SessionContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.createSession as jest.Mock).mockResolvedValue({
      roomName: 'room-1', token: 'lk-tok', livekitUrl: 'wss://x',
    });
    (livekit.connect as jest.Mock).mockResolvedValue({ roomName: 'room-1', _timerId: null, _callbacks: [] });
    (livekit.onTranscript as jest.Mock).mockImplementation(() => {});
    (livekit.disconnect as jest.Mock).mockImplementation(() => {});
    (storage.saveSession as jest.Mock).mockResolvedValue(undefined);
  });

  it('starts with idle status', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current.status).toBe('idle');
    expect(result.current.transcript).toEqual([]);
  });

  it('startSession transitions to connecting then active', async () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {
      await result.current.startSession({ level: 'B1', topic: 'livre' });
    });
    expect(result.current.status).toBe('active');
    expect(result.current.livekitData?.roomName).toBe('room-1');
  });

  it('endSession transitions to ended', async () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => {
      await result.current.startSession({ level: 'B1', topic: 'livre' });
    });
    await act(async () => {
      await result.current.endSession();
    });
    expect(result.current.status).toBe('ended');
  });

  it('setError transitions to error status', () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => {
      result.current.setError('connection failed');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('connection failed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd mobile && npx jest __tests__/contexts/SessionContext.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '../../src/contexts/SessionContext'"

- [ ] **Step 3: Implement `mobile/src/contexts/SessionContext.tsx`**

```typescript
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { SessionConfig, SessionStatus, TranscriptEntry, LiveKitSessionData } from '../features/session/types';
import { createSession as apiCreateSession } from '../services/api';
import { connect, disconnect, onTranscript, type MockRoom } from '../services/livekit';
import { saveSession } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';

interface SessionState {
  status: SessionStatus;
  transcript: TranscriptEntry[];
  config: SessionConfig | null;
  livekitData: LiveKitSessionData | null;
  error: string | null;
}

interface SessionContextValue extends SessionState {
  startSession: (config: SessionConfig) => Promise<void>;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  endSession: () => Promise<void>;
  setError: (message: string) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  token,
}: {
  children: React.ReactNode;
  token: string | null;
}) {
  const [state, setState] = useState<SessionState>({
    status: 'idle',
    transcript: [],
    config: null,
    livekitData: null,
    error: null,
  });
  const roomRef = useRef<MockRoom | null>(null);
  const startedAtRef = useRef<number>(0);

  const addTranscriptEntry = useCallback((entry: TranscriptEntry) => {
    setState((prev) => ({ ...prev, transcript: [...prev.transcript, entry] }));
  }, []);

  const startSession = useCallback(
    async (config: SessionConfig) => {
      if (!token) throw new Error('Not authenticated');
      setState((prev) => ({ ...prev, status: 'connecting', config, transcript: [], error: null }));
      try {
        const data = await apiCreateSession(config, token);
        const room = await connect(data);
        roomRef.current = room;
        startedAtRef.current = Date.now();
        onTranscript(room, (entry) =>
          setState((prev) => ({ ...prev, transcript: [...prev.transcript, entry] }))
        );
        setState((prev) => ({ ...prev, status: 'active', livekitData: data }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    },
    [token]
  );

  const endSession = useCallback(async () => {
    if (roomRef.current) {
      disconnect(roomRef.current);
      roomRef.current = null;
    }
    setState((prev) => {
      if (prev.config && prev.livekitData) {
        const entry = {
          id: uuidv4(),
          roomName: prev.livekitData.roomName,
          level: prev.config.level,
          topic: prev.config.topic,
          startedAt: startedAtRef.current,
          durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
          transcript: prev.transcript,
        };
        saveSession(entry).catch(() => {});
      }
      return { ...prev, status: 'ended' };
    });
  }, []);

  const setError = useCallback((message: string) => {
    setState((prev) => ({ ...prev, status: 'error', error: message }));
  }, []);

  return (
    <SessionContext.Provider
      value={{ ...state, startSession, addTranscriptEntry, endSession, setError }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd mobile && npx jest __tests__/contexts/SessionContext.test.tsx --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/src/contexts/SessionContext.tsx mobile/__tests__/contexts/SessionContext.test.tsx
git commit -m "feat: add SessionContext (start/end session, transcript, LiveKit stub)"
```

---

### Task 10: Base UI Components

**Files:**
- Create: `mobile/src/components/PrimaryButton.tsx`
- Create: `mobile/src/components/LevelChip.tsx`
- Create: `mobile/src/components/TopicCard.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/components/BaseComponents.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { LevelChip } from '../../src/components/LevelChip';
import { TopicCard } from '../../src/components/TopicCard';

describe('PrimaryButton', () => {
  it('renders label and calls onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PrimaryButton label="Iniciar" onPress={onPress} />);
    fireEvent.press(getByText('Iniciar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when loading=true', () => {
    const { getByTestId } = render(
      <PrimaryButton label="Iniciar" onPress={jest.fn()} loading={true} />
    );
    expect(getByTestId('button-loading')).toBeTruthy();
  });

  it('is disabled when disabled=true', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PrimaryButton label="Go" onPress={onPress} disabled={true} />);
    fireEvent.press(getByText('Go'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('LevelChip', () => {
  it('renders level text', () => {
    const { getByText } = render(<LevelChip level="B2" selected={false} onPress={jest.fn()} />);
    expect(getByText('B2')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<LevelChip level="A1" selected={false} onPress={onPress} />);
    fireEvent.press(getByText('A1'));
    expect(onPress).toHaveBeenCalledWith('A1');
  });
});

describe('TopicCard', () => {
  it('renders topic label', () => {
    const { getByText } = render(
      <TopicCard topic="viagens" label="Viagens" icon="✈️" selected={false} onPress={jest.fn()} />
    );
    expect(getByText('Viagens')).toBeTruthy();
  });

  it('calls onPress with topic when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <TopicCard topic="comida" label="Comida" icon="🍽️" selected={false} onPress={onPress} />
    );
    fireEvent.press(getByText('Comida'));
    expect(onPress).toHaveBeenCalledWith('comida');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd mobile && npx jest __tests__/components/BaseComponents.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '../../src/components/PrimaryButton'"

- [ ] **Step 3: Implement `mobile/src/components/PrimaryButton.tsx`**

```typescript
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Colors, Radii, Shadows } from '../constants/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'destructive';
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const isDestructive = variant === 'destructive';
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={[
        styles.button,
        isDestructive ? styles.destructive : styles.primary,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator testID="button-loading" color={Colors.textPrimary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    ...Shadows.accent,
  },
  primary: { backgroundColor: Colors.accent },
  destructive: { backgroundColor: Colors.error },
  disabled: { opacity: 0.4 },
  label: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 4: Implement `mobile/src/components/LevelChip.tsx`**

```typescript
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { UserLevel } from '../features/session/types';
import { Colors, Radii } from '../constants/theme';

interface LevelChipProps {
  level: UserLevel;
  selected: boolean;
  onPress: (level: UserLevel) => void;
}

export function LevelChip({ level, selected, onPress }: LevelChipProps) {
  return (
    <Pressable
      onPress={() => onPress(level)}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{level}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.chip,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  selected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  label: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  selectedLabel: { color: Colors.textPrimary },
});
```

- [ ] **Step 5: Implement `mobile/src/components/TopicCard.tsx`**

```typescript
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ConversationTopic } from '../features/session/types';
import { Colors, Radii } from '../constants/theme';

interface TopicCardProps {
  topic: ConversationTopic;
  label: string;
  icon: string;
  selected: boolean;
  onPress: (topic: ConversationTopic) => void;
}

export function TopicCard({ topic, label, icon, selected, onPress }: TopicCardProps) {
  return (
    <Pressable
      onPress={() => onPress(topic)}
      style={[styles.card, selected && styles.selected]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '30%',
    aspectRatio: 1,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  selected: { borderColor: Colors.accent, backgroundColor: Colors.surface2 },
  icon: { fontSize: 28 },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  selectedLabel: { color: Colors.accentLight },
});
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd mobile && npx jest __tests__/components/BaseComponents.test.tsx --no-coverage
```

Expected: PASS (7 tests)

- [ ] **Step 7: Commit**

```bash
git add mobile/src/components/PrimaryButton.tsx mobile/src/components/LevelChip.tsx mobile/src/components/TopicCard.tsx mobile/__tests__/components/BaseComponents.test.tsx
git commit -m "feat: add PrimaryButton, LevelChip, TopicCard components"
```

---

### Task 11: VoiceOrb and TranscriptBubble

**Files:**
- Create: `mobile/src/components/VoiceOrb.tsx`
- Create: `mobile/src/components/TranscriptBubble.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/components/VoiceComponents.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { VoiceOrb } from '../../src/components/VoiceOrb';
import { TranscriptBubble } from '../../src/components/TranscriptBubble';

describe('VoiceOrb', () => {
  it('renders with idle state', () => {
    const { getByTestId } = render(<VoiceOrb state="idle" />);
    expect(getByTestId('voice-orb')).toBeTruthy();
  });

  it('renders with active state', () => {
    const { getByTestId } = render(<VoiceOrb state="active" />);
    expect(getByTestId('voice-orb')).toBeTruthy();
  });

  it('renders with connecting state', () => {
    const { getByTestId } = render(<VoiceOrb state="connecting" />);
    expect(getByTestId('voice-orb')).toBeTruthy();
  });
});

describe('TranscriptBubble', () => {
  it('renders user entry right-aligned', () => {
    const { getByText } = render(
      <TranscriptBubble
        entry={{ id: '1', speaker: 'user', text: 'Olá', timestamp: 0, hasCorrection: false }}
      />
    );
    expect(getByText('Olá')).toBeTruthy();
  });

  it('renders tutor entry with name label', () => {
    const { getByText } = render(
      <TranscriptBubble
        entry={{ id: '2', speaker: 'tutor', text: 'Bem-vindo!', timestamp: 0, hasCorrection: false }}
      />
    );
    expect(getByText('Bem-vindo!')).toBeTruthy();
    expect(getByText('Tutor')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd mobile && npx jest __tests__/components/VoiceComponents.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '../../src/components/VoiceOrb'"

- [ ] **Step 3: Implement `mobile/src/components/VoiceOrb.tsx`**

```typescript
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';

type OrbState = 'idle' | 'connecting' | 'active' | 'user_speaking' | 'tutor_speaking';

interface VoiceOrbProps {
  state: OrbState;
}

export function VoiceOrb({ state }: VoiceOrbProps) {
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const ring3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const duration = state === 'user_speaking' ? 600 : state === 'tutor_speaking' ? 900 : 1400;
    const scale = state === 'user_speaking' ? 1.6 : state === 'tutor_speaking' ? 1.4 : 1.2;

    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: scale, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        ])
      );

    const a1 = pulse(ring1, 0);
    const a2 = pulse(ring2, duration / 3);
    const a3 = pulse(ring3, (duration * 2) / 3);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [state, ring1, ring2, ring3]);

  return (
    <View testID="voice-orb" style={styles.container}>
      <Animated.View style={[styles.ring, { transform: [{ scale: ring3 }] }]} />
      <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: ring2 }] }]} />
      <Animated.View style={[styles.ring, styles.ring1, { transform: [{ scale: ring1 }] }]} />
      <View style={styles.orb} />
    </View>
  );
}

const ORB_SIZE = 120;

const styles = StyleSheet.create({
  container: { width: ORB_SIZE * 2, height: ORB_SIZE * 2, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: ORB_SIZE * 1.8,
    height: ORB_SIZE * 1.8,
    borderRadius: ORB_SIZE,
    backgroundColor: Colors.accentGlow,
  },
  ring1: { width: ORB_SIZE * 1.5, height: ORB_SIZE * 1.5 },
  ring2: { width: ORB_SIZE * 1.65, height: ORB_SIZE * 1.65 },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: Colors.accent,
  },
});
```

- [ ] **Step 4: Implement `mobile/src/components/TranscriptBubble.tsx`**

```typescript
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TranscriptEntry } from '../features/session/types';
import { Colors, Radii, Spacing } from '../constants/theme';

interface TranscriptBubbleProps {
  entry: TranscriptEntry;
}

export function TranscriptBubble({ entry }: TranscriptBubbleProps) {
  const isUser = entry.speaker === 'user';
  return (
    <View style={[styles.wrapper, isUser ? styles.wrapperRight : styles.wrapperLeft]}>
      {!isUser && <Text style={styles.tutorLabel}>Tutor</Text>}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.tutorBubble]}>
        <Text style={[styles.text, entry.hasCorrection && styles.correction]}>{entry.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: Spacing.xs, maxWidth: '80%' },
  wrapperLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  wrapperRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  tutorLabel: { color: Colors.accentLight, fontSize: 11, fontWeight: '600', marginBottom: 2, marginLeft: 4 },
  bubble: {
    borderRadius: Radii.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  userBubble: { backgroundColor: Colors.surface2 },
  tutorBubble: { backgroundColor: Colors.surface },
  text: { color: Colors.textPrimary, fontSize: 15, fontWeight: '500', lineHeight: 22 },
  correction: { color: Colors.success },
});
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd mobile && npx jest __tests__/components/VoiceComponents.test.tsx --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/VoiceOrb.tsx mobile/src/components/TranscriptBubble.tsx mobile/__tests__/components/VoiceComponents.test.tsx
git commit -m "feat: add VoiceOrb (animated rings) and TranscriptBubble components"
```

---

### Task 12: Root Layout and Auth Gate

**Files:**
- Create: `mobile/app/_layout.tsx`
- Create: `mobile/app/(auth)/_layout.tsx`

- [ ] **Step 1: Implement `mobile/app/_layout.tsx`**

```typescript
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { SettingsProvider } from '../src/contexts/SettingsContext';

function AuthGate() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!token && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (token && inAuth) {
      router.replace('/(tabs)');
    }
  }, [token, isLoading, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <StatusBar style="light" />
        <AuthGate />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0F' } }} />
      </SettingsProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Implement `mobile/app/(auth)/_layout.tsx`**

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0F' },
        animation: 'fade',
      }}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/app/_layout.tsx mobile/app/(auth)/_layout.tsx
git commit -m "feat: add root layout with auth gate (token check → redirect)"
```

---

### Task 13: Auth Screens

**Files:**
- Create: `mobile/app/(auth)/welcome.tsx`
- Create: `mobile/app/(auth)/register.tsx`
- Create: `mobile/app/(auth)/login.tsx`
- Create: `mobile/__tests__/screens/RegisterScreen.test.tsx`
- Create: `mobile/__tests__/screens/LoginScreen.test.tsx`

- [ ] **Step 1: Write the failing register test**

Create `mobile/__tests__/screens/RegisterScreen.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../../src/contexts/AuthContext';
import RegisterScreen from '../../app/(auth)/register';

jest.mock('../../src/services/storage', () => ({
  getAuthToken: jest.fn().mockResolvedValue(null),
  saveAuthToken: jest.fn().mockResolvedValue(undefined),
  getOrCreateDeviceId: jest.fn().mockResolvedValue('dev-id'),
}));
jest.mock('expo-router');

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('RegisterScreen', () => {
  it('renders username and password inputs', () => {
    const { getByPlaceholderText } = render(<RegisterScreen />, { wrapper });
    expect(getByPlaceholderText('Nome de utilizador')).toBeTruthy();
    expect(getByPlaceholderText('Palavra-passe')).toBeTruthy();
  });

  it('shows validation error for short username', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />, { wrapper });
    fireEvent.changeText(getByPlaceholderText('Nome de utilizador'), 'a');
    fireEvent.changeText(getByPlaceholderText('Palavra-passe'), 'pass1234');
    fireEvent.press(getByText('Registar'));
    await waitFor(() => {
      expect(getByText(/mínimo 2 caracteres/i)).toBeTruthy();
    });
  });

  it('shows validation error for short password', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />, { wrapper });
    fireEvent.changeText(getByPlaceholderText('Nome de utilizador'), 'angel');
    fireEvent.changeText(getByPlaceholderText('Palavra-passe'), 'ab');
    fireEvent.press(getByText('Registar'));
    await waitFor(() => {
      expect(getByText(/mínimo 4 caracteres/i)).toBeTruthy();
    });
  });

  it('calls register on valid submission', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok', username: 'angel' }),
    });
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />, { wrapper });
    fireEvent.changeText(getByPlaceholderText('Nome de utilizador'), 'angel');
    fireEvent.changeText(getByPlaceholderText('Palavra-passe'), 'pass1234');
    fireEvent.press(getByText('Registar'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Write the failing login test**

Create `mobile/__tests__/screens/LoginScreen.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../../src/contexts/AuthContext';
import LoginScreen from '../../app/(auth)/login';

jest.mock('../../src/services/storage', () => ({
  getAuthToken: jest.fn().mockResolvedValue(null),
  saveAuthToken: jest.fn().mockResolvedValue(undefined),
  getOrCreateDeviceId: jest.fn().mockResolvedValue('dev-id'),
}));
jest.mock('expo-router');

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('LoginScreen', () => {
  it('renders password input', () => {
    const { getByPlaceholderText } = render(<LoginScreen />, { wrapper });
    expect(getByPlaceholderText('Palavra-passe')).toBeTruthy();
  });

  it('shows validation error for short password', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />, { wrapper });
    fireEvent.changeText(getByPlaceholderText('Palavra-passe'), 'ab');
    fireEvent.press(getByText('Entrar'));
    await waitFor(() => {
      expect(getByText(/mínimo 4 caracteres/i)).toBeTruthy();
    });
  });

  it('calls login on valid submission', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok', username: 'angel' }),
    });
    const { getByPlaceholderText, getByText } = render(<LoginScreen />, { wrapper });
    fireEvent.changeText(getByPlaceholderText('Palavra-passe'), 'pass1234');
    fireEvent.press(getByText('Entrar'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd mobile && npx jest __tests__/screens/RegisterScreen.test.tsx __tests__/screens/LoginScreen.test.tsx --no-coverage
```

Expected: FAIL — screens don't exist yet

- [ ] **Step 4: Implement `mobile/app/(auth)/welcome.tsx`**

```typescript
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Colors, Spacing, Typography } from '../../src/constants/theme';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>🇵🇹</Text>
        <Text style={styles.heading}>Falando{'\n'}Português</Text>
        <Text style={styles.tagline}>Fala português como um nativo.</Text>
      </View>
      <View style={styles.actions}>
        <Link href="/(auth)/register" asChild>
          <PrimaryButton label="Criar conta" onPress={() => {}} />
        </Link>
        <Link href="/(auth)/login" style={styles.loginLink}>
          <Text style={styles.loginText}>Já tenho conta</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.xl },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  logo: { fontSize: 72 },
  heading: { ...Typography.heading1, textAlign: 'center', lineHeight: 48 },
  tagline: { ...Typography.bodySecondary, textAlign: 'center' },
  actions: { gap: Spacing.md, paddingBottom: Spacing.xl },
  loginLink: { alignSelf: 'center' },
  loginText: { color: Colors.accentLight, fontSize: 16 },
});
```

- [ ] **Step 5: Implement `mobile/app/(auth)/register.tsx`**

```typescript
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Colors, Radii, Spacing, Typography } from '../../src/constants/theme';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  async function handleRegister() {
    setError('');
    if (username.trim().length < 2) { setError('Nome de utilizador: mínimo 2 caracteres.'); return; }
    if (password.length < 4) { setError('Palavra-passe: mínimo 4 caracteres.'); return; }
    setLoading(true);
    try {
      await register(username.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Criar conta</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome de utilizador"
        placeholderTextColor={Colors.textSecondary}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Palavra-passe"
        placeholderTextColor={Colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Registar" onPress={handleRegister} loading={loading} />
      <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.link}>
        <Text style={styles.linkText}>Já tenho conta</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.xl, justifyContent: 'center', gap: Spacing.md },
  title: { ...Typography.heading2, marginBottom: Spacing.md },
  input: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  error: { color: Colors.error, fontSize: 14 },
  link: { alignSelf: 'center', marginTop: Spacing.sm },
  linkText: { color: Colors.accentLight, fontSize: 16 },
});
```

- [ ] **Step 6: Implement `mobile/app/(auth)/login.tsx`**

```typescript
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Colors, Radii, Spacing, Typography } from '../../src/constants/theme';

export default function LoginScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleLogin() {
    setError('');
    if (password.length < 4) { setError('Palavra-passe: mínimo 4 caracteres.'); return; }
    setLoading(true);
    try {
      await login(password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Entrar</Text>
      <TextInput
        style={styles.input}
        placeholder="Palavra-passe"
        placeholderTextColor={Colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Entrar" onPress={handleLogin} loading={loading} />
      <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.link}>
        <Text style={styles.linkText}>Criar conta</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.xl, justifyContent: 'center', gap: Spacing.md },
  title: { ...Typography.heading2, marginBottom: Spacing.md },
  input: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  error: { color: Colors.error, fontSize: 14 },
  link: { alignSelf: 'center', marginTop: Spacing.sm },
  linkText: { color: Colors.accentLight, fontSize: 16 },
});
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd mobile && npx jest __tests__/screens/RegisterScreen.test.tsx __tests__/screens/LoginScreen.test.tsx --no-coverage
```

Expected: PASS (7 tests total)

- [ ] **Step 8: Commit**

```bash
git add mobile/app/(auth)/ mobile/__tests__/screens/RegisterScreen.test.tsx mobile/__tests__/screens/LoginScreen.test.tsx
git commit -m "feat: add auth screens (welcome, register, login) with validation"
```

---

### Task 14: Tab Layout and Home Screen

**Files:**
- Create: `mobile/app/(tabs)/_layout.tsx`
- Create: `mobile/app/(tabs)/index.tsx`
- Create: `mobile/__tests__/screens/HomeScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/screens/HomeScreen.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { SettingsProvider } from '../../src/contexts/SettingsContext';
import HomeScreen from '../../app/(tabs)/index';

jest.mock('../../src/services/storage', () => ({
  getAuthToken: jest.fn().mockResolvedValue({ token: 'tok', username: 'angel' }),
  getSettings: jest.fn().mockResolvedValue({ defaultLevel: 'B1', defaultTopic: 'livre', preferredVoiceId: 'x' }),
  saveSettings: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/api');
jest.mock('../../src/services/livekit', () => ({
  connect: jest.fn().mockResolvedValue({ roomName: 'r1', _timerId: null, _callbacks: [] }),
  onTranscript: jest.fn(),
  disconnect: jest.fn(),
}));
jest.mock('expo-router');

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <SettingsProvider>{children}</SettingsProvider>
  </AuthProvider>
);

describe('HomeScreen', () => {
  it('renders level chips A1–C2', async () => {
    const { getByText } = render(<HomeScreen />, { wrapper });
    await waitFor(() => {
      expect(getByText('A1')).toBeTruthy();
      expect(getByText('C2')).toBeTruthy();
    });
  });

  it('renders greeting with username', async () => {
    const { getByText } = render(<HomeScreen />, { wrapper });
    await waitFor(() => {
      expect(getByText(/Olá/)).toBeTruthy();
    });
  });

  it('renders Iniciar sessão button', async () => {
    const { getByText } = render(<HomeScreen />, { wrapper });
    await waitFor(() => {
      expect(getByText('Iniciar sessão')).toBeTruthy();
    });
  });

  it('selecting a level updates selection state', async () => {
    const { getByText } = render(<HomeScreen />, { wrapper });
    await waitFor(() => expect(getByText('C1')).toBeTruthy());
    fireEvent.press(getByText('C1'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd mobile && npx jest __tests__/screens/HomeScreen.test.tsx --no-coverage
```

Expected: FAIL — screen doesn't exist

- [ ] **Step 3: Implement `mobile/app/(tabs)/_layout.tsx`**

```typescript
import { Tabs } from 'expo-router';
import { Colors } from '../../src/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
        },
        tabBarActiveTintColor: Colors.accentLight,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: () => null }} />
      <Tabs.Screen name="history" options={{ title: 'Historial', tabBarIcon: () => null }} />
      <Tabs.Screen name="settings" options={{ title: 'Definições', tabBarIcon: () => null }} />
    </Tabs>
  );
}
```

- [ ] **Step 4: Implement `mobile/app/(tabs)/index.tsx`**

```typescript
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSettings } from '../../src/contexts/SettingsContext';
import { SessionProvider, useSession } from '../../src/contexts/SessionContext';
import { LevelChip } from '../../src/components/LevelChip';
import { TopicCard } from '../../src/components/TopicCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import type { UserLevel, ConversationTopic } from '../../src/features/session/types';
import { Colors, Spacing, Typography } from '../../src/constants/theme';

const TOPICS: Array<{ topic: ConversationTopic; label: string; icon: string }> = [
  { topic: 'viagens', label: 'Viagens', icon: '✈️' },
  { topic: 'trabalho', label: 'Trabalho', icon: '💼' },
  { topic: 'familia', label: 'Família', icon: '👨‍👩‍👧' },
  { topic: 'comida', label: 'Comida', icon: '🍽️' },
  { topic: 'cultura', label: 'Cultura', icon: '🎭' },
  { topic: 'livre', label: 'Livre', icon: '💬' },
];

const LEVELS: UserLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function HomeContent() {
  const { username, token } = useAuth();
  const { settings } = useSettings();
  const { startSession } = useSession();
  const router = useRouter();
  const [level, setLevel] = useState<UserLevel>(settings.defaultLevel);
  const [topic, setTopic] = useState<ConversationTopic>(settings.defaultTopic);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStart() {
    setError('');
    setLoading(true);
    try {
      await startSession({ level, topic });
      router.push(`/session/${level}-${topic}-${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar sessão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Olá, {username ?? '—'}</Text>
      <Text style={styles.sectionTitle}>Nível</Text>
      <View style={styles.chips}>
        {LEVELS.map((l) => (
          <LevelChip key={l} level={l} selected={level === l} onPress={setLevel} />
        ))}
      </View>
      <Text style={styles.sectionTitle}>Tema</Text>
      <View style={styles.grid}>
        {TOPICS.map((t) => (
          <TopicCard key={t.topic} {...t} selected={topic === t.topic} onPress={setTopic} />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Iniciar sessão" onPress={handleStart} loading={loading} />
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { token } = useAuth();
  return (
    <SessionProvider token={token}>
      <HomeContent />
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxl },
  greeting: { ...Typography.heading2 },
  sectionTitle: { ...Typography.label, marginTop: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  error: { color: Colors.error, fontSize: 14 },
});
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd mobile && npx jest __tests__/screens/HomeScreen.test.tsx --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add mobile/app/(tabs)/_layout.tsx mobile/app/(tabs)/index.tsx mobile/__tests__/screens/HomeScreen.test.tsx
git commit -m "feat: add tab layout and Home screen (level + topic selector)"
```

---

### Task 15: Session Screen

**Files:**
- Create: `mobile/app/session/[roomName].tsx`
- Create: `mobile/__tests__/screens/SessionScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/screens/SessionScreen.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { SessionProvider } from '../../src/contexts/SessionContext';
import SessionScreen from '../../app/session/[roomName]';

jest.mock('../../src/services/storage', () => ({
  getAuthToken: jest.fn().mockResolvedValue({ token: 'tok', username: 'angel' }),
  saveSession: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/api', () => ({
  createSession: jest.fn().mockResolvedValue({ roomName: 'room-1', token: 'lk', livekitUrl: 'wss://x' }),
}));
jest.mock('../../src/services/livekit', () => ({
  connect: jest.fn().mockResolvedValue({ roomName: 'room-1', _timerId: null, _callbacks: [] }),
  onTranscript: jest.fn(),
  disconnect: jest.fn(),
}));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => ({ roomName: 'room-1' }),
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <SessionProvider token="test-tok">{children}</SessionProvider>
  </AuthProvider>
);

describe('SessionScreen', () => {
  it('renders the voice orb', () => {
    const { getByTestId } = render(<SessionScreen />, { wrapper });
    expect(getByTestId('voice-orb')).toBeTruthy();
  });

  it('renders Terminar sessão button', () => {
    const { getByText } = render(<SessionScreen />, { wrapper });
    expect(getByText('Terminar sessão')).toBeTruthy();
  });

  it('shows connecting status on mount', () => {
    const { getByText } = render(<SessionScreen />, { wrapper });
    expect(getByText(/conectando|connecting/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd mobile && npx jest __tests__/screens/SessionScreen.test.tsx --no-coverage
```

Expected: FAIL — screen doesn't exist

- [ ] **Step 3: Implement `mobile/app/session/[roomName].tsx`**

```typescript
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { SessionProvider, useSession } from '../../src/contexts/SessionContext';
import { useSettings } from '../../src/contexts/SettingsContext';
import { VoiceOrb } from '../../src/components/VoiceOrb';
import { TranscriptBubble } from '../../src/components/TranscriptBubble';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Colors, Spacing, Typography } from '../../src/constants/theme';
import type { UserLevel, ConversationTopic } from '../../src/features/session/types';

const STATUS_LABELS: Record<string, string> = {
  idle: 'Aguardando',
  connecting: 'Conectando…',
  active: 'Ativo',
  ended: 'Terminado',
  error: 'Erro',
};

function SessionContent() {
  const { roomName } = useLocalSearchParams<{ roomName: string }>();
  const router = useRouter();
  const { status, transcript, error, startSession, endSession } = useSession();
  const { settings } = useSettings();

  useEffect(() => {
    const parts = (roomName ?? '').split('-');
    const level = (parts[0] as UserLevel) || settings.defaultLevel;
    const topic = (parts[1] as ConversationTopic) || settings.defaultTopic;
    startSession({ level, topic });
  }, []);

  async function handleEnd() {
    await endSession();
    router.replace('/(tabs)');
  }

  const orbState =
    status === 'connecting' ? 'connecting' :
    status === 'active' ? 'active' : 'idle';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.roomLabel}>{roomName}</Text>
        <View style={[styles.pill, status === 'active' && styles.pillActive, status === 'error' && styles.pillError]}>
          <Text style={styles.pillText}>{STATUS_LABELS[status] ?? status}</Text>
        </View>
      </View>
      <View style={styles.orbContainer}>
        <VoiceOrb state={orbState} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView style={styles.transcript} contentContainerStyle={styles.transcriptContent}>
        {transcript.map((entry) => (
          <TranscriptBubble key={entry.id} entry={entry} />
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          label="Terminar sessão"
          onPress={handleEnd}
          variant="destructive"
          disabled={status === 'ended' || status === 'connecting'}
        />
      </View>
    </View>
  );
}

export default function SessionScreen() {
  const { token } = useAuth();
  return (
    <SessionProvider token={token}>
      <SessionContent />
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, paddingTop: Spacing.xl },
  roomLabel: { ...Typography.label, flex: 1 },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: Colors.surface2 },
  pillActive: { backgroundColor: Colors.success + '33' },
  pillError: { backgroundColor: Colors.error + '33' },
  pillText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  orbContainer: { alignItems: 'center', paddingVertical: Spacing.xl },
  error: { color: Colors.error, textAlign: 'center', marginHorizontal: Spacing.xl },
  transcript: { flex: 1, paddingHorizontal: Spacing.md },
  transcriptContent: { gap: Spacing.xs, paddingBottom: Spacing.md },
  footer: { padding: Spacing.xl, paddingTop: Spacing.md },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd mobile && npx jest __tests__/screens/SessionScreen.test.tsx --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/app/session/ mobile/__tests__/screens/SessionScreen.test.tsx
git commit -m "feat: add session screen (VoiceOrb, TranscriptBubble, end session)"
```

---

### Task 16: History Screen

**Files:**
- Create: `mobile/app/(tabs)/history.tsx`
- Create: `mobile/__tests__/screens/HistoryScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/screens/HistoryScreen.test.tsx`:

```typescript
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HistoryScreen from '../../app/(tabs)/history';
import * as storage from '../../src/services/storage';

jest.mock('../../src/services/storage');

describe('HistoryScreen', () => {
  it('shows empty state when no sessions', async () => {
    (storage.getSessions as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<HistoryScreen />);
    await waitFor(() => {
      expect(getByText(/Ainda não tens sessões/i)).toBeTruthy();
    });
  });

  it('shows session cards when sessions exist', async () => {
    (storage.getSessions as jest.Mock).mockResolvedValue([
      {
        id: '1',
        roomName: 'room-abc',
        level: 'B1',
        topic: 'viagens',
        startedAt: 1714000000,
        durationSeconds: 180,
        transcript: [],
      },
    ]);
    const { getByText } = render(<HistoryScreen />);
    await waitFor(() => {
      expect(getByText('B1')).toBeTruthy();
      expect(getByText(/viagens/i)).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd mobile && npx jest __tests__/screens/HistoryScreen.test.tsx --no-coverage
```

Expected: FAIL — screen doesn't exist

- [ ] **Step 3: Implement `mobile/app/(tabs)/history.tsx`**

```typescript
import { useEffect, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getSessions } from '../../src/services/storage';
import type { SessionHistoryEntry } from '../../src/types';
import { TranscriptBubble } from '../../src/components/TranscriptBubble';
import { Colors, Radii, Spacing, Typography } from '../../src/constants/theme';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [selected, setSelected] = useState<SessionHistoryEntry | null>(null);

  useEffect(() => {
    getSessions().then(setSessions);
  }, []);

  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>Ainda não tens sessões</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
            <View style={styles.cardRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.level}</Text>
              </View>
              <Text style={styles.topic}>{item.topic}</Text>
              <Text style={styles.duration}>{formatDuration(item.durationSeconds)}</Text>
            </View>
            <Text style={styles.date}>{formatDate(item.startedAt)}</Text>
          </TouchableOpacity>
        )}
      />
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modal}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeButton}>
            <Text style={styles.closeText}>Fechar</Text>
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {selected?.transcript.map((entry) => (
              <TranscriptBubble key={entry.id} entry={entry} />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.sm },
  empty: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emptyIcon: { fontSize: 56 },
  emptyText: { ...Typography.bodySecondary },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: { backgroundColor: Colors.accent, borderRadius: Radii.chip, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: Colors.textPrimary, fontSize: 11, fontWeight: '700' },
  topic: { flex: 1, color: Colors.textPrimary, fontSize: 15 },
  duration: { color: Colors.textSecondary, fontSize: 13 },
  date: { color: Colors.textSecondary, fontSize: 12 },
  modal: { flex: 1, backgroundColor: Colors.background },
  closeButton: { padding: Spacing.md, paddingTop: Spacing.xl },
  closeText: { color: Colors.accentLight, fontSize: 16 },
  modalContent: { padding: Spacing.md, gap: Spacing.xs },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd mobile && npx jest __tests__/screens/HistoryScreen.test.tsx --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/app/(tabs)/history.tsx mobile/__tests__/screens/HistoryScreen.test.tsx
git commit -m "feat: add History screen (session list + transcript modal)"
```

---

### Task 17: Settings Screen

**Files:**
- Create: `mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Implement `mobile/app/(tabs)/settings.tsx`**

```typescript
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSettings } from '../../src/contexts/SettingsContext';
import { LevelChip } from '../../src/components/LevelChip';
import type { UserLevel } from '../../src/features/session/types';
import { Colors, Spacing, Typography } from '../../src/constants/theme';

const VOICES = [
  { id: 'DMcOknq8n1B6XshFIJKJ', name: 'Patrício', description: 'Masculino, Lisboa' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Joana', description: 'Feminino, Porto' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Tiago', description: 'Masculino, jovem' },
];

const LEVELS: UserLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function SettingsScreen() {
  const { username, logout } = useAuth();
  const { settings, updateSetting } = useSettings();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Voz</Text>
      {VOICES.map((v) => (
        <TouchableOpacity
          key={v.id}
          style={[styles.voiceCard, settings.preferredVoiceId === v.id && styles.voiceSelected]}
          onPress={() => updateSetting('preferredVoiceId', v.id)}
        >
          <View>
            <Text style={styles.voiceName}>{v.name}</Text>
            <Text style={styles.voiceDesc}>{v.description}</Text>
          </View>
          {settings.preferredVoiceId === v.id && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>Nível padrão</Text>
      <View style={styles.chips}>
        {LEVELS.map((l) => (
          <LevelChip
            key={l}
            level={l}
            selected={settings.defaultLevel === l}
            onPress={(level) => updateSetting('defaultLevel', level)}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Conta</Text>
      <View style={styles.accountCard}>
        <Text style={styles.username}>{username}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Terminar sessão</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.xl, gap: Spacing.md },
  sectionTitle: { ...Typography.label, marginTop: Spacing.md },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  voiceSelected: { borderColor: Colors.accent },
  voiceName: { color: Colors.textPrimary, fontWeight: '600' },
  voiceDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  checkmark: { color: Colors.accent, fontSize: 18, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  accountCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  username: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  logoutText: { color: Colors.error, fontWeight: '600' },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/app/(tabs)/settings.tsx
git commit -m "feat: add Settings screen (voice, level, logout)"
```

---

### Task 18: Full Coverage Pass

- [ ] **Step 1: Run full test suite with coverage**

```bash
cd mobile && npm run test:coverage
```

Expected: All tests PASS, coverage ≥80% on `src/`.

- [ ] **Step 2: Run TypeScript check**

```bash
cd mobile && npm run ts
```

Expected: No errors.

- [ ] **Step 3: Fix any failing tests or type errors**

If coverage is below 80% on any file in `src/`, add targeted tests to the closest existing test file for that module. If TypeScript reports errors, fix them in the source file.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test: ensure ≥80% coverage on all src/ modules"
```

---

## Self-Review Checklist

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Auth flow (register/login/logout) | Tasks 7, 13 |
| Auth gate (token → redirect) | Task 12 |
| Tab navigation | Task 14 |
| Home screen (level + topic selector) | Task 14 |
| Session screen (orb + transcript) | Task 15 |
| LiveKit stub (mock transcript) | Task 6, 15 |
| History screen | Task 16 |
| Settings screen | Task 17 |
| Design tokens | Task 2 |
| Storage service | Task 4 |
| API service | Task 5 |
| AuthContext | Task 7 |
| SettingsContext | Task 8 |
| SessionContext | Task 9 |
| device_id generation | Task 4 |
| ≥80% test coverage | Task 18 |

All spec requirements are covered.

**Type consistency:** All types defined in Task 3 (`SettingsState`, `SessionHistoryEntry`) and `src/features/session/types.ts` (`UserLevel`, `ConversationTopic`, `TranscriptEntry`, `SessionConfig`, `LiveKitSessionData`) are used consistently across all later tasks.
