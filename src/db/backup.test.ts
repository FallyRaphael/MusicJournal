import { beforeEach, describe, expect, it } from 'vitest';
import { createBackupFile, parseBackupFile } from '../domain/backup';
import { importData, readAllData, undoLastImport } from './backup';
import { db } from './database';
import { createBook } from './books';
import { createPiece, deletePiece, updatePiece } from './pieces';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

const details = (title: string) => ({ title, composer: '', tags: [], notes: '' });

/** Exports the current data and reads it back, like a real backup file would be. */
async function backup() {
  const parsed = parseBackupFile(JSON.stringify(createBackupFile(await readAllData(), Date.now())));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.file.data;
}

describe('backup and restore', () => {
  it('exports everything, including default section types and settings', async () => {
    await createPiece(details('Nocturne'), 'learning');
    const data = await backup();
    expect(data.pieces).toHaveLength(1);
    expect(data.sectionTypes.map((t) => t.id)).toContain('section-repertoire');
    expect(data.settings).toHaveLength(1);
  });

  it('merges a backup into changed data without losing anything', async () => {
    const kept = await createPiece(details('Nocturne'), 'learning');
    const snapshot = await backup();

    // After the backup: a new piece, and the old one edited.
    await createPiece(details('Clair de lune'), 'learning');
    await updatePiece(kept.id, { notes: 'edited later' });

    const summary = await importData(snapshot, 'merge');
    const pieces = await db.pieces.toArray();
    expect(pieces.map((p) => p.title).sort()).toEqual(['Clair de lune', 'Nocturne']);
    expect(pieces.find((p) => p.id === kept.id)?.notes).toBe('edited later');
    expect(summary?.pieces).toEqual({ added: 0, updated: 0, removed: 0 });
  });

  it('restores deleted records only with replace, and keeps deletions with merge', async () => {
    const piece = await createPiece(details('Nocturne'), 'learning');
    const snapshot = await backup();
    await deletePiece(piece.id);

    await importData(snapshot, 'merge');
    expect(await db.pieces.count()).toBe(0);

    await importData(snapshot, 'replace');
    expect((await db.pieces.get(piece.id))?.title).toBe('Nocturne');
  });

  it('can undo the last import', async () => {
    await createPiece(details('Before'), 'learning');
    const before = await backup();
    const other = { ...before, pieces: [] };

    await importData(other, 'replace');
    expect(await db.pieces.count()).toBe(0);
    expect(await db.snapshots.count()).toBe(1);

    await undoLastImport();
    expect((await db.pieces.toArray()).map((p) => p.title)).toEqual(['Before']);
    expect(await db.snapshots.count()).toBe(0);
  });

  it('backs up and restores books', async () => {
    await createBook({ name: 'Sight-reading book', total: 500, notes: '' });
    const snapshot = await backup();
    expect(snapshot.books).toHaveLength(1);
    await db.books.clear();
    await importData(snapshot, 'merge');
    expect((await db.books.toArray()).map((b) => b.total)).toEqual([500]);
  });

  it('keeps the section types if a replaced backup has none', async () => {
    const data = await backup();
    await importData({ ...data, sectionTypes: [] }, 'replace');
    expect(await db.sectionTypes.count()).toBe(5);
  });
});
