import { describe, expect, it } from 'vitest';
import { itemSeconds, segmentMillis } from './timer';

describe('segmentMillis', () => {
  it('measures finished segments', () => {
    expect(segmentMillis({ start: 1_000, end: 61_000 }, 999_999)).toBe(60_000);
  });

  it('counts a running segment up to now', () => {
    expect(segmentMillis({ start: 1_000, end: null }, 11_000)).toBe(10_000);
  });

  it('never goes negative (e.g. after a clock change)', () => {
    expect(segmentMillis({ start: 5_000, end: 1_000 }, 0)).toBe(0);
  });
});

describe('itemSeconds', () => {
  it('adds up segments and the manual correction', () => {
    const item = {
      segments: [
        { start: 0, end: 90_500 },
        { start: 100_000, end: null },
      ],
      adjustSeconds: 30,
    };
    expect(itemSeconds(item, 130_000)).toBe(90 + 30 + 30);
  });

  it('does not go below zero with a negative correction', () => {
    expect(itemSeconds({ segments: [{ start: 0, end: 10_000 }], adjustSeconds: -60 }, 0)).toBe(0);
  });
});
