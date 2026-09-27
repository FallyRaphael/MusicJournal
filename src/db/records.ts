import { newId } from '../domain/ids';
import type { BaseRecord, Id, SyncedTable, Timestamp } from '../domain/model';
import { db } from './database';

/** Adds id and timestamps to the fields of a new record. */
export function newRecord<T extends object>(
  fields: T,
  now: Timestamp = Date.now(),
): T & BaseRecord {
  return { ...fields, id: newId(), createdAt: now, updatedAt: now };
}

/** Deletes a record and leaves a tombstone, so a later backup merge won't restore it. */
export async function deleteRecord(table: SyncedTable, id: Id): Promise<void> {
  await db.transaction('rw', db.table(table), db.tombstones, async () => {
    await db.table(table).delete(id);
    await db.tombstones.put({ id, table, deletedAt: Date.now() });
  });
}
