import {
  computeStats,
  nextMilestone,
  accuracyTrend,
  saveSession,
  loadSessions,
  clearHistory,
  mergeRemoteSessions,
} from '../services/history';
import type { SessionRecord } from '../services/history';

// ── expo-file-system mock ────────────────────────────────────────────────────
const mockFs: Record<string, string> = {};

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock-docs/',
  getInfoAsync: jest.fn(async (uri: string) => ({ exists: uri in mockFs, uri })),
  readAsStringAsync: jest.fn(async (uri: string) => {
    const val = mockFs[uri];
    if (val === undefined) throw new Error('File not found');
    return val;
  }),
  writeAsStringAsync: jest.fn(async (uri: string, content: string) => {
    mockFs[uri] = content;
  }),
  deleteAsync: jest.fn(async (uri: string) => {
    delete mockFs[uri];
  }),
}));

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: String(Math.random()),
    topic: 'livre',
    level: 'B1',
    startedAt: Date.now(),
    endedAt: Date.now() + 60_000,
    durationSeconds: 60,
    messageCount: 10,
    correctionCount: 2,
    excerpt: '',
    ...overrides,
  };
}

describe('computeStats', () => {
  it('returns zeros for empty session list', () => {
    const stats = computeStats([]);
    expect(stats.totalSessions).toBe(0);
    expect(stats.accuracy).toBe(0);
    expect(stats.streakDays).toBe(0);
    expect(stats.byTopic).toEqual([]);
  });

  it('counts total sessions', () => {
    const sessions = [makeSession(), makeSession(), makeSession()];
    expect(computeStats(sessions).totalSessions).toBe(3);
  });

  it('computes accuracy correctly', () => {
    // 10 messages, 2 corrections → 80% accuracy
    const stats = computeStats([makeSession({ messageCount: 10, correctionCount: 2 })]);
    expect(stats.accuracy).toBe(80);
  });

  it('returns 100% accuracy when no corrections', () => {
    const stats = computeStats([makeSession({ messageCount: 5, correctionCount: 0 })]);
    expect(stats.accuracy).toBe(100);
  });

  it('returns 0% accuracy when every message is a correction', () => {
    const stats = computeStats([makeSession({ messageCount: 4, correctionCount: 4 })]);
    expect(stats.accuracy).toBe(0);
  });

  it('aggregates across multiple sessions for accuracy', () => {
    const sessions = [
      makeSession({ messageCount: 10, correctionCount: 0 }),
      makeSession({ messageCount: 10, correctionCount: 10 }),
    ];
    // 20 messages, 10 corrections → 50%
    expect(computeStats(sessions).accuracy).toBe(50);
  });

  it('groups byTopic and sums messages per topic', () => {
    const sessions = [
      makeSession({ topic: 'viagens', messageCount: 10, correctionCount: 1 }),
      makeSession({ topic: 'viagens', messageCount: 10, correctionCount: 1 }),
      makeSession({ topic: 'trabalho', messageCount: 10, correctionCount: 5 }),
    ];
    const { byTopic } = computeStats(sessions);
    const viagens = byTopic.find((t) => t.topic === 'viagens');
    const trabalho = byTopic.find((t) => t.topic === 'trabalho');
    expect(viagens?.sessions).toBe(2);
    expect(viagens?.accuracy).toBe(90);
    expect(trabalho?.sessions).toBe(1);
    expect(trabalho?.accuracy).toBe(50);
  });

  it('sorts byTopic by session count descending', () => {
    const sessions = [
      makeSession({ topic: 'trabalho' }),
      makeSession({ topic: 'viagens' }),
      makeSession({ topic: 'viagens' }),
    ];
    const { byTopic } = computeStats(sessions);
    expect(byTopic[0].topic).toBe('viagens');
  });

  it('counts streak as 1 for a single session today', () => {
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const stats = computeStats([makeSession({ startedAt: today.getTime() })]);
    expect(stats.streakDays).toBe(1);
  });
});

// ── File-backed async functions ──────────────────────────────────────────────

const HISTORY_URI = 'file:///mock-docs/session_history.json';

beforeEach(() => {
  // Reset mock filesystem before each async test
  Object.keys(mockFs).forEach((k) => delete mockFs[k]);
});

describe('loadSessions', () => {
  it('returns empty array when file does not exist', async () => {
    const sessions = await loadSessions();
    expect(sessions).toEqual([]);
  });

  it('returns parsed sessions when file exists', async () => {
    const record = makeSession({ id: 'abc123' });
    mockFs[HISTORY_URI] = JSON.stringify([record]);
    const sessions = await loadSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('abc123');
  });

  it('returns empty array when file contains invalid JSON', async () => {
    mockFs[HISTORY_URI] = 'not-valid-json{{{';
    const sessions = await loadSessions();
    expect(sessions).toEqual([]);
  });
});

