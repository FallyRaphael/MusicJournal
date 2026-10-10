import { describe, expect, it } from 'vitest';
import type { Cycle, PracticeEntry, Session } from './model';
import { isPiece } from './pieceStats';
import { runningTempoGoal, tempoHistory, tempoScale } from './tempo';

const entry = (bpm: number | undefined, method = 'Metronome', at = 0): PracticeEntry => ({
  id: `${bpm}-${at}`,
  at,
  method,
  bpm,
  note: '',
});

function session(
  id: string,
  startedAt: number,
  pieceEntries: PracticeEntry[],
  status: Session['status'] = 'finished',
): Session {
  return {
    id,
    createdAt: startedAt,
    updatedAt: startedAt,
    date: '2026-09-01',
    status,
    startedAt,
    sections: [
      {
        id: 's',
        sectionTypeId: 'rep',
        items: [
          {
            id: 'i',
            ref: { kind: 'piece', pieceId: 'p1' },
            segments: [],
            adjustSeconds: 0,
            entries: pieceEntries,
            note: '',
            focusNext: '',
          },
          {
            id: 'other',
            ref: { kind: 'piece', pieceId: 'p2' },
            segments: [],
            adjustSeconds: 0,
            entries: [entry(200)],
            note: '',
            focusNext: '',
          },
        ],
      },
    ],
    note: '',
    pieceIds: ['p1', 'p2'],
    techniqueIds: [],
  };
}

describe('tempoHistory', () => {
  it('takes the fastest tempo of each session, oldest first', () => {
    const points = tempoHistory(isPiece('p1'), [
      session('b', 2000, [entry(60, 'Slow practice'), entry(84, 'Play-through'), entry(80)]),
      session('a', 1000, [entry(72)]),
    ]);
    expect(points).toEqual([
      { sessionId: 'a', at: 1000, bpm: 72, method: 'Metronome' },
      { sessionId: 'b', at: 2000, bpm: 84, method: 'Play-through' },
    ]);
  });

  it('skips sessions without a tempo, but counts entries logged before the timer ran', () => {
    const points = tempoHistory(isPiece('p1'), [
      session('none', 1000, [entry(undefined)]),
      session('planned', 2000, [entry(90)], 'planned'),
    ]);
    expect(points.map((p) => p.sessionId)).toEqual(['planned']);
  });
});

describe('runningTempoGoal', () => {
  const cycle = (overrides: Partial<Cycle> = {}): Cycle => ({
    id: 'c',
    createdAt: 0,
    updatedAt: 0,
    name: 'Cycle',
    startDate: '2026-10-01',
    lengthDays: 28,
    goals: [
      {
        id: 'g',
        ref: { kind: 'piece', pieceId: 'p1' },
        kind: 'bpm',
        fromBpm: 80,
        toBpm: 96,
        done: false,
      },
    ],
    reflection: '',
    ...overrides,
  });
  const ref = { kind: 'piece', pieceId: 'p1' } as const;

  it('finds the goal of the cycle running today', () => {
    expect(runningTempoGoal(ref, [cycle()], '2026-10-10')).toBe(96);
  });

  it('ignores cycles that are over, closed or not started', () => {
    expect(runningTempoGoal(ref, [cycle()], '2026-11-01')).toBeUndefined();
    expect(runningTempoGoal(ref, [cycle()], '2026-09-30')).toBeUndefined();
    expect(runningTempoGoal(ref, [cycle({ closedAt: 1 })], '2026-10-10')).toBeUndefined();
    expect(runningTempoGoal({ kind: 'piece', pieceId: 'p2' }, [cycle()], '2026-10-10')).toBe(
      undefined,
    );
  });
});

describe('tempoScale', () => {
  it('rounds to the step and leaves room around the values', () => {
    expect(tempoScale([60, 86, 96])).toEqual({ min: 50, max: 100, ticks: [60, 70, 80, 90] });
    expect(tempoScale([72, 80])).toEqual({ min: 70, max: 90, ticks: [80] });
  });

  it('handles a single value', () => {
    expect(tempoScale([80])).toEqual({ min: 70, max: 90, ticks: [80] });
  });

  it('uses wider steps for wide ranges', () => {
    expect(tempoScale([40, 160]).ticks).toEqual([40, 80, 120, 160]);
  });
});
