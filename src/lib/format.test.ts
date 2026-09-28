import { describe, expect, it } from 'vitest';
import { formatClock, formatDayInSentence, formatDayLabel, formatDuration } from './format';

describe('formatClock', () => {
  it('shows minutes and seconds, and hours when needed', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(522)).toBe('08:42');
    expect(formatClock(3723)).toBe('1:02:03');
  });
});

describe('formatDuration', () => {
  it('shows minutes, then hours and minutes', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(59)).toBe('< 1 min');
    expect(formatDuration(45 * 60)).toBe('45 min');
    expect(formatDuration(17 * 3600 + 5 * 60)).toBe('17 h 05 m');
  });
});

describe('formatDayLabel', () => {
  const now = new Date(2026, 8, 27, 20, 0);
  it('names nearby days', () => {
    expect(formatDayLabel(new Date(2026, 8, 27, 8, 0), now)).toBe('Today');
    expect(formatDayLabel(new Date(2026, 8, 28), now)).toBe('Tomorrow');
    expect(formatDayLabel(new Date(2026, 8, 26), now)).toBe('Yesterday');
    expect(formatDayLabel(new Date(2026, 8, 29), now)).toMatch(/^Tue 29 Sept?$/);
  });
});

describe('formatDayInSentence', () => {
  it('lower-cases relative days only', () => {
    const now = new Date(2026, 8, 27);
    expect(formatDayInSentence(new Date(2026, 8, 28), now)).toBe('tomorrow');
    expect(formatDayInSentence(new Date(2026, 9, 25), now)).toMatch(/^Sun 25 Oct/);
  });
});
