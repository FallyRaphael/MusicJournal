import { ChevronRight, Dumbbell, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTechniqueItems } from '../../db/techniques';
import type { TechniqueItem } from '../../domain/model';
import { BackButton } from '../../ui/BackButton';
import { Button, IconButton } from '../../ui/Button';
import { EmptyState, PageHeader, Screen } from '../../ui/Screen';
import { TechniqueSheet } from './TechniqueSheet';
import styles from './TechniqueScreen.module.css';

function byCategory(items: readonly TechniqueItem[]): [string, TechniqueItem[]][] {
  const groups = new Map<string, TechniqueItem[]>();
  for (const item of items) {
    const category = item.category || 'Other';
    groups.set(category, [...(groups.get(category) ?? []), item]);
  }
  return [...groups];
}

/** Technique items (scales, exercises, …) that can be added to sessions and goals. */
export function TechniqueScreen() {
  const items = useTechniqueItems();
  const [sheet, setSheet] = useState<{ item?: TechniqueItem } | null>(null);
  // Changes on every opening, so the sheet starts fresh.
  const [sheetKey, setSheetKey] = useState(0);

  if (items === undefined) return null;
  const active = items.filter((item) => !item.archived);
  const archived = items.filter((item) => item.archived);
  const openSheet = (item?: TechniqueItem) => {
    setSheetKey((k) => k + 1);
    setSheet({ item });
  };

  const row = (item: TechniqueItem) => (
    <li key={item.id}>
      <button type="button" className={styles.row} onClick={() => openSheet(item)}>
        <span className={styles.rowText}>
          <span className={styles.name}>{item.name}</span>
          {item.focusNote && <span className={styles.focus}>Focus: {item.focusNote}</span>}
        </span>
        <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
      </button>
    </li>
  );

  return (
    <Screen>
      <BackButton label="Back" fallback="/more" />
      <PageHeader
        title="Technique"
        actions={
          <IconButton label="New technique item" onClick={() => openSheet()}>
            <Plus size={24} />
          </IconButton>
        }
      />

      {active.length === 0 && (
        <>
          <EmptyState
            icon={<Dumbbell size={24} aria-hidden="true" />}
            title="No technique items yet"
          >
            Scales, arpeggios, exercises – anything you practice regularly besides pieces.
          </EmptyState>
          <Button variant="primary" size="lg" block onClick={() => openSheet()}>
            Add a technique item
          </Button>
        </>
      )}

      {byCategory(active).map(([category, list]) => (
        <section key={category} className={styles.group}>
          <h2 className={styles.groupTitle}>{category}</h2>
          <ul className={styles.list}>{list.map(row)}</ul>
        </section>
      ))}

      {archived.length > 0 && (
        <details className={styles.archived}>
          <summary className={styles.summary}>Archived ({archived.length})</summary>
          <ul className={styles.list}>{archived.map(row)}</ul>
        </details>
      )}

      {sheet && (
        <TechniqueSheet
          key={sheetKey}
          item={sheet.item}
          categories={[...new Set(items.map((i) => i.category).filter(Boolean))]}
          onClose={() => setSheet(null)}
        />
      )}
    </Screen>
  );
}
