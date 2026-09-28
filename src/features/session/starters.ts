import { createSession } from '../../db/sessions';
import type { DateKey } from '../../domain/dates';
import type { Session, SessionTemplate } from '../../domain/model';
import { planItems, toSessionSections, type PlanSection } from '../../domain/session';

/** Navigation state for a session opened with one tap (see StageScreen). */
export const QUICK_START = { quickStart: true } as const;

export function sessionFromTemplate(template: SessionTemplate, date: DateKey): Promise<Session> {
  return createSession({
    date,
    status: 'planned',
    name: template.name,
    templateId: template.id,
    sections: toSessionSections(template.sections),
  });
}

/** A new session with the same items and budgets as an earlier one. */
export function sessionLike(previous: Session, date: DateKey): Promise<Session> {
  return createSession({
    date,
    status: 'planned',
    ...(previous.name ? { name: previous.name } : {}),
    ...(previous.templateId ? { templateId: previous.templateId } : {}),
    sections: toSessionSections(previous.sections),
  });
}

export function emptySession(date: DateKey): Promise<Session> {
  return createSession({ date, status: 'planned', sections: [] });
}

/** "4 items · 45 min" */
export function planSummary(sections: readonly PlanSection[]): string {
  const items = planItems(sections);
  const minutes = items.reduce((sum, { item }) => sum + (item.budgetMinutes ?? 0), 0);
  const count = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;
  return minutes > 0 ? `${count} · ${minutes} min` : count;
}
