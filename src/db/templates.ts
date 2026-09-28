import { useLiveQuery } from 'dexie-react-hooks';
import type { Id, SessionTemplate } from '../domain/model';
import { toTemplateSections, type PlanSection } from '../domain/session';
import { db } from './database';
import { deleteRecord, newRecord } from './records';

export async function createTemplate(
  name: string,
  sections: readonly PlanSection[],
): Promise<SessionTemplate> {
  const template: SessionTemplate = newRecord({ name, sections: toTemplateSections(sections) });
  await db.templates.add(template);
  return template;
}

/** Applies a change to the latest stored template (safe for several quick changes). */
export async function mutateTemplate(
  id: Id,
  change: (template: SessionTemplate) => SessionTemplate,
): Promise<void> {
  await db.transaction('rw', db.templates, async () => {
    const template = await db.templates.get(id);
    if (template) await db.templates.put({ ...change(template), updatedAt: Date.now() });
  });
}

export function deleteTemplate(id: Id): Promise<void> {
  return deleteRecord('templates', id);
}

/** Templates by name. */
export function useTemplates(): SessionTemplate[] | undefined {
  return useLiveQuery(async () => {
    const templates = await db.templates.toArray();
    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }, []);
}

/** The template, `null` if it doesn't exist, `undefined` while loading. */
export function useTemplate(id: Id): SessionTemplate | null | undefined {
  return useLiveQuery(async () => (await db.templates.get(id)) ?? null, [id]);
}
