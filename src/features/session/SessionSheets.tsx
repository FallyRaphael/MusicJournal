import { ListChecks, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { createTemplate } from '../../db/templates';
import type { Id, PracticeEntry, Session } from '../../domain/model';
import { planItems, runningItem, type PlanSection } from '../../domain/session';
import { itemSeconds } from '../../domain/timer';
import { formatClock } from '../../lib/format';
import { Button, IconButton } from '../../ui/Button';
import { TextInput } from '../../ui/Field';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { Sheet } from '../../ui/Sheet';
import type { Lookups } from './lookups';
import styles from './SessionSheets.module.css';

interface AllItemsSheetProps {
  open: boolean;
  onClose: () => void;
  session: Session;
  currentId?: Id;
  now: number;
  lookups: Lookups;
  onSelect: (itemId: Id) => void;
  onAddItem: () => void;
  onEditPlan: () => void;
}

/** The whole session at a glance; tap an item to go there. */
export function AllItemsSheet(props: AllItemsSheetProps) {
  const { session, currentId, now, lookups } = props;
  const running = runningItem(session);
  return (
    <Sheet
      open={props.open}
      onClose={props.onClose}
      title="All items"
      footer={
        <>
          <Button icon={<Plus size={18} aria-hidden="true" />} onClick={props.onAddItem}>
            Add item
          </Button>
          <Button icon={<Pencil size={18} aria-hidden="true" />} onClick={props.onEditPlan}>
            Edit plan
          </Button>
        </>
      }
    >
      {session.sections.map((section) => (
        <section key={section.id} className={styles.group}>
          <h3 className={styles.groupTitle}>{lookups.sectionName(section.sectionTypeId)}</h3>
          <ul className={styles.rows}>
            {section.items.map((item) => {
              const info = lookups.info(item.ref);
              const seconds = itemSeconds(item, now);
              const isCurrent = item.id === currentId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={isCurrent ? `${styles.row} ${styles.current}` : styles.row}
                    aria-current={isCurrent ? 'step' : undefined}
                    onClick={() => props.onSelect(item.id)}
                  >
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>
                        <NoBreakKeys text={info.title} />
                      </span>
                      {!!item.budgetMinutes && (
                        <span className={styles.rowSub}>{item.budgetMinutes} min planned</span>
                      )}
                    </span>
                    {running?.id === item.id && (
                      <Play
                        size={14}
                        fill="currentColor"
                        className={styles.runningIcon}
                        aria-label="Running"
                      />
                    )}
                    <span className={`${styles.rowTime} tabular`}>
                      {seconds > 0 ? formatClock(seconds) : '–'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {planItems(session.sections).length === 0 && <p className={styles.muted}>No items yet.</p>}
    </Sheet>
  );
}

interface EntriesSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  entries: readonly PracticeEntry[];
  describe: (entry: PracticeEntry) => string;
  onDelete: (entryId: Id) => void;
}

const timeOfDay = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

/** The entries logged for one item, newest first, with delete buttons. */
export function EntriesSheet({
  open,
  onClose,
  title,
  entries,
  describe,
  onDelete,
}: EntriesSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {entries.length === 0 ? (
        <p className={styles.muted}>Nothing logged.</p>
      ) : (
        <ul className={styles.entries}>
          {[...entries].reverse().map((entry) => (
            <li key={entry.id} className={styles.entry}>
              <span className={styles.entryTime}>{timeOfDay.format(entry.at)}</span>
              <span className={styles.entryText}>
                {describe(entry) && <span className={styles.entryMain}>{describe(entry)}</span>}
                {entry.note && <span className={styles.entryNote}>{entry.note}</span>}
              </span>
              <IconButton label="Delete entry" onClick={() => onDelete(entry.id)}>
                <Trash2 size={18} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

interface SaveTemplateSheetProps {
  open: boolean;
  onClose: () => void;
  initialName: string;
  sections: readonly PlanSection[];
  onSaved: (name: string) => void;
}

/** Saves the items of a session as a reusable template. Mount with a changing `key`. */
export function SaveTemplateSheet({
  open,
  onClose,
  initialName,
  sections,
  onSaved,
}: SaveTemplateSheetProps) {
  const [name, setName] = useState(initialName);
  const save = async () => {
    const clean = name.trim();
    if (!clean) return;
    await createTemplate(clean, sections);
    onSaved(clean);
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Save as template"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon={<ListChecks size={18} aria-hidden="true" />}
            disabled={!name.trim()}
            onClick={() => void save()}
          >
            Save
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <TextInput
          label="Template name"
          placeholder="e.g. Full routine"
          value={name}
          data-autofocus
          hint="Keeps the items and time budgets, so you can start this session again with one tap."
          onChange={(event) => setName(event.target.value)}
        />
      </form>
    </Sheet>
  );
}
