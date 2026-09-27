import { describe, expect, it } from 'vitest';
import type { Piece } from './model';
import {
  addTag,
  collectTags,
  filterPieces,
  sortPieces,
  statusPeriods,
  withStatusChange,
  type PieceFilter,
} from './pieces';

function piece(overrides: Partial<Piece> & Pick<Piece, 'id' | 'title'>): Piece {
  return {
    createdAt: 0,
    updatedAt: 0,
    composer: '',
    tags: [],
    status: 'learning',
    statusHistory: [{ status: 'learning', at: 0 }],
    notes: '',
    focusNote: '',
    ...overrides,
  };
}

describe('withStatusChange', () => {
  const learning = {
    status: 'learning' as const,
    statusHistory: [{ status: 'learning' as const, at: 1 }],
  };

  it('starts a new period', () => {
    const next = withStatusChange(learning, 'shelved', 5, 'partlyLearned');
    expect(next.status).toBe('shelved');
    expect(next.statusHistory).toEqual([
      { status: 'learning', at: 1 },
      { status: 'shelved', at: 5, outcome: 'partlyLearned' },
    ]);
  });

  it('ignores a change to the same status', () => {
    expect(withStatusChange(learning, 'learning', 5)).toBe(learning);
  });

  it('corrects the outcome of a shelved piece without a new period', () => {
    const shelved = withStatusChange(learning, 'shelved', 5, 'dropped');
    const corrected = withStatusChange(shelved, 'shelved', 9, 'learned');
    expect(corrected.statusHistory).toEqual([
      { status: 'learning', at: 1 },
      { status: 'shelved', at: 5, outcome: 'learned' },
    ]);
  });

  it('does not store an outcome for other statuses', () => {
    expect(withStatusChange(learning, 'maintaining', 5, 'learned').statusHistory[1]).toEqual({
      status: 'maintaining',
      at: 5,
    });
  });
});

describe('statusPeriods', () => {
  it('turns changes into consecutive periods', () => {
    expect(
      statusPeriods([
        { status: 'learning', at: 1 },
        { status: 'shelved', at: 5, outcome: 'dropped' },
        { status: 'learning', at: 9 },
      ]),
    ).toEqual([
      { status: 'learning', from: 1, to: 5 },
      { status: 'shelved', outcome: 'dropped', from: 5, to: 9 },
      { status: 'learning', from: 9, to: null },
    ]);
  });
});

describe('tags', () => {
  it('adds trimmed tags once, ignoring case', () => {
    expect(addTag(['Recital'], '  recital ')).toEqual(['Recital']);
    expect(addTag(['Recital'], '  Romantic   era ')).toEqual(['Recital', 'Romantic era']);
    expect(addTag(['Recital'], '   ')).toEqual(['Recital']);
  });

  it('collects unique tags alphabetically', () => {
    const tags = collectTags([{ tags: ['Romantic', 'recital'] }, { tags: ['Recital', 'Baroque'] }]);
    expect(tags).toEqual(['Baroque', 'recital', 'Romantic']);
  });
});

describe('filterPieces', () => {
  const pieces = [
    piece({ id: 'a', title: 'Nocturne', composer: 'Chopin', feel: 'medium', tags: ['Recital'] }),
    piece({ id: 'b', title: 'Clair de lune', composer: 'Debussy', status: 'maintaining' }),
    piece({ id: 'c', title: 'Gymnopédie No. 1', composer: 'Satie', status: 'upNext' }),
    piece({ id: 'd', title: 'Für Elise', composer: 'Beethoven', status: 'shelved', feel: 'easy' }),
  ];
  const base: PieceFilter = { tab: 'active', query: '', feels: [], tags: [] };
  const ids = (filter: Partial<PieceFilter>) =>
    filterPieces(pieces, { ...base, ...filter }).map((p) => p.id);

  it('splits pieces into tabs', () => {
    expect(ids({})).toEqual(['a', 'b']);
    expect(ids({ tab: 'upNext' })).toEqual(['c']);
    expect(ids({ tab: 'shelf' })).toEqual(['d']);
  });

  it('searches title and composer, ignoring accents', () => {
    expect(ids({ query: 'debus' })).toEqual(['b']);
    expect(ids({ tab: 'upNext', query: 'gymnopedie' })).toEqual(['c']);
    expect(ids({ tab: 'shelf', query: 'fur elise' })).toEqual(['d']);
  });

  it('filters by feel, including unrated pieces', () => {
    expect(ids({ feels: ['medium'] })).toEqual(['a']);
    expect(ids({ feels: ['unrated'] })).toEqual(['b']);
  });

  it('filters by tag, ignoring case', () => {
    expect(ids({ tags: ['recital'] })).toEqual(['a']);
  });
});

describe('sortPieces', () => {
  const pieces = [
    piece({ id: 'a', title: 'b-title', composer: 'Z', createdAt: 1, targetDate: '2026-12-01' }),
    piece({ id: 'b', title: 'A-title', composer: 'Y', createdAt: 2 }),
    piece({ id: 'c', title: 'c-title', composer: 'Y', createdAt: 3, targetDate: '2026-10-01' }),
  ];
  const order = (sort: Parameters<typeof sortPieces>[1], last = new Map<string, number>()) =>
    sortPieces(pieces, sort, last).map((p) => p.id);

  it('sorts by title and by composer', () => {
    expect(order('title')).toEqual(['b', 'a', 'c']);
    expect(order('composer')).toEqual(['b', 'c', 'a']);
  });

  it('puts the earliest target first and pieces without one last', () => {
    expect(order('target')).toEqual(['c', 'a', 'b']);
  });

  it('sorts by last practice, then newest first', () => {
    expect(order('recent', new Map([['a', 100]]))).toEqual(['a', 'c', 'b']);
  });
});
