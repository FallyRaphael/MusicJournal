import { Ellipsis, ListChecks, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { deleteSession, mutateSession, useSession } from '../../db/sessions';
import { fromDateKey } from '../../domain/dates';
import type { Session, SessionItem } from '../../domain/model';
import {
  changeBudget,
  newSessionItem,
  planItems,
  removeSessionItem,
  startItem,
} from '../../domain/session';
import { itemSeconds } from '../../domain/timer';
import { formatDuration, formatLongDate } from '../../lib/format';
import { useGoBack } from '../../lib/navigation';
import { useNow } from '../../lib/useNow';
import { ActionList } from '../../ui/ActionList';
import { Button, IconButton } from '../../ui/Button';
import { TextInput } from '../../ui/Field';
import { Sheet } from '../../ui/Sheet';
import { useLookups, type Lookups } from './lookups';
import { BudgetControl, PlanEditor } from './PlanEditor';
import styles from './PlanScreen.module.css';
import { SaveTemplateSheet } from './SessionSheets';

/** Plans a session: its items, time budgets, and (for later sessions) date and name. */
export function PlanScreen() {
  const { sessionId = '' } = useParams();
  const session = useSession(sessionId);
  const lookups = useLookups();

  if (session === undefined || !lookups.loaded) return null;
  if (session === null) return <Navigate to="/" replace />;
  if (session.status === 'finished') return <Navigate to={`/sessions/${session.id}`} replace />;
  return <PlanForm session={session} lookups={lookups} />;
}

type OpenSheet = 'menu' | 'template' | 'delete' | { remove: SessionItem } | null;

function PlanForm({ session, lookups }: { session: Session; lookups: Lookups }) {
  const navigate = useNavigate();
  const goBack = useGoBack('/');
  const [name, setName] = useState(session.name ?? '');
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const now = useNow();

  const planned = session.status === 'planned';
  const empty = planItems(session.sections).length === 0;
  const change = (update: (s: Session, at: number) => Session) =>
    mutateSession(session.id, (s) => update(s, Date.now()));

  const saveName = () => {
    const clean = name.trim();
    if (clean !== (session.name ?? '')) void change((s) => ({ ...s, name: clean || undefined }));
  };

  const close = async () => {
    // A plan that never got any items isn't worth keeping.
    if (planned && empty) await deleteSession(session.id);
    goBack();
  };

  const startNow = async () => {
    const first = planItems(session.sections)[0];
    if (first) await change((s, at) => startItem(s, first.item.id, at));
    void navigate(`/sessions/${session.id}`, { replace: true });
  };

  const remove = (item: SessionItem) => {
    const recorded = itemSeconds(item, Date.now()) > 0 || item.entries.length > 0;
    if (recorded) setSheet({ remove: item });
    else void change((s, at) => removeSessionItem(s, item.id, at));
  };

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <IconButton label="Close" onClick={() => void close()}>
          <X size={22} />
        </IconButton>
        <h1 className={styles.heading}>{planned ? 'Plan session' : 'Edit session'}</h1>
        <IconButton
          label="More options"
          onClick={() => {
            setSheetKey((k) => k + 1);
            setSheet('menu');
          }}
        >
          <Ellipsis size={22} />
        </IconButton>
      </header>

      <main className={styles.content}>
        {planned && (
          <div className={styles.fields}>
            <TextInput
              label="Name (optional)"
              placeholder="e.g. Evening practice"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={saveName}
            />
            <TextInput
              label="Date"
              type="date"
              value={session.date}
              hint={formatLongDate(fromDateKey(session.date))}
              onChange={(event) => {
                const date = event.target.value;
                if (date) void change((s) => ({ ...s, date }));
              }}
            />
          </div>
        )}

        <PlanEditor
          sections={session.sections}
          lookups={lookups}
          createItem={(ref) => newSessionItem(ref)}
          onChange={(update) => void change((s) => ({ ...s, sections: update(s.sections) }))}
          onRemoveItem={remove}
          timeControl={(item) => (
            <BudgetControl
              minutes={item.budgetMinutes ?? 0}
              onChange={(update) =>
                void change((s) => ({ ...s, sections: changeBudget(s.sections, item.id, update) }))
              }
            />
          )}
        />
      </main>

      <footer className={styles.footer}>
        {planned ? (
          <>
            <Button
              onClick={() => {
                saveName();
                void navigate('/', { replace: true });
              }}
              disabled={empty}
            >
              Save for later
            </Button>
            <Button
              variant="primary"
              disabled={empty}
              onClick={() => {
                saveName();
                void startNow();
              }}
            >
              Start now
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={goBack}>
            Done
          </Button>
        )}
      </footer>

      <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title="Session">
        <ActionList
          actions={[
            {
              label: 'Save as template',
              icon: <ListChecks size={20} />,
              onSelect: () => setSheet('template'),
            },
            {
              label: 'Delete session',
              icon: <Trash2 size={20} />,
              danger: true,
              onSelect: () => setSheet('delete'),
            },
          ]}
        />
      </Sheet>

      <SaveTemplateSheet
        key={`template-${sheetKey}`}
        open={sheet === 'template'}
        onClose={() => setSheet(null)}
        initialName={name}
        sections={session.sections}
        onSaved={() => setSheet(null)}
      />

      <Sheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title="Delete this session?"
        footer={
          <>
            <Button onClick={() => setSheet(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() =>
                void deleteSession(session.id).then(() => navigate('/', { replace: true }))
              }
            >
              Delete
            </Button>
          </>
        }
      >
        <p>The plan{planned ? '' : ' and the time practiced so far'} will be deleted.</p>
      </Sheet>

      <Sheet
        open={typeof sheet === 'object' && sheet !== null}
        onClose={() => setSheet(null)}
        title="Remove this item?"
        footer={
          <>
            <Button onClick={() => setSheet(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (typeof sheet === 'object' && sheet) {
                  const itemId = sheet.remove.id;
                  void change((s, at) => removeSessionItem(s, itemId, at));
                }
                setSheet(null);
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        {typeof sheet === 'object' && sheet && (
          <p>
            {lookups.info(sheet.remove.ref).title} has{' '}
            {formatDuration(itemSeconds(sheet.remove, now))} and {sheet.remove.entries.length}{' '}
            logged entries. They will be removed with it.
          </p>
        )}
      </Sheet>
    </div>
  );
}
