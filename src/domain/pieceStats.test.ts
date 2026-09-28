import { describe, expect, it } from 'vitest';
import type { Session, SessionItem } from './model';
import {
  isPiece,
  lastBpm,
  lastPracticedByPiece,
  pieceSessionSummaries,
  pieceStats,
} from './pieceStats';
import { statusPeriods } from './pieces';

const MIN = 60_000;

function item(pieceId: string, minutes: number, start = 0): SessionItem {
  return {
    id: `${pieceId}-${start}`,
    ref: { kind: 'piece', pieceId },
    segments: [{ start, end: start + minutes * MIN }],
    adjustSeconds: 0,
    entries: [],
    note: '',
    focusNext: '',
  };
}

function session(
  id: string,
  startedAt: number,
  items: SessionItem[],
  status: Session['status'] = 'finished',
): Session {
  return {
    id,
    createdAt: startedAt,
    updatedAt: startedAt,
    date: '2026-09-01',
    status,
    startedAt,
    sections: [{ id: 's', sectionTypeId: 'rep', items }],
    note: '',
    pieceIds: [...new Set(items.flatMap((i) => (i.ref.kind === 'piece' ? [i.ref.pieceId] : [])))],
    techniqueIds: [],
  };
}

const sessions = [
  session('s1', 1_000, [item('nocturne', 20), item('clair', 10)]),
  session('s2', 5_000, [item('nocturne', 15), item('nocturne', 5)]),
  session('s3', 9_000, [item('clair', 30)]),
  session('planned', 12_000, [item('nocturne', 0)], 'planned'),
];

describe('pieceSessionSummaries', () => {
  it('lists the sessions with the piece, newest first, summing repeated items', () => {
    expect(pieceSessionSummaries('nocturne', sessions, 0)).toEqual([
      { sessionId: 's2', at: 5_000, seconds: 20 * 60 },
      { sessionId: 's1', at: 1_000, seconds: 20 * 60 },
    ]);
  });
});

describe('pieceStats', () => {
  it('totals time and sessions and splits them by status period', () => {
    const periods = statusPeriods([
      { status: 'learning', at: 0 },
      { status: 'shelved', at: 3_000 },
      { status: 'learning', at: 4_000 },
    ]);
    expect(pieceStats('nocturne', sessions, periods, 0)).toEqual({
      totalSeconds: 40 * 60,
      sessionCount: 2,
      lastPracticedAt: 5_000,
      periodSeconds: [20 * 60, 0, 20 * 60],
    });
  });

  it('is empty for a piece without sessions', () => {
    const periods = statusPeriods([{ status: 'upNext', at: 0 }]);
    expect(pieceStats('new', sessions, periods, 0)).toEqual({
      totalSeconds: 0,
      sessionCount: 0,
      lastPracticedAt: undefined,
      periodSeconds: [0],
    });
  });
});

describe('lastPracticedByPiece', () => {
  it('ignores planned sessions', () => {
    const last = lastPracticedByPiece(sessions);
    expect(last.get('nocturne')).toBe(5_000);
    expect(last.get('clair')).toBe(9_000);
  });
});

describe('lastBpm', () => {
  it('finds the latest BPM logged for a piece', () => {
    const withEntries = sessions.map((s, i) => ({
      ...s,
      sections: s.sections.map((section) => ({
        ...section,
        items: section.items.map((it) => ({
          ...it,
          entries: [{ id: `e${i}`, at: i * 10, method: 'Metronome', bpm: 60 + i, note: '' }],
        })),
      })),
    }));
    expect(lastBpm(isPiece('clair'), withEntries)).toBe(62);
    expect(lastBpm(isPiece('unknown'), withEntries)).toBeUndefined();
  });
});
