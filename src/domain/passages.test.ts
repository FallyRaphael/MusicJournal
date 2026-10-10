import { describe, expect, it } from 'vitest';
import type { Passage, PracticeEntry, Session } from './model';
import {
  barsLabel,
  entryMatches,
  lastPassage,
  passageLabel,
  passageTempo,
  sortPassages,
} from './passages';

const passage = (id: string, fields: Partial<Passage> = {}): Passage => ({
  id,
  createdAt: 0,
  name: '',
  focusNote: '',
  solid: false,
  ...fields,
});

const entry = (at: number, bpm?: number, passageId?: string): PracticeEntry => ({
  id: `e${at}`,
  at,
  method: 'Metronome',
  bpm,
  passageId,
  note: '',
});

function session(entries: PracticeEntry[], pieceId = 'p1'): Session {
  return {
    id: 's',
    createdAt: 0,
    updatedAt: 0,
    date: '2026-10-01',
    status: 'finished',
    sections: [
      {
        id: 'sec',
        sectionTypeId: 'rep',
        items: [
          {
            id: 'i',
            ref: { kind: 'piece', pieceId },
            segments: [],
            adjustSeconds: 0,
            entries,
            note: '',
            focusNext: '',
          },
        ],
      },
    ],
    note: '',
    pieceIds: [pieceId],
    techniqueIds: [],
  };
}

describe('labels', () => {
  it('prefers the name and falls back to the bars', () => {
    expect(passageLabel(passage('a', { name: 'Coda', fromBar: 90, toBar: 104 }))).toBe('Coda');
    expect(passageLabel(passage('a', { fromBar: 13, toBar: 16 }))).toBe('Bars 13–16');
    expect(barsLabel({ fromBar: 5, toBar: 5 })).toBe('Bar 5');
    expect(barsLabel({ fromBar: 40 })).toBe('From bar 40');
    expect(barsLabel({})).toBe('');
  });
});

describe('sortPassages', () => {
  it('goes through the piece by bar, passages without bars last', () => {
    const sorted = sortPassages([
      passage('coda', { name: 'Coda', createdAt: 1 }),
      passage('b', { fromBar: 13 }),
      passage('a', { fromBar: 1 }),
    ]);
    expect(sorted.map((p) => p.id)).toEqual(['a', 'b', 'coda']);
  });
});

describe('entries per passage', () => {
  const known = new Set(['a']);

  it('counts entries without a passage, or with a deleted one, as the whole piece', () => {
    expect(entryMatches({}, null, known)).toBe(true);
    expect(entryMatches({ passageId: 'gone' }, null, known)).toBe(true);
    expect(entryMatches({ passageId: 'a' }, null, known)).toBe(false);
    expect(entryMatches({ passageId: 'a' }, 'a', known)).toBe(true);
  });

  it('finds the last and best tempo of a passage', () => {
    const sessions = [
      session([entry(1, 60, 'a'), entry(2, 72, 'a'), entry(3, 66, 'a'), entry(4, 90)]),
    ];
    expect(passageTempo('p1', 'a', known, sessions)).toEqual({ last: 66, best: 72, lastAt: 3 });
    expect(passageTempo('p1', null, known, sessions)).toEqual({ last: 90, best: 90, lastAt: 4 });
    expect(passageTempo('p2', 'a', known, sessions)).toEqual({});
  });

  it('remembers the passage worked on last', () => {
    expect(lastPassage('p1', known, [session([entry(1, 60), entry(2, 66, 'a')])])).toBe('a');
    expect(lastPassage('p1', known, [session([entry(1, 60, 'a'), entry(2)])])).toBeNull();
    expect(lastPassage('p1', known, [])).toBeUndefined();
  });
});
