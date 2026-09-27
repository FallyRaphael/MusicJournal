import { describe, expect, it } from 'vitest';
import { fromDateKey, toDateKey, weekDays } from './dates';

describe('date keys', () => {
  it('use the local calendar day', () => {
    expect(toDateKey(new Date(2026, 8, 27, 23, 59))).toBe('2026-09-27');
    expect(toDateKey(new Date(2026, 8, 28, 0, 1))).toBe('2026-09-28');
  });

  it('round-trip', () => {
    expect(toDateKey(fromDateKey('2026-02-28'))).toBe('2026-02-28');
  });
});

describe('weekDays', () => {
  it('runs Monday to Sunday', () => {
    const sunday = new Date(2026, 8, 27);
    expect(weekDays(sunday)).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
  });

  it('treats Monday as the first day', () => {
    expect(weekDays(new Date(2026, 8, 28))[0]).toBe('2026-09-28');
  });

  it('spans month and year boundaries', () => {
    expect(weekDays(new Date(2026, 11, 31))).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
  });
});
