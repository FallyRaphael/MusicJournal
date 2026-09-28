import { beforeEach, describe, expect, it } from 'vitest';
import { closeCycle, createCycle, deleteCycle, mutateCycle } from './cycles';
import { db } from './database';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

const details = { name: 'Autumn', startDate: '2026-09-28', lengthDays: 28, goals: [] };

describe('cycles in the database', () => {
  it('closes a cycle with its reflection', async () => {
    const cycle = await createCycle(details);
    await closeCycle(cycle.id, 'Went well');
    const stored = await db.cycles.get(cycle.id);
    expect(stored?.closedAt).toBeDefined();
    expect(stored?.reflection).toBe('Went well');
    expect(stored?.lengthDays).toBe(28);
  });

  it('shortens a cycle finished early', async () => {
    const cycle = await createCycle(details);
    await closeCycle(cycle.id, '', 10);
    expect((await db.cycles.get(cycle.id))?.lengthDays).toBe(10);
  });

  it('keeps quick goal changes and deletes with a tombstone', async () => {
    const cycle = await createCycle(details);
    const goal = (id: string) => ({
      id,
      ref: { kind: 'piece' as const, pieceId: 'p' },
      kind: 'check' as const,
      label: id,
      done: false,
    });
    await Promise.all([
      mutateCycle(cycle.id, (c) => ({ ...c, goals: [...c.goals, goal('a')] })),
      mutateCycle(cycle.id, (c) => ({ ...c, goals: [...c.goals, goal('b')] })),
    ]);
    expect((await db.cycles.get(cycle.id))?.goals.map((g) => g.id)).toEqual(['a', 'b']);

    await deleteCycle(cycle.id);
    expect(await db.cycles.get(cycle.id)).toBeUndefined();
    expect((await db.tombstones.get(cycle.id))?.table).toBe('cycles');
  });
});
