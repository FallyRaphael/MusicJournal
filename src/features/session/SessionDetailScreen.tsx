import {
  CalendarDays,
  Clock,
  Ellipsis,
  ListChecks,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { deleteSession, mutateSession } from '../../db/sessions';
import { fromDateKey } from '../../domain/dates';
import type { Id, Session } from '../../domain/model';
import { sessionTime } from '../../domain/pieceStats';
import {
  addPlanItem,
  findItem,
  newSessionItem,
  removeEntry,
  removeSessionItem,
  sessionSeconds,
  setItemSeconds,
  updateSessionItem,
} from '../../domain/session';
import { itemSeconds } from '../../domain/timer';
import { formatDuration, formatLongDate } from '../../lib/format';
import { useGoBack } from '../../lib/navigation';
import { ActionList } from '../../ui/ActionList';
import { BackButton } from '../../ui/BackButton';
import { Button, IconButton } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { TextInput } from '../../ui/Field';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { Screen } from '../../ui/Screen';
import { Sheet } from '../../ui/Sheet';
import { MinutesSheet, TextSheet } from '../../ui/TextSheet';
import { ItemPicker } from './ItemPicker';
import { describeEntry, useLookups } from './lookups';
import styles from './SessionDetailScreen.module.css';
import { SaveTemplateSheet } from './SessionSheets';

type OpenSheet =
  | { kind: 'menu' | 'date' | 'note' | 'template' | 'delete' | 'picker' }
  | { kind: 'item' | 'time' | 'itemNote' | 'removeItem'; itemId: Id };

/** A finished session: what was practiced, with everything correctable afterwards. */
export function SessionDetailScreen({ session }: { session: Session }) {
  const goBack = useGoBack('/sessions');
  const lookups = useLookups();
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [date, setDate] = useState(session.date);

  // Finished sessions have no running timer, so any timestamp gives the same result.
  const now = session.finishedAt ?? session.updatedAt;
  const total = sessionSeconds(session, now);
  const open = (next: OpenSheet) => {
    setSheetKey((k) => k + 1);
    setSheet(next);
  };
  const close = () => setSheet(null);
  const change = (update: (s: Session, at: number) => Session) =>
    void mutateSession(session.id, (s) => update(s, Date.now()));

  const selectedId = sheet && 'itemId' in sheet ? sheet.itemId : undefined;
  const selected = selectedId ? findItem(session, selectedId) : undefined;
  const selectedTitle = selected ? lookups.info(selected.ref).title : '';

  if (!lookups.loaded) return null;

  return (
    <Screen>
      <div className={styles.topBar}>
        <BackButton label="Back" fallback="/sessions" />
        <IconButton label="More options" onClick={() => open({ kind: 'menu' })}>
          <Ellipsis size={22} />
        </IconButton>
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>{formatLongDate(new Date(sessionTime(session)))}</h1>
        <p className={styles.muted}>
          <span className="tabular">{formatDuration(total)}</span>
          {session.name ? ` · ${session.name}` : ''}
        </p>
      </header>

      {session.sections.map((section) => (
        <section key={section.id} className={styles.section}>
          <h2 className={styles.sectionTitle}>{lookups.sectionName(section.sectionTypeId)}</h2>
          <ul className={styles.items}>
            {section.items.map((item) => {
              const info = lookups.info(item.ref);
              const seconds = itemSeconds(item, now);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={styles.item}
                    onClick={() => open({ kind: 'item', itemId: item.id })}
                  >
                    <span className={styles.itemHead}>
                      <span className={styles.itemTitle}>
                        <NoBreakKeys text={info.title} />
                      </span>
                      <span className={`${styles.itemTime} tabular`}>
                        {seconds > 0 ? formatDuration(seconds) : '–'}
                      </span>
                    </span>
                    {item.entries.map((entry) => (
                      <span key={entry.id} className={styles.entry}>
                        {[describeEntry(entry), entry.note].filter(Boolean).join(' – ')}
                      </span>
                    ))}
                    {item.note && <span className={styles.note}>{item.note}</span>}
                    {item.focusNext && (
                      <span className={styles.focus}>Focus next time: {item.focusNext}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Button icon={<Plus size={18} aria-hidden="true" />} onClick={() => open({ kind: 'picker' })}>
        Add item
      </Button>

      <Card aria-labelledby="session-note-title">
        <div className={styles.cardHeader}>
          <h2 id="session-note-title" className={styles.cardTitle}>
            Session note
          </h2>
          <IconButton label="Edit session note" onClick={() => open({ kind: 'note' })}>
            <Pencil size={18} />
          </IconButton>
        </div>
        <p className={session.note ? styles.noteText : styles.muted}>
          {session.note || 'No note.'}
        </p>
      </Card>

      <Sheet open={sheet?.kind === 'menu'} onClose={close} title="Session">
        <ActionList
          actions={[
            {
              label: 'Change date',
              icon: <CalendarDays size={20} />,
              onSelect: () => open({ kind: 'date' }),
            },
            {
              label: 'Save as template',
              icon: <ListChecks size={20} />,
              onSelect: () => open({ kind: 'template' }),
            },
            {
              label: 'Delete session',
              icon: <Trash2 size={20} />,
              danger: true,
              onSelect: () => open({ kind: 'delete' }),
            },
          ]}
        />
      </Sheet>

      <Sheet open={sheet?.kind === 'item'} onClose={close} title={selectedTitle}>
        {selected && (
          <>
            <ActionList
              actions={[
                {
                  label: `Change time (${formatDuration(itemSeconds(selected, now))})`,
                  icon: <Clock size={20} />,
                  onSelect: () => open({ kind: 'time', itemId: selected.id }),
                },
                {
                  label: selected.note ? 'Edit note' : 'Add note',
                  icon: <NotebookPen size={20} />,
                  onSelect: () => open({ kind: 'itemNote', itemId: selected.id }),
                },
                {
                  label: 'Remove from session',
                  icon: <Trash2 size={20} />,
                  danger: true,
                  onSelect: () => open({ kind: 'removeItem', itemId: selected.id }),
                },
              ]}
            />
            {selected.entries.length > 0 && (
              <section className={styles.entriesBlock}>
                <h3 className={styles.sectionTitle}>Logged entries</h3>
                <ul className={styles.entryList}>
                  {selected.entries.map((entry) => (
                    <li key={entry.id} className={styles.entryRow}>
                      <span className={styles.entryText}>
                        {[describeEntry(entry), entry.note].filter(Boolean).join(' – ')}
                      </span>
                      <IconButton
                        label="Delete entry"
                        onClick={() => change((s, at) => removeEntry(s, selected.id, entry.id, at))}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </Sheet>

      {sheet?.kind === 'time' && selected && (
        <MinutesSheet
          key={`time-${sheetKey}`}
          open
          onClose={close}
          title={selectedTitle}
          initialSeconds={itemSeconds(selected, now)}
          onSave={(seconds) => {
            change((s, at) =>
              updateSessionItem(s, selected.id, (i) => setItemSeconds(i, seconds, at), at),
            );
            close();
          }}
        />
      )}

      {sheet?.kind === 'itemNote' && selected && (
        <TextSheet
          key={`item-note-${sheetKey}`}
          open
          onClose={close}
          title="Note"
          label={`Note on ${selectedTitle}`}
          initial={selected.note}
          onSave={(note) => {
            change((s, at) => updateSessionItem(s, selected.id, (i) => ({ ...i, note }), at));
            close();
          }}
        />
      )}

      <Sheet
        open={sheet?.kind === 'removeItem'}
        onClose={close}
        title="Remove this item?"
        footer={
          <>
            <Button onClick={close}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (selected) change((s, at) => removeSessionItem(s, selected.id, at));
                close();
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p>{selectedTitle} and its time and entries will be removed from this session.</p>
      </Sheet>

      <TextSheet
        key={`note-${sheetKey}`}
        open={sheet?.kind === 'note'}
        onClose={close}
        title="Session note"
        label="Session note"
        initial={session.note}
        onSave={(note) => {
          change((s) => ({ ...s, note }));
          close();
        }}
      />

      <Sheet
        open={sheet?.kind === 'date'}
        onClose={close}
        title="Change date"
        footer={
          <>
            <Button onClick={close}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!date}
              onClick={() => {
                // Move the start time to the new day, keeping the time of day.
                change((s) => {
                  if (!s.startedAt) return { ...s, date };
                  const start = new Date(s.startedAt);
                  const moved = fromDateKey(date);
                  moved.setHours(start.getHours(), start.getMinutes(), start.getSeconds());
                  return { ...s, date, startedAt: moved.getTime() };
                });
                close();
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <TextInput
          label="Date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </Sheet>

      <SaveTemplateSheet
        key={`template-${sheetKey}`}
        open={sheet?.kind === 'template'}
        onClose={close}
        initialName={session.name ?? ''}
        sections={session.sections}
        onSaved={close}
      />

      <Sheet
        open={sheet?.kind === 'delete'}
        onClose={close}
        title="Delete this session?"
        footer={
          <>
            <Button onClick={close}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                close();
                goBack();
                void deleteSession(session.id);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p>Its time and entries will no longer count for your pieces and weekly target.</p>
      </Sheet>

      {sheet?.kind === 'picker' && (
        <ItemPicker
          key={`picker-${sheetKey}`}
          open
          onClose={close}
          lookups={lookups}
          onAdd={(sectionTypeId, ref) => {
            const item = newSessionItem(ref);
            change((s, at) => ({
              ...s,
              sections: addPlanItem(s.sections, sectionTypeId, item, lookups.order),
              lastActivityAt: at,
            }));
            // Ask for the time right away: an item added afterwards has none yet.
            open({ kind: 'time', itemId: item.id });
          }}
        />
      )}
    </Screen>
  );
}
