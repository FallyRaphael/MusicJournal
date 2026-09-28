import { SYNCED_TABLES, type BackupData, type ImportSummary } from '../../domain/backup';
import type { SyncedTable } from '../../domain/model';

const NAMES: Record<SyncedTable, [one: string, many: string]> = {
  pieces: ['piece', 'pieces'],
  techniqueItems: ['technique item', 'technique items'],
  sectionTypes: ['section type', 'section types'],
  templates: ['template', 'templates'],
  sessions: ['session', 'sessions'],
  cycles: ['cycle', 'cycles'],
  settings: ['setting', 'settings'],
};

/** "3 pieces", "1 session" */
export function countOf(table: SyncedTable, count: number): string {
  return `${count} ${NAMES[table][count === 1 ? 0 : 1]}`;
}

/** What a backup contains, e.g. "3 pieces · 12 sessions · 1 cycle". */
export function contentsLine(data: BackupData): string {
  const parts = (['pieces', 'sessions', 'cycles', 'templates'] as const)
    .filter((table) => data[table].length > 0)
    .map((table) => countOf(table, data[table].length));
  return parts.length > 0 ? parts.join(' · ') : 'no pieces or sessions';
}

/** One line per table an import would change, e.g. "Pieces: 3 new, 1 updated". */
export function changeLines(summary: ImportSummary): string[] {
  return SYNCED_TABLES.flatMap((table) => {
    const { added, updated, removed } = summary[table];
    if (table === 'settings') return updated > 0 ? ['Settings: updated'] : [];
    const parts = [
      added > 0 ? `${added} new` : '',
      updated > 0 ? `${updated} updated` : '',
      removed > 0 ? `${removed} removed` : '',
    ].filter(Boolean);
    if (parts.length === 0) return [];
    const label = NAMES[table][1];
    return [`${label[0].toUpperCase()}${label.slice(1)}: ${parts.join(', ')}`];
  });
}
