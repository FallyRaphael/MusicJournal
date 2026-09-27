import { useLiveQuery } from 'dexie-react-hooks';
import { SETTINGS_ID, type Settings } from '../domain/model';
import { db } from './database';
import { defaultSettings } from './defaults';

type EditableSettings = Partial<Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>>;

/** Shown while the database is loading, so screens never have to handle "no settings". */
const FALLBACK = defaultSettings(0);

/** The current settings; re-renders automatically when they change. */
export function useSettings(): Settings {
  return useLiveQuery(() => db.settings.get(SETTINGS_ID), []) ?? FALLBACK;
}

export async function updateSettings(changes: EditableSettings): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const now = Date.now();
    const current = (await db.settings.get(SETTINGS_ID)) ?? defaultSettings(now);
    await db.settings.put({ ...current, ...changes, updatedAt: now });
  });
}
