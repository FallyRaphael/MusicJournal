import { describe, expect, it } from 'vitest';
import type { ItemRef, Session } from './model';
import { matchesQuery, recentInSection, sectionKind } from './picker';

function session(id: string, startedAt: number, sections: [string, ItemRef[]][]): Session {
  return {
    id,
    createdAt: startedAt,
    updatedAt: startedAt,
    date: '2026-10-01',
    status: 'finished',
    startedAt,
    sections: sections.map(([sectionTypeId, refs]) => ({
      id: sectionTypeId,
      sectionTypeId,
      items: refs.map((ref, i) => ({
        id: `${id}-${i}`,
        ref,
        segments: [],
        adjustSeconds: 0,
        entries: [],
        note: '',
        focusNext: '',
      })),
    })),
    note: '',
    pieceIds: [],
    techniqueIds: [],
  };
}

const piece = (pieceId: string): ItemRef => ({ kind: 'piece', pieceId });
const free = (label: string): ItemRef => ({ kind: 'free', label });

describe('recentInSection', () => {
  it('lists the items of one section, newest first and without repeats', () => {
    const sessions = [
      session('old', 1000, [['rep', [piece('a'), piece('b')]]]),
      session('new', 2000, [
        ['rep', [piece('b'), piece('c')]],
        ['sight', [free('Book')]],
      ]),
    ];
    expect(recentInSection(sessions, 'rep')).toEqual([piece('b'), piece('c'), piece('a')]);
    expect(recentInSection(sessions, 'sight')).toEqual([free('Book')]);
    expect(recentInSection(sessions, 'rep', 2)).toHaveLength(2);
  });
});

describe('sectionKind', () => {
  it('uses what the section held before', () => {
    const sessions = [session('s', 1000, [['x', [free('Book'), free('Hymns'), piece('a')]]])];
    expect(sectionKind(sessions, 'x', 'Repertoire')).toBe('free');
  });

  it('guesses from the name for a section never used', () => {
    expect(sectionKind([], 'x', 'Repertoire')).toBe('piece');
    expect(sectionKind([], 'x', 'Warm-up')).toBe('technique');
    expect(sectionKind([], 'x', 'Sight-reading')).toBe('book');
    expect(sectionKind([], 'x', 'Theory & ear training')).toBe('free');
  });
});

describe('matchesQuery', () => {
  it('matches all words in any order, ignoring accents and case', () => {
    expect(matchesQuery('major c', 'C major scale')).toBe(true);
    expect(matchesQuery('gymnopedie', 'Gymnopédie No. 1')).toBe(true);
    expect(matchesQuery('minor', 'C major scale')).toBe(false);
    expect(matchesQuery('', 'anything')).toBe(true);
  });
});
