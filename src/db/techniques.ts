import { useLiveQuery } from 'dexie-react-hooks';
import type { Id, TechniqueItem } from '../domain/model';
import { db } from './database';
import { deleteRecord, newRecord } from './records';

export interface TechniqueDetails {
  name: string;
  category: string;
  notes: string;
}

export async function createTechnique(details: TechniqueDetails): Promise<TechniqueItem> {
  const item: TechniqueItem = newRecord({ ...details, focusNote: '', archived: false });
  await db.techniqueItems.add(item);
  return item;
}

export async function updateTechnique(
  id: Id,
  changes: Partial<TechniqueDetails & Pick<TechniqueItem, 'focusNote' | 'archived'>>,
): Promise<void> {
  await db.transaction('rw', db.techniqueItems, async () => {
    const item = await db.techniqueItems.get(id);
    if (item) await db.techniqueItems.put({ ...item, ...changes, updatedAt: Date.now() });
  });
}

export function deleteTechnique(id: Id): Promise<void> {
  return deleteRecord('techniqueItems', id);
}

/** All technique items (archived ones too), by category and name. */
export function useTechniqueItems(): TechniqueItem[] | undefined {
  return useLiveQuery(async () => {
    const items = await db.techniqueItems.toArray();
    return items.sort(
      (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    );
  }, []);
}
