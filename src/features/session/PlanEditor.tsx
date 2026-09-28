import { ArrowDown, ArrowUp, Ellipsis, ListPlus, Minus, Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Id, ItemRef } from '../../domain/model';
import {
  addPlanItem,
  movePlanItem,
  removePlanItem,
  type PlanItem,
  type PlanSection,
} from '../../domain/session';
import { ActionList } from '../../ui/ActionList';
import { Button, IconButton } from '../../ui/Button';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { EmptyState } from '../../ui/Screen';
import { Sheet } from '../../ui/Sheet';
import { ItemPicker } from './ItemPicker';
import type { Lookups } from './lookups';
import styles from './PlanEditor.module.css';

interface PlanEditorProps<T extends PlanItem> {
  sections: readonly PlanSection<T>[];
  /**
   * Receives a change to apply to the latest sections. (Not the new sections themselves:
   * several quick changes in a row must not overwrite each other.)
   */
  onChange: (update: (sections: PlanSection<T>[]) => PlanSection<T>[]) => void;
  createItem: (ref: ItemRef) => T;
  /** The per-item time control: a budget stepper, or minutes practiced. */
  timeControl: (item: T) => ReactNode;
  /** Replaces the default removal, e.g. to ask first or to stop a running timer. */
  onRemoveItem?: (item: T) => void;
  lookups: Lookups;
  emptyText?: string;
}

/** Edits the sections and items of a session or template. */
export function PlanEditor<T extends PlanItem>({
  sections,
  onChange,
  createItem,
  timeControl,
  onRemoveItem,
  lookups,
  emptyText = 'Add the pieces, technique and other things you want to practice.',
}: PlanEditorProps<T>) {
  const [picker, setPicker] = useState<{ sectionTypeId?: Id } | null>(null);
  // Changes on every opening, so the picker starts fresh.
  const [pickerKey, setPickerKey] = useState(0);
  const [menuItem, setMenuItem] = useState<T | null>(null);

  const openPicker = (sectionTypeId?: Id) => {
    setPickerKey((k) => k + 1);
    setPicker({ sectionTypeId });
  };

  return (
    <div className={styles.editor}>
      {sections.length === 0 ? (
        <EmptyState icon={<ListPlus size={24} aria-hidden="true" />} title="Nothing planned yet">
          {emptyText}
        </EmptyState>
      ) : (
        sections.map((section) => (
          <section
            key={section.id}
            className={styles.section}
            aria-label={lookups.sectionName(section.sectionTypeId)}
          >
            <header className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{lookups.sectionName(section.sectionTypeId)}</h2>
              <IconButton
                label={`Add to ${lookups.sectionName(section.sectionTypeId)}`}
                onClick={() => openPicker(section.sectionTypeId)}
              >
                <Plus size={20} />
              </IconButton>
            </header>
            <ul className={styles.items}>
              {section.items.map((item) => {
                const info = lookups.info(item.ref);
                return (
                  <li key={item.id} className={styles.item}>
                    <div className={styles.itemTop}>
                      <span className={styles.itemText}>
                        <span
                          className={
                            info.missing
                              ? `${styles.itemTitle} ${styles.missing}`
                              : styles.itemTitle
                          }
                        >
                          <NoBreakKeys text={info.title} />
                        </span>
                        {info.subtitle && <span className={styles.itemSub}>{info.subtitle}</span>}
                      </span>
                      <IconButton
                        label={`Options for ${info.title}`}
                        onClick={() => setMenuItem(item)}
                      >
                        <Ellipsis size={20} />
                      </IconButton>
                    </div>
                    <div className={styles.itemTime}>{timeControl(item)}</div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <Button icon={<Plus size={18} aria-hidden="true" />} onClick={() => openPicker()}>
        Add item
      </Button>

      {picker && (
        <ItemPicker
          key={pickerKey}
          open
          onClose={() => setPicker(null)}
          lookups={lookups}
          sectionTypeId={picker.sectionTypeId}
          onAdd={(sectionTypeId, ref) =>
            onChange((current) =>
              addPlanItem(current, sectionTypeId, createItem(ref), lookups.order),
            )
          }
        />
      )}

      <Sheet
        open={menuItem !== null}
        onClose={() => setMenuItem(null)}
        title={menuItem ? lookups.info(menuItem.ref).title : ''}
      >
        {menuItem && (
          <ActionList
            actions={[
              {
                label: 'Move up',
                icon: <ArrowUp size={20} />,
                onSelect: () => {
                  onChange((current) => movePlanItem(current, menuItem.id, -1));
                  setMenuItem(null);
                },
              },
              {
                label: 'Move down',
                icon: <ArrowDown size={20} />,
                onSelect: () => {
                  onChange((current) => movePlanItem(current, menuItem.id, 1));
                  setMenuItem(null);
                },
              },
              {
                label: 'Remove',
                icon: <Trash2 size={20} />,
                danger: true,
                onSelect: () => {
                  if (onRemoveItem) onRemoveItem(menuItem);
                  else onChange((current) => removePlanItem(current, menuItem.id));
                  setMenuItem(null);
                },
              },
            ]}
          />
        )}
      </Sheet>
    </div>
  );
}

interface BudgetControlProps {
  minutes: number;
  /** Receives a change to apply to the latest value, so fast taps all count. */
  onChange: (update: (minutes: number) => number) => void;
}

/** Time budget in 5-minute steps; 0 means no budget. */
export function BudgetControl({ minutes, onChange }: BudgetControlProps) {
  return (
    <div className={styles.budget} role="group" aria-label="Time budget">
      <IconButton
        label="Less time"
        variant="outline"
        disabled={minutes === 0}
        onClick={() => onChange((m) => Math.max(0, m - 5))}
      >
        <Minus size={18} />
      </IconButton>
      <output className={`${styles.budgetValue} tabular`} aria-live="polite">
        {minutes ? `${minutes} min` : 'No time limit'}
      </output>
      <IconButton
        label="More time"
        variant="outline"
        onClick={() => onChange((m) => Math.min(240, m + 5))}
      >
        <Plus size={18} />
      </IconButton>
    </div>
  );
}

interface SpentControlProps {
  seconds: number;
  onChange: (seconds: number) => void;
}

/** Minutes practiced, for logging a session after the fact. */
export function SpentControl({ seconds, onChange }: SpentControlProps) {
  const minutes = Math.round(seconds / 60);
  return (
    <label className={styles.spent}>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={1440}
        className={styles.spentInput}
        value={minutes === 0 ? '' : minutes}
        placeholder="0"
        onChange={(event) => {
          const value = Number(event.target.value);
          onChange(
            Number.isFinite(value) && value > 0 ? Math.min(1440, Math.round(value)) * 60 : 0,
          );
        }}
      />
      <span className={styles.spentUnit}>min practiced</span>
    </label>
  );
}
