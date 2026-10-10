import { Flag, List, NotebookPen, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useBookSessions } from '../../db/books';
import {
  deleteSession,
  mutateSession,
  useRecentSessions,
  useRunningSession,
} from '../../db/sessions';
import { useSettings } from '../../db/settings';
import type { Id, Session } from '../../domain/model';
import { bookProgress } from '../../domain/books';
import { lastBpm } from '../../domain/pieceStats';
import { sameRef } from '../../domain/refs';
import {
  addPlanItem,
  currentItemId,
  forgottenTimer,
  logEntry,
  neighborItemId,
  newSessionItem,
  pause,
  planItems,
  removeEntry,
  runningItem,
  selectItem,
  sessionSeconds,
  setItemSeconds,
  startItem,
  updateSessionItem,
} from '../../domain/session';
import { itemSeconds } from '../../domain/timer';
import { formatClock, formatDuration } from '../../lib/format';
import { useGoBack } from '../../lib/navigation';
import { playBudgetSignal, primeAudio } from '../../lib/signal';
import { useNow } from '../../lib/useNow';
import { useWakeLock } from '../../lib/wakeLock';
import { Button, IconButton } from '../../ui/Button';
import { EmptyState } from '../../ui/Screen';
import { Sheet } from '../../ui/Sheet';
import { MinutesSheet, TextSheet } from '../../ui/TextSheet';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { ItemPicker } from './ItemPicker';
import { useLookups } from './lookups';
import { BookLog, QuickLog } from './QuickLog';
import { AllItemsSheet, EntriesSheet } from './SessionSheets';
import styles from './StageScreen.module.css';

type OpenSheet = 'items' | 'entries' | 'note' | 'focus' | 'picker' | 'correct' | null;

interface StageState {
  /** Set when the session was created by a one-tap start and should vanish if never started. */
  quickStart?: boolean;
}

