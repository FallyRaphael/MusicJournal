import Dexie, { type EntityTable } from 'dexie';
import type { BackupData } from '../domain/backup';
import type {
  Cycle,
  Piece,
  SectionType,
  Session,
  SessionTemplate,
  Settings,
  TechniqueItem,
  Timestamp,
  Tombstone,
} from '../domain/model';
import { defaultSectionTypes, defaultSettings } from './defaults';

export const DB_NAME = 'practice-journal';

/** A copy of all data taken right before an import, so the import can be undone. */
export interface Snapshot {
  id: string;
  takenAt: Timestamp;
  data: BackupData;
}

export class PracticeDatabase extends Dexie {
  pieces!: EntityTable<Piece, 'id'>;
  techniqueItems!: EntityTable<TechniqueItem, 'id'>;
  sectionTypes!: EntityTable<SectionType, 'id'>;
  templates!: EntityTable<SessionTemplate, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  cycles!: EntityTable<Cycle, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  tombstones!: EntityTable<Tombstone, 'id'>;
  snapshots!: EntityTable<Snapshot, 'id'>;

  constructor(name = DB_NAME) {
    super(name);

    // Schema history. Never edit a released version: add a new `this.version(n)` with an
    // upgrade function instead, so existing data on the phone is migrated.
    // Only indexed fields are listed; `*` marks an index over each array element.
    this.version(1).stores({
      pieces: 'id, status, updatedAt, *tags',
      techniqueItems: 'id, updatedAt',
      sectionTypes: 'id, order',
      templates: 'id, updatedAt',
      sessions: 'id, date, status, updatedAt, *pieceIds, *techniqueIds',
      cycles: 'id, startDate',
      settings: 'id',
      tombstones: 'id, table',
    });

    // v2: snapshot before an import (not part of backups).
    this.version(2).stores({ snapshots: 'id' });

    // Runs once, when the database is first created on a device.
    this.on('populate', (tx) => {
      const now = Date.now();
      void tx.table('sectionTypes').bulkAdd(defaultSectionTypes(now));
      void tx.table('settings').add(defaultSettings(now));
    });
  }
}

export const db = new PracticeDatabase();
