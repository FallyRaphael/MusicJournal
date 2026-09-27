import { beforeEach, describe, expect, it } from 'vitest';
import { SETTINGS_ID } from '../domain/model';
import { db } from './database';
import { DEFAULT_METHODS, DEFAULT_SECTION_NAMES } from './defaults';
import { deleteRecord, newRecord } from './records';
import { updateSettings } from './settings';

// Tests run against an in-memory IndexedDB (fake-indexeddb, see vite.config.ts).
beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('a new database', () => {
  it('starts with the default section types in order', async () => {
    const sections = await db.sectionTypes.orderBy('order').toArray();
    expect(sections.map((s) => s.name)).toEqual(DEFAULT_SECTION_NAMES);
  });

  it('starts with default settings', async () => {
    const settings = await db.settings.get(SETTINGS_ID);
    expect(settings?.weeklyTarget).toBe(4);
    expect(settings?.methods).toEqual(DEFAULT_METHODS);
  });
});

describe('updateSettings', () => {
  it('changes only the given fields and bumps updatedAt', async () => {
    const before = await db.settings.get(SETTINGS_ID);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await updateSettings({ weeklyTarget: 5 });
    const after = await db.settings.get(SETTINGS_ID);
    expect(after?.weeklyTarget).toBe(5);
    expect(after?.methods).toEqual(DEFAULT_METHODS);
    expect(after!.updatedAt).toBeGreaterThan(before!.updatedAt);
  });

  it('recreates missing settings from the defaults', async () => {
    await db.settings.clear();
    await updateSettings({ weeklyTarget: 2 });
    expect((await db.settings.get(SETTINGS_ID))?.weeklyTarget).toBe(2);
  });
});

describe('deleteRecord', () => {
  it('removes the record and leaves a tombstone', async () => {
    const technique = newRecord({
      name: 'Hanon No. 1',
      category: 'Exercises',
      notes: '',
      focusNote: '',
      archived: false,
    });
    await db.techniqueItems.add(technique);

    await deleteRecord('techniqueItems', technique.id);

    expect(await db.techniqueItems.get(technique.id)).toBeUndefined();
    const tombstone = await db.tombstones.get(technique.id);
    expect(tombstone?.table).toBe('techniqueItems');
  });
});
