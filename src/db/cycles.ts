import { useLiveQuery } from 'dexie-react-hooks';
import type { Cycle, Id } from '../domain/model';
import { db } from './database';
import { deleteRecord, newRecord } from './records';

export type CycleDetails = Pick<Cycle, 'name' | 'startDate' | 'lengthDays' | 'goals'>;

export async function createCycle(details: CycleDetails): Promise<Cycle> {
  const cycle: Cycle = newRecord({ ...details, reflection: '' });
  await db.cycles.add(cycle);
  return cycle;
}

/** Applies a change to the latest stored cycle (safe for several quick changes). */
export async function mutateCycle(id: Id, change: (cycle: Cycle) => Cycle): Promise<void> {
  await db.transaction('rw', db.cycles, async () => {
    const cycle = await db.cycles.get(id);
    if (cycle) await db.cycles.put({ ...change(cycle), updatedAt: Date.now() });
  });
}

/**
 * Closes a cycle after its review. With `lengthDays`, a cycle finished early is shortened
 * to the days it actually ran.
 */
export function closeCycle(id: Id, reflection: string, lengthDays?: number): Promise<void> {
  return mutateCycle(id, (cycle) => ({
    ...cycle,
    reflection,
    closedAt: Date.now(),
    ...(lengthDays !== undefined ? { lengthDays } : {}),
  }));
}

export function deleteCycle(id: Id): Promise<void> {
  return deleteRecord('cycles', id);
}

/** All cycles, newest first. */
export function useCycles(): Cycle[] | undefined {
  return useLiveQuery(() => db.cycles.orderBy('startDate').reverse().toArray(), []);
}

/** The cycle, `null` if it doesn't exist, `undefined` while loading. */
export function useCycle(id: Id): Cycle | null | undefined {
  return useLiveQuery(async () => (await db.cycles.get(id)) ?? null, [id]);
}
