import { computeStats } from '../services/history';
import type { SessionRecord } from '../services/history';

// Mock AsyncStorage — not needed for pure computeStats but avoids import errors
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
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
