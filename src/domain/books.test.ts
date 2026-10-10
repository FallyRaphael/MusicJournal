import { describe, expect, it } from 'vitest';
import { bookProgress, bookProgressText, formatRange, oneOffLabels, replaceOneOff } from './books';
import type { ItemRef, PracticeEntry, Session } from './model';

const range = (from: number, to?: number): PracticeEntry => ({
  id: `${from}-${to}`,
  at: 0,
  method: '',
  from,
  to,
  note: '',
});

function session(
  id: string,
  items: { ref: ItemRef; entries?: PracticeEntry[] }[],
  status: Session['status'] = 'finished',
): Session {
  return {
    id,
    createdAt: 0,
    updatedAt: 0,
    date: '2026-10-01',
    status,
    sections: [
      {
        id: 's',
        sectionTypeId: 'sight',
        items: items.map(({ ref, entries = [] }, i) => ({
          id: `${id}-${i}`,
          ref,
          segments: [],
          adjustSeconds: 0,
          entries,
          note: '',
          focusNext: '',
        })),
      },
    ],
    note: '',
    pieceIds: [],
    techniqueIds: [],
  };
}

const book = (bookId: string): ItemRef => ({ kind: 'book', bookId });

describe('bookProgress', () => {
  it('continues after the highest exercise logged', () => {
    const sessions = [
      session('a', [{ ref: book('b1'), entries: [range(1, 4), range(5, 8)] }]),
      session('b', [{ ref: book('b1'), entries: [range(9)] }]),
      session('other', [{ ref: book('b2'), entries: [range(100, 120)] }]),
      session('logged-before-start', [{ ref: book('b1'), entries: [range(10, 12)] }], 'planned'),
    ];
    expect(bookProgress('b1', sessions)).toEqual({ last: 12, next: 13 });
  });

  it('starts at 1 for a new book', () => {
    expect(bookProgress('b1', [])).toEqual({ last: undefined, next: 1 });
  });
});

describe('bookProgressText', () => {
  const sessions = [session('a', [{ ref: book('b1'), entries: [range(1, 44)] }])];
  it('says how far the book got', () => {
    expect(bookProgressText({ id: 'b1', total: 500 }, sessions)).toBe('44 of 500 done');
    expect(bookProgressText({ id: 'b1' }, sessions)).toBe('Up to No. 44');
    expect(bookProgressText({ id: 'b2', total: 100 }, sessions)).toBe(
      'Not started · 100 exercises',
    );
  });
});

describe('formatRange', () => {
  it('shows one number or a range', () => {
    expect(formatRange({ from: 45, to: 48 })).toBe('No. 45–48');
    expect(formatRange({ from: 45, to: 45 })).toBe('No. 45');
    expect(formatRange({ from: 45 })).toBe('No. 45');
    expect(formatRange({})).toBe('');
  });
});

describe('one-offs to books', () => {
  const free = (label: string): ItemRef => ({ kind: 'free', label });
  const sessions = [
    session('a', [{ ref: free('Sight-reading book') }, { ref: free('Hymns') }]),
    session('b', [{ ref: free('Sight-reading book') }]),
  ];

  it('lists one-offs by how often they were used', () => {
    expect(oneOffLabels(sessions)).toEqual([
      { label: 'Sight-reading book', count: 2 },
      { label: 'Hymns', count: 1 },
    ]);
  });

  it('replaces only the matching one-off', () => {
    const sections = replaceOneOff(sessions[0], 'Sight-reading book', 'b1');
    expect(sections?.[0].items.map((item) => item.ref)).toEqual([book('b1'), free('Hymns')]);
    expect(replaceOneOff(sessions[1], 'Hymns', 'b1')).toBeNull();
  });
});
