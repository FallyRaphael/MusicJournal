import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { changePieceStatus, createPiece, deletePiece, updatePiece } from './pieces';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

const details = { title: 'Nocturne', composer: 'Chopin', tags: [], notes: '' };

describe('pieces in the database', () => {
  it('creates a piece with its first status period', async () => {
    const piece = await createPiece(details, 'upNext');
    const stored = await db.pieces.get(piece.id);
    expect(stored?.status).toBe('upNext');
    expect(stored?.statusHistory).toHaveLength(1);
    expect(stored?.focusNote).toBe('');
  });

  it('removes cleared optional fields on update', async () => {
    const piece = await createPiece(
      { ...details, feel: 'hard', targetDate: '2026-12-01' },
      'learning',
    );
    await updatePiece(piece.id, { feel: undefined, targetDate: undefined, focusNote: 'LH jumps' });
    const stored = await db.pieces.get(piece.id);
    expect(stored).not.toHaveProperty('feel');
    expect(stored).not.toHaveProperty('targetDate');
    expect(stored?.focusNote).toBe('LH jumps');
    expect(stored!.updatedAt).toBeGreaterThanOrEqual(piece.updatedAt);
  });

  it('records status changes as history', async () => {
    const piece = await createPiece(details, 'learning');
    await changePieceStatus(piece.id, 'shelved', 'partlyLearned');
    await changePieceStatus(piece.id, 'learning');
    const stored = await db.pieces.get(piece.id);
    expect(stored?.status).toBe('learning');
    expect(stored?.statusHistory.map((c) => c.status)).toEqual(['learning', 'shelved', 'learning']);
    expect(stored?.statusHistory[1].outcome).toBe('partlyLearned');
  });

  it('deletes with a tombstone', async () => {
    const piece = await createPiece(details, 'learning');
    await deletePiece(piece.id);
    expect(await db.pieces.get(piece.id)).toBeUndefined();
    expect((await db.tombstones.get(piece.id))?.table).toBe('pieces');
  });
});