/** Full-screen practice mode: one item at a time with a big timer. */
export function StageScreen({ session }: { session: Session }) {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useGoBack('/');
  const lookups = useLookups();
  const settings = useSettings();
  const recentSessions = useRecentSessions();
  const runningSession = useRunningSession();
  const bookSessions = useBookSessions();

  const running = runningItem(session);
  const now = useNow(running ? 250 : 30_000);
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [correcting, setCorrecting] = useState<{ itemId: Id; seconds: number } | null>(null);

  useWakeLock(true);

  const items = planItems(session.sections);
  const currentId = currentItemId(session);
  const position = items.find(({ item }) => item.id === currentId);
  const current = position?.item;
  const info = current ? lookups.info(current.ref) : undefined;
  const elapsed = current ? itemSeconds(current, now) : 0;
  const budgetSeconds = current?.budgetMinutes ? current.budgetMinutes * 60 : undefined;
  const isLast = current ? neighborItemId(session, current.id, 1) === undefined : true;
  const bookRef = current?.ref.kind === 'book' ? current.ref : undefined;
  const book = bookRef && {
    total: lookups.books.find((b) => b.id === bookRef.bookId)?.total,
    progress: bookProgress(bookRef.bookId, bookSessions ?? []),
  };
  const subtitle = book
    ? book.progress.last === undefined
      ? info?.subtitle
      : book.total
        ? `${book.progress.last} of ${book.total} done`
        : `Up to No. ${book.progress.last}`
    : info?.subtitle;
  const blockedBy =
    runningSession && runningSession.id !== session.id && session.status === 'planned'
      ? runningSession
      : null;
  const forgotten = sheet === null ? forgottenTimer(session, now) : null;

  // Budget signal: only when an item crosses its budget while we watch, not when a screen
  // is reopened for an item that is already over.
  const belowBudget = useRef(new Set<Id>());
  const signalled = useRef(new Set<Id>());
  const signalMode = settings.budgetSignal ?? 'soundAndVibration';
  useEffect(() => {
    if (!running || !running.budgetMinutes) return;
    const seconds = itemSeconds(running, now);
    if (seconds < running.budgetMinutes * 60) belowBudget.current.add(running.id);
    else if (belowBudget.current.has(running.id) && !signalled.current.has(running.id)) {
      signalled.current.add(running.id);
      playBudgetSignal(signalMode);
    }
  }, [running, now, signalMode]);

  const act = (change: (s: Session, at: number) => Session) =>
    void mutateSession(session.id, (s) => change(s, Date.now()));

  const open = (next: OpenSheet) => {
    setSheetKey((k) => k + 1);
    setSheet(next);
  };

  const togglePlay = () => {
    if (!current) return;
    primeAudio();
    if (running) act(pause);
    else act((s, at) => startItem(s, current.id, at));
  };

  const go = (direction: -1 | 1) => {
    if (!current) return;
    const target = neighborItemId(session, current.id, direction);
    if (target) act((s, at) => selectItem(s, target, at));
  };

  const finish = async () => {
    await mutateSession(session.id, (s) => pause(s, Date.now()));
    void navigate(`/sessions/${session.id}/finish`);
  };

  const close = async () => {
    const quickStart = (location.state as StageState | null)?.quickStart;
    if (quickStart && session.status === 'planned' && sessionSeconds(session, now) === 0) {
      // Opened with one tap and never started: don't leave an empty plan behind.
      await deleteSession(session.id);
    }
    goBack();
  };

  const defaultBpm = current
    ? lastBpm((ref) => sameRef(ref, current.ref), recentSessions ?? [])
    : undefined;

  return (
    <div className={styles.screen}>
      <header className={styles.bar}>
        <IconButton label="Close session" onClick={() => void close()}>
          <X size={22} />
        </IconButton>
        <div className={styles.barTitle}>
          <span className={styles.barName}>{session.name || 'Practice session'}</span>
          <span className={`${styles.barTotal} tabular`}>
            {session.status === 'planned'
              ? 'Not started'
              : `Session ${formatClock(sessionSeconds(session, now))}`}
          </span>
        </div>
        {session.status === 'running' ? (
          <Button variant="ghost" onClick={() => void finish()}>
            Finish
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => void navigate(`/sessions/${session.id}/plan`)}>
            Edit
          </Button>
        )}
      </header>

      {!current ? (
        <div className={styles.content}>
          <EmptyState title="Nothing to practice yet">
            Add pieces, technique or anything else to this session.
          </EmptyState>
          <Button variant="primary" size="lg" block onClick={() => open('picker')}>
            Add item
          </Button>
        </div>
      ) : (
        <div className={styles.content}>
          <div className={styles.progress}>
            <div
              className={styles.segments}
              style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
              aria-hidden="true"
            >
              {items.map(({ item }) => {
                const seconds = itemSeconds(item, now);
                const fill = item.budgetMinutes
                  ? Math.min(1, seconds / (item.budgetMinutes * 60))
                  : seconds > 0
                    ? 1
                    : 0;
                return (
                  <span
                    key={item.id}
                    className={
                      item.id === current.id
                        ? `${styles.segment} ${styles.segmentCurrent}`
                        : styles.segment
                    }
                  >
                    <span className={styles.segmentFill} style={{ width: `${fill * 100}%` }} />
                  </span>
                );
              })}
            </div>
            <div className={styles.meta}>
              <span>
                {lookups.sectionName(position!.section.sectionTypeId)} · item {position!.index + 1}{' '}
                of {items.length}
              </span>
              <Button
                variant="ghost"
                icon={<List size={18} aria-hidden="true" />}
                className={styles.allItems}
                onClick={() => open('items')}
              >
                All items
              </Button>
            </div>
          </div>

          <section className={styles.stage} aria-live="off">
            <h1 className={styles.title}>
              <NoBreakKeys text={info!.title} />
            </h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            <p
              className={`${styles.clock} tabular`}
              role="timer"
              aria-label={`${formatDuration(elapsed)} practiced`}
            >
              {formatClock(elapsed)}
            </p>
            {budgetSeconds !== undefined && (
              <div className={styles.budget}>
                <span className={styles.budgetBar}>
                  <span
                    className={
                      elapsed > budgetSeconds
                        ? `${styles.budgetFill} ${styles.over}`
                        : styles.budgetFill
                    }
                    style={{ width: `${Math.min(1, elapsed / budgetSeconds) * 100}%` }}
                  />
                </span>
                <span
                  className={
                    elapsed > budgetSeconds
                      ? `${styles.budgetText} ${styles.overText}`
                      : styles.budgetText
                  }
                >
                  {elapsed > budgetSeconds
                    ? `+${formatClock(elapsed - budgetSeconds)} over`
                    : `of ${formatClock(budgetSeconds)}`}
                </span>
              </div>
            )}
          </section>

          {blockedBy && (
            <div className={styles.notice} role="status">
              Another session is in progress.{' '}
              <Link to={`/sessions/${blockedBy.id}`} replace>
                Go to it
              </Link>
            </div>
          )}

          {info!.focusNote && (
            <section className={styles.focus} aria-label="Focus from last time">
              <Flag size={18} className={styles.focusIcon} aria-hidden="true" />
              <span className={styles.focusText}>
                <span className={styles.focusLabel}>From last time</span>
                {info!.focusNote}
              </span>
            </section>
          )}

          {book ? (
            bookSessions !== undefined && (
              <BookLog
                key={current.id}
                next={book.progress.next}
                total={book.total}
                entryCount={current.entries.length}
                onShowEntries={() => open('entries')}
                onLog={(entry) => act((s, at) => logEntry(s, current.id, entry, at))}
              />
            )
          ) : (
            <QuickLog
              key={current.id}
              methods={settings.methods}
              defaultBpm={defaultBpm}
              entryCount={current.entries.length}
              onShowEntries={() => open('entries')}
              onLog={(entry) => act((s, at) => logEntry(s, current.id, entry, at))}
            />
          )}

          <div className={styles.itemActions}>
            <Button
              variant="ghost"
              icon={<NotebookPen size={18} aria-hidden="true" />}
              onClick={() => open('note')}
            >
              {current.note ? 'Edit note' : 'Note'}
            </Button>
            {!book && (
              <Button
                variant="ghost"
                icon={<Flag size={18} aria-hidden="true" />}
                onClick={() => open('focus')}
              >
                {current.focusNext ? 'Edit focus next time' : 'Focus next time'}
              </Button>
            )}
          </div>
        </div>
      )}

      {current && (
        <nav className={styles.controls} aria-label="Session controls">
          <IconButton
            label="Previous item"
            variant="outline"
            className={styles.sideButton}
            disabled={position!.index === 0}
            onClick={() => go(-1)}
          >
            <SkipBack size={24} fill="currentColor" />
          </IconButton>
          <button
            type="button"
            className={styles.playButton}
            aria-label={running ? 'Pause' : 'Start timer'}
            disabled={blockedBy !== null}
            onClick={togglePlay}
          >
            {running ? (
              <Pause size={36} fill="currentColor" />
            ) : (
              <Play size={36} fill="currentColor" />
            )}
          </button>
          {isLast ? (
            <IconButton
              label="Finish session"
              variant="outline"
              className={styles.sideButton}
              disabled={session.status !== 'running'}
              onClick={() => void finish()}
            >
              <Flag size={24} />
            </IconButton>
          ) : (
            <IconButton
              label="Next item"
              variant="outline"
              className={styles.sideButton}
              onClick={() => go(1)}
            >
              <SkipForward size={24} fill="currentColor" />
            </IconButton>
          )}
        </nav>
      )}

      <AllItemsSheet
        open={sheet === 'items'}
        onClose={() => setSheet(null)}
        session={session}
        currentId={currentId}
        now={now}
        lookups={lookups}
        onSelect={(itemId) => {
          act((s, at) => selectItem(s, itemId, at));
          setSheet(null);
        }}
        onAddItem={() => open('picker')}
        onEditPlan={() => {
          setSheet(null);
          void navigate(`/sessions/${session.id}/plan`);
        }}
      />

      {sheet === 'picker' && (
        <ItemPicker
          key={`picker-${sheetKey}`}
          open
          onClose={() => setSheet(null)}
          lookups={lookups}
          onAdd={(sectionTypeId, ref) =>
            act((s, at) => ({
              ...s,
              sections: addPlanItem(s.sections, sectionTypeId, newSessionItem(ref), lookups.order),
              lastActivityAt: at,
            }))
          }
        />
      )}

      {current && (
        <>
          <EntriesSheet
            open={sheet === 'entries'}
            onClose={() => setSheet(null)}
            title={`Logged for ${info!.title}`}
            entries={current.entries}
            onDelete={(entryId) => act((s, at) => removeEntry(s, current.id, entryId, at))}
          />
          <TextSheet
            key={`note-${sheetKey}`}
            open={sheet === 'note'}
            onClose={() => setSheet(null)}
            title="Note"
            label={`Note on ${info!.title}`}
            placeholder="How did it go?"
            initial={current.note}
            onSave={(note) => {
              act((s, at) => updateSessionItem(s, current.id, (item) => ({ ...item, note }), at));
              setSheet(null);
            }}
          />
          <TextSheet
            key={`focus-${sheetKey}`}
            open={sheet === 'focus'}
            onClose={() => setSheet(null)}
            title="Focus next time"
            label="What to work on next time"
            placeholder="e.g. LH jumps in bars 13–16: land early"
            initial={current.focusNext || info!.focusNote}
            onSave={(focusNext) => {
              act((s, at) =>
                updateSessionItem(s, current.id, (item) => ({ ...item, focusNext }), at),
              );
              setSheet(null);
            }}
          />
        </>
      )}

      <Sheet
        open={forgotten !== null && correcting === null}
        onClose={() => act((s, at) => ({ ...s, lastActivityAt: at }))}
        title="Still practicing?"
      >
        {forgotten && (
          <>
            <p>
              The timer for{' '}
              <strong>{lookups.info(findRef(session, forgotten.itemId)).title}</strong> has been
              running since{' '}
              {new Date(forgotten.lastActivityAt).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              without any activity.
            </p>
            <div className={styles.sheetButtons}>
              <Button
                variant="primary"
                onClick={() => act((s, at) => ({ ...s, lastActivityAt: at }))}
              >
                Yes, keep going
              </Button>
              <Button
                onClick={() => {
                  act(pause);
                  setCorrecting({ itemId: forgotten.itemId, seconds: forgotten.suggestedSeconds });
                }}
              >
                No – stop and correct the time
              </Button>
            </div>
          </>
        )}
      </Sheet>

      {correcting && (
        <MinutesSheet
          key={`correct-${correcting.itemId}`}
          open
          onClose={() => setCorrecting(null)}
          title="How long did you practice?"
          hint="Suggested from your plan or your last activity. You can change it later too."
          initialSeconds={correcting.seconds}
          onSave={(seconds) => {
            act((s, at) =>
              updateSessionItem(
                s,
                correcting.itemId,
                (item) => setItemSeconds(item, seconds, at),
                at,
              ),
            );
            setCorrecting(null);
          }}
        />
      )}
    </div>
  );
}

function findRef(session: Session, itemId: Id) {
  const found = planItems(session.sections).find(({ item }) => item.id === itemId);
  return found ? found.item.ref : { kind: 'free' as const, label: 'this item' };
}