describe('saveSession', () => {
  it('writes new session as first element', async () => {
    const record = makeSession({ id: 'new-session' });
    await saveSession(record);
    const saved = JSON.parse(mockFs[HISTORY_URI]) as SessionRecord[];
    expect(saved[0].id).toBe('new-session');
  });

  it('prepends to existing sessions', async () => {
    const old = makeSession({ id: 'old' });
    mockFs[HISTORY_URI] = JSON.stringify([old]);
    const fresh = makeSession({ id: 'fresh' });
    await saveSession(fresh);
    const saved = JSON.parse(mockFs[HISTORY_URI]) as SessionRecord[];
    expect(saved[0].id).toBe('fresh');
    expect(saved[1].id).toBe('old');
  });

  it('caps stored sessions at 50', async () => {
    const existing = Array.from({ length: 50 }, (_, i) =>
      makeSession({ id: `s${i}` })
    );
    mockFs[HISTORY_URI] = JSON.stringify(existing);
    await saveSession(makeSession({ id: 'overflow' }));
    const saved = JSON.parse(mockFs[HISTORY_URI]) as SessionRecord[];
    expect(saved).toHaveLength(50);
    expect(saved[0].id).toBe('overflow');
  });
});

describe('mergeRemoteSessions', () => {
  it('recovers remote sessions when local is empty', async () => {
    const remote = [makeSession({ id: 'r1', startedAt: 1000 })];
    const merged = await mergeRemoteSessions(remote);
    expect(merged.map((s) => s.id)).toEqual(['r1']);
    // Persisted locally too.
    expect(JSON.parse(mockFs[HISTORY_URI])[0].id).toBe('r1');
  });

  it('dedupes by id, preferring one copy', async () => {
    mockFs[HISTORY_URI] = JSON.stringify([makeSession({ id: 'dup', startedAt: 2000 })]);
    const merged = await mergeRemoteSessions([makeSession({ id: 'dup', startedAt: 2000 })]);
    expect(merged).toHaveLength(1);
  });

  it('merges and sorts newest first', async () => {
    mockFs[HISTORY_URI] = JSON.stringify([makeSession({ id: 'local', startedAt: 1000 })]);
    const merged = await mergeRemoteSessions([makeSession({ id: 'remote', startedAt: 9000 })]);
    expect(merged.map((s) => s.id)).toEqual(['remote', 'local']);
  });

  it('caps merged result at 50', async () => {
    const local = Array.from({ length: 40 }, (_, i) =>
      makeSession({ id: `l${i}`, startedAt: i }),
    );
    mockFs[HISTORY_URI] = JSON.stringify(local);
    const remote = Array.from({ length: 40 }, (_, i) =>
      makeSession({ id: `r${i}`, startedAt: 1000 + i }),
    );
    const merged = await mergeRemoteSessions(remote);
    expect(merged).toHaveLength(50);
  });
});

describe('clearHistory', () => {
  it('removes the history file when it exists', async () => {
    mockFs[HISTORY_URI] = JSON.stringify([makeSession()]);
    await clearHistory();
    expect(mockFs[HISTORY_URI]).toBeUndefined();
  });

  it('does nothing when file does not exist', async () => {
    await expect(clearHistory()).resolves.toBeUndefined();
  });
});


describe('nextMilestone', () => {
  it('points at the first target from zero', () => {
    const m = nextMilestone(0);
    expect(m?.target).toBe(10);
    expect(m?.remaining).toBe(10);
  });

  it('measures progress between the previous target and the next', () => {
    const m = nextMilestone(45); // halfway from 30 to 60
    expect(m?.target).toBe(60);
    expect(m?.remaining).toBe(15);
    expect(m?.progress).toBeCloseTo(0.5, 1);
  });

  it('moves on once a target is passed', () => {
    expect(nextMilestone(61)?.target).toBe(120);
  });

  it('returns null once every target is behind you', () => {
    expect(nextMilestone(99999)).toBeNull();
  });
});

describe('accuracyTrend', () => {
  const at = (startedAt: number, messageCount: number, correctionCount: number) =>
    makeSession({ startedAt, messageCount, correctionCount });

  it('stays silent until there is enough history to compare', () => {
    expect(accuracyTrend([at(1, 10, 5), at(2, 10, 1)])).toBeNull();
  });

  it('reports improvement when recent sessions have fewer corrections', () => {
    const trend = accuracyTrend([
      at(1, 10, 5), at(2, 10, 5), at(3, 10, 1), at(4, 10, 1),
    ]);
    expect(trend).toBeGreaterThan(0);
  });

  it('reports a decline when recent sessions have more', () => {
    const trend = accuracyTrend([
      at(1, 10, 1), at(2, 10, 1), at(3, 10, 6), at(4, 10, 6),
    ]);
    expect(trend).toBeLessThan(0);
  });

  it('is unaffected by the order the sessions come in', () => {
    const asc = [at(1, 10, 5), at(2, 10, 5), at(3, 10, 1), at(4, 10, 1)];
    expect(accuracyTrend([...asc].reverse())).toBe(accuracyTrend(asc));
  });
});

describe('computeStats — the encouraging numbers', () => {
  it('adds up the time actually spoken', () => {
    const stats = computeStats([
      makeSession({ durationSeconds: 600 }),
      makeSession({ durationSeconds: 300 }),
    ]);
    expect(stats.totalMinutes).toBe(15);
  });

  it('remembers the longest conversation', () => {
    const stats = computeStats([
      makeSession({ durationSeconds: 120 }),
      makeSession({ durationSeconds: 900 }),
    ]);
    expect(stats.longestMinutes).toBe(15);
  });

  it('gives something to aim at from the first session', () => {
    const stats = computeStats([makeSession({ durationSeconds: 180 })]);
    expect(stats.milestone?.target).toBe(10);
  });

  it('handles an empty history without breaking', () => {
    const stats = computeStats([]);
    expect(stats.totalMinutes).toBe(0);
    expect(stats.longestMinutes).toBe(0);
    expect(stats.trend).toBeNull();
  });
});
