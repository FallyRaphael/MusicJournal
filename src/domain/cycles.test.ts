import { describe, expect, it } from 'vitest';
import {
  bestBpm,
  carryOverGoal,
  cycleDay,
  cycleEnd,
  cyclePhase,
  cycleSessions,
  cycleTime,
  goalProgress,
  openCycle,
  weekStreak,
} from './cycles';
import type { Cycle, Goal, Session, SessionItem } from './model';

const MIN = 60_000;
const nocturne = { kind: 'piece', pieceId: 'noct' } as const;

function cycle(overrides: Partial<Cycle> = {}): Cycle {
  return {
    id: 'c1',
    createdAt: 0,
    updatedAt: 0,
    name: 'Autumn',
    startDate: '2026-09-28',
    lengthDays: 28,
    goals: [],
    reflection: '',
    ...overrides,
  };
}

function item(minutes: number, bpms: number[] = []): SessionItem {
  return {
    id: `i${minutes}-${bpms.join()}`,
    ref: nocturne,
    segments: [{ start: 0, end: minutes * MIN }],
    adjustSeconds: 0,
    entries: bpms.map((bpm, i) => ({ id: `e${i}`, at: i, method: 'Metronome', bpm, note: '' })),
    note: '',
    focusNext: '',
  };
}

function session(
  date: string,
  items: SessionItem[],
  status: Session['status'] = 'finished',
): Session {
  return {
    id: `s-${date}-${status}`,
    createdAt: 0,
    updatedAt: 0,
    date,
    status,
    sections: [{ id: 'sec', sectionTypeId: 'rep', items }],
    note: '',
    pieceIds: ['noct'],
    techniqueIds: [],
  };
}

describe('cycle dates', () => {
  it('ends after its length', () => {
    expect(cycleEnd(cycle())).toBe('2026-10-25');
    expect(cycleEnd(cycle({ lengthDays: 1 }))).toBe('2026-09-28');
  });

  it('knows its phase', () => {
    expect(cyclePhase(cycle(), '2026-09-27')).toBe('upcoming');
    expect(cyclePhase(cycle(), '2026-09-28')).toBe('running');
    expect(cyclePhase(cycle(), '2026-10-25')).toBe('running');
    expect(cyclePhase(cycle(), '2026-10-26')).toBe('ended');
    expect(cyclePhase(cycle({ closedAt: 1 }), '2026-10-01')).toBe('closed');
  });

  it('counts days from 1 and stays within the cycle', () => {
    expect(cycleDay(cycle(), '2026-09-28')).toBe(1);
    expect(cycleDay(cycle(), '2026-10-09')).toBe(12);
    expect(cycleDay(cycle(), '2026-12-01')).toBe(28);
    expect(cycleDay(cycle(), '2026-09-01')).toBe(1);
  });

  it('finds the one cycle not yet reviewed', () => {
    const cycles = [
      cycle({ id: 'old', startDate: '2026-08-01', closedAt: 5 }),
      cycle({ id: 'open', startDate: '2026-09-28' }),
    ];
    expect(openCycle(cycles)?.id).toBe('open');
    expect(openCycle([cycles[0]])).toBeUndefined();
  });

  it('includes practiced sessions within its days only', () => {
    const sessions = [
      session('2026-09-27', []),
      session('2026-09-28', []),
      session('2026-10-25', []),
      session('2026-10-26', []),
      session('2026-10-01', [], 'planned'),
      session('2026-10-02', [], 'running'),
    ];
    expect(cycleSessions(cycle(), sessions).map((s) => s.date)).toEqual([
      '2026-09-28',
      '2026-10-25',
      '2026-10-02',
    ]);
  });
});

describe('goalProgress', () => {
  const sessions = [
    session('2026-09-29', [item(30, [72, 80])]),
    session('2026-10-01', [item(60, [84, 76])]),
  ];

  it('measures tempo goals by the best BPM logged', () => {
    const goal: Goal = { id: 'g', ref: nocturne, kind: 'bpm', fromBpm: 72, toBpm: 96, done: false };
    expect(bestBpm(nocturne, sessions)).toBe(84);
    expect(goalProgress(goal, sessions, 0)).toEqual({ current: 84, ratio: 0.5, reached: false });
    expect(goalProgress({ ...goal, toBpm: 84 }, sessions, 0).reached).toBe(true);
    expect(goalProgress(goal, [], 0)).toEqual({ ratio: 0, reached: false });
  });

  it('measures time goals in minutes practiced', () => {
    const goal: Goal = { id: 'g', ref: nocturne, kind: 'time', targetMinutes: 120, done: false };
    expect(goalProgress(goal, sessions, 0)).toEqual({ current: 90, ratio: 0.75, reached: false });
    expect(goalProgress({ ...goal, targetMinutes: 90 }, sessions, 0).reached).toBe(true);
  });

  it('uses the tick for check goals', () => {
    const goal: Goal = { id: 'g', ref: nocturne, kind: 'check', label: 'Memorize', done: true };
    expect(goalProgress(goal, [], 0)).toEqual({ ratio: 1, reached: true });
  });

  it('carries a tempo goal over from the best tempo so far', () => {
    const goal: Goal = { id: 'g', ref: nocturne, kind: 'bpm', fromBpm: 72, toBpm: 96, done: false };
    const next = carryOverGoal(goal, goalProgress(goal, sessions, 0));
    expect(next.id).not.toBe('g');
    expect([next.fromBpm, next.toBpm]).toEqual([84, 96]);
  });
});

describe('cycleTime', () => {
  it('sums time per item and counts practice days', () => {
    const time = cycleTime(
      [session('2026-09-29', [item(30)]), session('2026-09-29', [item(20)])],
      0,
    );
    expect(time.totalSeconds).toBe(50 * 60);
    expect(time.daysPracticed).toBe(1);
    expect(time.byRef).toEqual([{ ref: nocturne, seconds: 50 * 60 }]);
  });
});

describe('weekStreak', () => {
  const finished = (dates: string[]) =>
    dates.map((date) => ({ date, status: 'finished' as const }));
  const today = new Date(2026, 8, 30); // Wednesday, week of 28 Sep

  it('counts consecutive weeks that met the target', () => {
    const sessions = finished([
      '2026-09-14',
      '2026-09-16', // week of 14 Sep: 2
      '2026-09-21',
      '2026-09-25', // week of 21 Sep: 2
      '2026-09-28',
      '2026-09-29', // this week: 2
    ]);
    expect(weekStreak(sessions, 2, today)).toBe(3);
  });

  it('does not break the streak for a week still in progress', () => {
    const sessions = finished([
      '2026-09-14',
      '2026-09-16',
      '2026-09-21',
      '2026-09-25',
      '2026-09-28',
    ]);
    expect(weekStreak(sessions, 2, today)).toBe(2);
  });

  it('stops at the first week below target', () => {
    const sessions = finished(['2026-09-07', '2026-09-08', '2026-09-21', '2026-09-22']);
    expect(weekStreak(sessions, 2, today)).toBe(1);
    expect(weekStreak([], 2, today)).toBe(0);
  });

  it('ignores unfinished sessions', () => {
    expect(weekStreak([{ date: '2026-09-21', status: 'running' }], 1, today)).toBe(0);
  });
});
