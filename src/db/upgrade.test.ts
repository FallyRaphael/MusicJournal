import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { PracticeDatabase } from './database';

describe('schema upgrades', () => {
  it('upgrades a version 2 database: sessions keep their data and get a book index', async () => {
    const name = 'upgrade-test';
    const old = new Dexie(name);
    old.version(1).stores({
      pieces: 'id, status, updatedAt, *tags',
      techniqueItems: 'id, updatedAt',
      sectionTypes: 'id, order',
      templates: 'id, updatedAt',
      sessions: 'id, date, status, updatedAt, *pieceIds, *techniqueIds',
      cycles: 'id, startDate',
      settings: 'id',
      tombstones: 'id, table',
    });
    old.version(2).stores({ snapshots: 'id' });
    await old.table('sessions').add({ id: 's1', date: '2026-10-01', pieceIds: ['p1'] });
    old.close();

    const db = new PracticeDatabase(name);
    const session = await db.sessions.get('s1');
    expect(session?.pieceIds).toEqual(['p1']);
    expect(session?.bookIds).toEqual([]);
    expect(await db.books.count()).toBe(0);
    db.close();
    await Dexie.delete(name);
  });
});
