import { useLiveQuery } from 'dexie-react-hooks';
import type { Id, SectionType } from '../domain/model';
import type { SectionOrder } from '../domain/session';
import { db } from './database';
import { newRecord } from './records';

/** All section types in their order, including archived ones (old sessions use them). */
export function useSectionTypes(): SectionType[] | undefined {
  return useLiveQuery(() => db.sectionTypes.orderBy('order').toArray(), []);
}

export function sectionOrder(types: readonly SectionType[]): SectionOrder {
  return new Map(types.map((type) => [type.id, type.order]));
}

export async function addSectionType(name: string): Promise<void> {
  await db.transaction('rw', db.sectionTypes, async () => {
    const last = await db.sectionTypes.orderBy('order').last();
    await db.sectionTypes.add(
      newRecord({ name: name.trim(), order: (last?.order ?? -1) + 1, archived: false }),
    );
  });
}

export async function updateSectionType(
  id: Id,
  changes: Partial<Pick<SectionType, 'name' | 'archived'>>,
): Promise<void> {
  await db.transaction('rw', db.sectionTypes, async () => {
    const type = await db.sectionTypes.get(id);
    if (type) await db.sectionTypes.put({ ...type, ...changes, updatedAt: Date.now() });
  });
}

/** Swaps a section type with its visible neighbour above (-1) or below (1). */
export async function moveSectionType(id: Id, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.sectionTypes, async () => {
    const types = (await db.sectionTypes.orderBy('order').toArray()).filter((t) => !t.archived);
    const index = types.findIndex((t) => t.id === id);
    const other = types[index + direction];
    if (index === -1 || !other) return;
    const now = Date.now();
    const current = types[index];
    await db.sectionTypes.bulkPut([
      { ...current, order: other.order, updatedAt: now },
      { ...other, order: current.order, updatedAt: now },
    ]);
  });
}
