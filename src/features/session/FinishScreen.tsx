import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { completeSession, deleteSession, mutateSession, useSession } from '../../db/sessions';
import type { Id, ItemRef, Session } from '../../domain/model';
import { refKey } from '../../domain/refs';
import { planItems, sessionSeconds, setItemSeconds, updateSessionItem } from '../../domain/session';
import { itemSeconds } from '../../domain/timer';
import { formatDuration } from '../../lib/format';
import { useGoBack } from '../../lib/navigation';
import { useNow } from '../../lib/useNow';
import { BackButton } from '../../ui/BackButton';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { TextArea } from '../../ui/Field';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { Sheet } from '../../ui/Sheet';
import { MinutesSheet } from '../../ui/TextSheet';
import styles from './FinishScreen.module.css';
import { useLookups, type Lookups } from './lookups';

export function FinishScreen() {
  const { sessionId = '' } = useParams();
  const session = useSession(sessionId);
  const lookups = useLookups();

  if (session === undefined || !lookups.loaded) return null;
  if (session === null) return <Navigate to="/" replace />;
  if (session.status === 'finished') return <Navigate to={`/sessions/${session.id}`} replace />;
  return <FinishForm session={session} lookups={lookups} />;
}

/** One "focus next time" field per piece or technique item, in order of appearance. */
function focusTargets(session: Session): { ref: ItemRef; key: string; focusNext: string }[] {
  const seen = new Set<string>();
  const targets = [];
  for (const { item } of planItems(session.sections)) {
    if (item.ref.kind === 'free' || item.ref.kind === 'book') continue;
    const key = refKey(item.ref);
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ ref: item.ref, key, focusNext: item.focusNext });
  }
  return targets;
}

function FinishForm({ session, lookups }: { session: Session; lookups: Lookups }) {
  const navigate = useNavigate();
  const goBack = useGoBack(`/sessions/${session.id}`);
  const now = useNow();
  const targets = focusTargets(session);

  // Pre-filled with what was noted during the session, else the current focus note, so
  // keeping or tweaking last time's note takes no typing.
  const [focus, setFocus] = useState<Record<string, string>>(() =>
    Object.fromEntries(targets.map((t) => [t.key, t.focusNext || lookups.info(t.ref).focusNote])),
  );
  const [note, setNote] = useState(session.note);
  const [editingTime, setEditingTime] = useState<Id | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = sessionSeconds(session, now);
  const items = planItems(session.sections);
  const editingItem = items.find(({ item }) => item.id === editingTime)?.item;

  const save = async () => {
    setSaving(true);
    await completeSession(
      session.id,
      targets.map((t) => ({ ref: t.ref, focusNote: (focus[t.key] ?? '').trim() })),
      note.trim(),
    );
    void navigate('/', {
      replace: true,
      state: { toast: `Session saved · ${formatDuration(total)}` },
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <BackButton label="Session" fallback={`/sessions/${session.id}`} />
      </header>

      <main className={styles.content}>
        <div className={styles.summary}>
          <h1 className={styles.heading}>Finish session</h1>
          <p className={`${styles.total} tabular`}>{formatDuration(total)}</p>
          <p className={styles.muted}>practiced{session.name ? ` · ${session.name}` : ''}</p>
        </div>

        <Card aria-labelledby="times-title">
          <h2 id="times-title" className={styles.cardTitle}>
            Time per item
          </h2>
          <ul className={styles.times}>
            {items.map(({ item }) => {
              const seconds = itemSeconds(item, now);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={styles.timeRow}
                    onClick={() => setEditingTime(item.id)}
                  >
                    <span className={styles.timeTitle}>
                      <NoBreakKeys text={lookups.info(item.ref).title} />
                    </span>
                    <span className={seconds > 0 ? 'tabular' : `tabular ${styles.muted}`}>
                      {seconds > 0 ? formatDuration(seconds) : 'skipped'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className={styles.hint}>Tap a time to correct it.</p>
        </Card>

        {targets.length > 0 && (
          <Card aria-labelledby="focus-title">
            <h2 id="focus-title" className={styles.cardTitle}>
              Focus next time
            </h2>
            {targets.map((target) => (
              <TextArea
                key={target.key}
                label={lookups.info(target.ref).title}
                rows={2}
                placeholder="What to work on next time"
                value={focus[target.key] ?? ''}
                onChange={(event) => setFocus((f) => ({ ...f, [target.key]: event.target.value }))}
              />
            ))}
          </Card>
        )}

        <TextArea
          label="Session note"
          rows={3}
          placeholder="How did it go overall?"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        <div className={styles.actions}>
          <Button variant="primary" size="lg" block disabled={saving} onClick={() => void save()}>
            Save session
          </Button>
          <Button variant="ghost" onClick={goBack}>
            Back to practicing
          </Button>
          <Button
            variant="ghost"
            className={styles.discard}
            onClick={() => setConfirmDiscard(true)}
          >
            Discard session
          </Button>
        </div>
      </main>

      {editingItem && (
        <MinutesSheet
          key={editingItem.id}
          open
          onClose={() => setEditingTime(null)}
          title={lookups.info(editingItem.ref).title}
          initialSeconds={itemSeconds(editingItem, now)}
          onSave={(seconds) => {
            void mutateSession(session.id, (s) =>
              updateSessionItem(
                s,
                editingItem.id,
                (item) => setItemSeconds(item, seconds, Date.now()),
                Date.now(),
              ),
            );
            setEditingTime(null);
          }}
        />
      )}

      <Sheet
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard this session?"
        footer={
          <>
            <Button onClick={() => setConfirmDiscard(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                void deleteSession(session.id).then(() => navigate('/', { replace: true }));
              }}
            >
              Discard
            </Button>
          </>
        }
      >
        <p>The time and entries of this session will be deleted. This can’t be undone.</p>
      </Sheet>
    </div>
  );
}
