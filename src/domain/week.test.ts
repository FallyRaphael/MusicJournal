import { describe, expect, it } from 'vitest';
import { weekDays } from './dates';
import { summarizeWeek } from './week';

const days = weekDays(new Date(2026, 8, 27)); // 21–27 Sep 2026

describe('summarizeWeek', () => {
  it('is empty without sessions', () => {
    expect(summarizeWeek([], days)).toEqual({
      sessionCount: 0,
      practicedDays: [false, false, false, false, false, false, false],
    });
  });

  it('counts every finished session but marks each day once', () => {
    const summary = summarizeWeek(
      [
        { date: '2026-09-21', status: 'finished' },
        { date: '2026-09-23', status: 'finished' },
        { date: '2026-09-23', status: 'finished' },
      ],
      days,
    );
    expect(summary.sessionCount).toBe(3);
    expect(summary.practicedDays).toEqual([true, false, true, false, false, false, false]);
  });

  it('ignores unfinished sessions and other weeks', () => {
    const summary = summarizeWeek(
      [
        { date: '2026-09-24', status: 'planned' },
        { date: '2026-09-25', status: 'running' },
        { date: '2026-09-20', status: 'finished' },
        { date: '2026-09-28', status: 'finished' },
      ],
      days,
    );
    expect(summary.sessionCount).toBe(0);
    expect(summary.practicedDays.some(Boolean)).toBe(false);
  });
});
