import { describe, expect, it } from 'vitest';
import {
  backupDue,
  createBackupFile,
  hasChanges,
  mergeData,
  parseBackupFile,
  replaceSummary,
  type BackupData,
} from './backup';
import type { Piece } from './model';

function piece(id: string, updatedAt: number, title = id): Piece {
  return {
    id,
    createdAt: 0,
    updatedAt,
    title,
    composer: '',
    tags: [],
    status: 'learning',
    statusHistory: [{ status: 'learning', at: 0 }],
    notes: '',
    focusNote: '',
  };
}

function data(overrides: Partial<BackupData> = {}): BackupData {
  return {
    pieces: [],
    techniqueItems: [],
    books: [],
    sectionTypes: [],
    templates: [],
    sessions: [],
    cycles: [],
    settings: [],
    tombstones: [],
    ...overrides,
  };
}

describe('parseBackupFile', () => {
  it('reads version 1 files, which have no books', () => {
    const withoutBooks: Partial<BackupData> = data();
    delete withoutBooks.books;
    const file = { ...createBackupFile(data(), 1), formatVersion: 1, data: withoutBooks };
    const parsed = parseBackupFile(JSON.stringify(file));
    expect(parsed.ok && parsed.file.data.books).toEqual([]);
  });

  it('reads back what was exported', () => {
    const file = createBackupFile(data({ pieces: [piece('a', 1, 'Nocturne')] }), 123);
    const parsed = parseBackupFile(JSON.stringify(file));
    expect(parsed.ok && parsed.file.data.pieces[0].title).toBe('Nocturne');
    expect(parsed.ok && parsed.file.exportedAt).toBe(123);
  });

  it('keeps fields it doesn’t know', () => {
    const file = createBackupFile(
      data({ pieces: [{ ...piece('a', 1), future: 'x' } as Piece] }),
      1,
    );
    const parsed = parseBackupFile(JSON.stringify(file));
    expect(parsed.ok && (parsed.file.data.pieces[0] as unknown as { future: string }).future).toBe(
      'x',
    );
  });

  it('rejects other files with a clear reason', () => {
    expect(parseBackupFile('not json')).toEqual({
      ok: false,
      error: expect.stringContaining('not JSON'),
    });
    expect(parseBackupFile('{"hello": 1}')).toEqual({
      ok: false,
      error: 'This file isn’t a Practice Journal backup.',
    });
  });

  it('rejects backups from a newer app version', () => {
    const file = { ...createBackupFile(data(), 1), formatVersion: 99 };
    const parsed = parseBackupFile(JSON.stringify(file));
    expect(!parsed.ok && parsed.error).toContain('newer version');
  });

  it('points to damaged records', () => {
    const broken = createBackupFile(data({ pieces: [{ ...piece('a', 1), title: 5 } as never] }), 1);
    const parsed = parseBackupFile(JSON.stringify(broken));
    expect(!parsed.ok && parsed.error).toContain('pieces.0.title');
  });
});

describe('mergeData', () => {
  it('adds records that only exist in the backup and keeps local-only ones', () => {
    const { result, summary } = mergeData(
      data({ pieces: [piece('local', 5)] }),
      data({ pieces: [piece('backup', 5)] }),
    );
    expect(result.pieces.map((p) => p.id).sort()).toEqual(['backup', 'local']);
    expect(summary.pieces).toEqual({ added: 1, updated: 0, removed: 0 });
  });

  it('takes the newer version of a record present on both sides', () => {
    const newer = mergeData(
      data({ pieces: [piece('a', 5, 'old')] }),
      data({ pieces: [piece('a', 9, 'new')] }),
    );
    expect(newer.result.pieces[0].title).toBe('new');
    expect(newer.summary.pieces.updated).toBe(1);

    const older = mergeData(
      data({ pieces: [piece('a', 9, 'local')] }),
      data({ pieces: [piece('a', 5, 'backup')] }),
    );
    expect(older.result.pieces[0].title).toBe('local');
    expect(hasChanges(older.summary)).toBe(false);
  });

  it('does not bring back records deleted after the backup', () => {
    const { result } = mergeData(
      data({ tombstones: [{ id: 'a', table: 'pieces', deletedAt: 10 }] }),
      data({ pieces: [piece('a', 5)] }),
    );
    expect(result.pieces).toEqual([]);
    expect(result.tombstones).toHaveLength(1);
  });

  it('applies deletions from the backup unless the record changed later', () => {
    const { result, summary } = mergeData(
      data({ pieces: [piece('gone', 5), piece('edited', 20)] }),
      data({
        tombstones: [
          { id: 'gone', table: 'pieces', deletedAt: 10 },
          { id: 'edited', table: 'pieces', deletedAt: 10 },
        ],
      }),
    );
    expect(result.pieces.map((p) => p.id)).toEqual(['edited']);
    expect(summary.pieces.removed).toBe(1);
    expect(result.tombstones.map((t) => t.id)).toEqual(['gone']);
  });
});

describe('backupDue', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = 100 * DAY;

  it('reminds two weeks after the last backup', () => {
    expect(backupDue({ hasData: true, lastBackupAt: now - 10 * DAY, dataSince: 0, now })).toBe(
      false,
    );
    expect(backupDue({ hasData: true, lastBackupAt: now - 15 * DAY, dataSince: 0, now })).toBe(
      true,
    );
  });

  it('counts from the start when there never was a backup', () => {
    expect(backupDue({ hasData: true, dataSince: now - 3 * DAY, now })).toBe(false);
    expect(backupDue({ hasData: true, dataSince: now - 20 * DAY, now })).toBe(true);
  });

  it('stays quiet without data or while snoozed', () => {
    expect(backupDue({ hasData: false, dataSince: 0, now })).toBe(false);
    expect(backupDue({ hasData: true, dataSince: 0, snoozedUntil: now + DAY, now })).toBe(false);
  });
});

describe('replaceSummary', () => {
  it('counts records the backup brings, changes and removes', () => {
    const summary = replaceSummary(
      data({ pieces: [piece('same', 1), piece('changed', 1), piece('extra', 1)] }),
      data({ pieces: [piece('same', 1), piece('changed', 2), piece('restored', 1)] }),
    );
    expect(summary.pieces).toEqual({ added: 1, updated: 1, removed: 1 });
    expect(hasChanges(replaceSummary(data(), data()))).toBe(false);
  });
});
