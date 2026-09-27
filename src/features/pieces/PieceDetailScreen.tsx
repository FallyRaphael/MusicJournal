import { Ellipsis, Flag, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  changePieceStatus,
  deletePiece,
  updatePiece,
  usePiece,
  usePieceSessions,
} from '../../db/pieces';
import { fromDateKey } from '../../domain/dates';
import type { Piece, PieceStatus } from '../../domain/model';
import { pieceSessionSummaries, pieceStats } from '../../domain/pieceStats';
import { currentStatusSince, statusPeriods } from '../../domain/pieces';
import { formatDuration, formatMediumDate, formatShortDate } from '../../lib/format';
import { useGoBack } from '../../lib/navigation';
import { useNow } from '../../lib/useNow';
import { ActionList } from '../../ui/ActionList';
import { BackButton } from '../../ui/BackButton';
import { Button, IconButton } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ChipRow, Pill } from '../../ui/Chip';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { EmptyState, Screen } from '../../ui/Screen';
import { Sheet } from '../../ui/Sheet';
import { composerLine, FEEL_LABELS, OUTCOME_LABELS, STATUS_LABELS } from './labels';
import styles from './PieceDetailScreen.module.css';
import { NoteSheet, StatusSheet } from './PieceSheets';

type OpenSheet =
  { kind: 'menu' | 'focus' | 'notes' | 'delete' } | { kind: 'status'; preset: PieceStatus };

export function PieceDetailScreen() {
  const { pieceId = '' } = useParams();
  const piece = usePiece(pieceId);

  if (piece === undefined) return null;
  if (piece === null) {
    return (
      <Screen>
        <BackButton label="Pieces" fallback="/pieces" />
        <EmptyState title="Piece not found">It may have been deleted.</EmptyState>
      </Screen>
    );
  }
  return <PieceDetail piece={piece} />;
}

function PieceDetail({ piece }: { piece: Piece }) {
  const navigate = useNavigate();
  const goBack = useGoBack('/pieces');
  const sessions = usePieceSessions(piece.id);
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  // Changes whenever a sheet opens, so sheets with inputs start fresh each time.
  const [sheetKey, setSheetKey] = useState(0);

  const open = (next: OpenSheet) => {
    setSheetKey((k) => k + 1);
    setSheet(next);
  };
  const close = () => setSheet(null);

  const now = useNow();
  const periods = statusPeriods(piece.statusHistory);
  const stats = pieceStats(piece.id, sessions ?? [], periods, now);
  const recent = pieceSessionSummaries(piece.id, sessions ?? [], now).slice(0, 5);
  const outcome = piece.statusHistory[piece.statusHistory.length - 1]?.outcome;
  const since = currentStatusSince(piece);

  return (
    <Screen>
      <div className={styles.topBar}>
        <BackButton label="Pieces" fallback="/pieces" />
        <IconButton label="More options" onClick={() => open({ kind: 'menu' })}>
          <Ellipsis size={22} />
        </IconButton>
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>
          <NoBreakKeys text={piece.title} />
        </h1>
        {composerLine(piece) && <p className={styles.composer}>{composerLine(piece)}</p>}
      </header>

      <ChipRow>
        <Pill tone="accent">
          {STATUS_LABELS[piece.status]}
          {piece.status === 'shelved' && outcome ? ` · ${OUTCOME_LABELS[outcome]}` : ''}
        </Pill>
        {piece.feel && <Pill>Feels {FEEL_LABELS[piece.feel].toLowerCase()}</Pill>}
        {piece.tags.map((tag) => (
          <Pill key={tag} tone="outline">
            {tag}
          </Pill>
        ))}
      </ChipRow>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Total time</dt>
          <dd className="tabular">{formatDuration(stats.totalSeconds)}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Sessions</dt>
          <dd className="tabular">{stats.sessionCount}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Target</dt>
          <dd>{piece.targetDate ? formatShortDate(fromDateKey(piece.targetDate)) : '–'}</dd>
        </div>
      </dl>

      <Card aria-labelledby="focus-title">
        <div className={styles.cardHeader}>
          <h2 id="focus-title" className={styles.cardTitle}>
            <Flag size={16} className={styles.focusIcon} aria-hidden="true" />
            Focus next time
          </h2>
          <IconButton label="Edit focus note" onClick={() => open({ kind: 'focus' })}>
            <Pencil size={18} />
          </IconButton>
        </div>
        {piece.focusNote ? (
          <p className={styles.note}>{piece.focusNote}</p>
        ) : (
          <p className={styles.placeholder}>What should you work on next time?</p>
        )}
      </Card>

      <Card aria-labelledby="status-title">
        <div className={styles.cardHeader}>
          <h2 id="status-title" className={styles.cardTitle}>
            Status
          </h2>
        </div>
        <p>
          <strong>{STATUS_LABELS[piece.status]}</strong>
          {since && <span className={styles.muted}> since {formatMediumDate(since)}</span>}
        </p>
        <StatusActions
          status={piece.status}
          onChange={(status) => void changePieceStatus(piece.id, status)}
          onOpenSheet={(preset) => open({ kind: 'status', preset })}
        />
        {periods.length > 1 && (
          <ol className={styles.periods} aria-label="History">
            {periods
              .map((period, i) => ({ period, seconds: stats.periodSeconds[i] }))
              .reverse()
              .map(({ period, seconds }) => (
                <li key={period.from} className={styles.period}>
                  <span
                    className={
                      period.to === null ? `${styles.dot} ${styles.dotCurrent}` : styles.dot
                    }
                    aria-hidden="true"
                  />
                  <span className={styles.periodText}>
                    <span className={styles.periodLabel}>
                      {STATUS_LABELS[period.status]}
                      {period.outcome && ` · ${OUTCOME_LABELS[period.outcome]}`}
                    </span>
                    <span className={styles.muted}>
                      {formatMediumDate(period.from)} –{' '}
                      {period.to === null ? 'now' : formatMediumDate(period.to)}
                    </span>
                  </span>
                  {seconds > 0 && <span className="tabular">{formatDuration(seconds)}</span>}
                </li>
              ))}
          </ol>
        )}
      </Card>

      <Card aria-labelledby="notes-title">
        <div className={styles.cardHeader}>
          <h2 id="notes-title" className={styles.cardTitle}>
            Notes
          </h2>
          <IconButton label="Edit notes" onClick={() => open({ kind: 'notes' })}>
            <Pencil size={18} />
          </IconButton>
        </div>
        {piece.notes ? (
          <p className={styles.note}>{piece.notes}</p>
        ) : (
          <p className={styles.placeholder}>Edition, fingering ideas, recordings…</p>
        )}
      </Card>

      <Card aria-labelledby="sessions-title">
        <h2 id="sessions-title" className={styles.cardTitle}>
          Recent sessions
        </h2>
        {recent.length === 0 ? (
          <p className={styles.placeholder}>Practice time shows up here once you log sessions.</p>
        ) : (
          <ul className={styles.sessions}>
            {recent.map((entry) => (
              <li key={entry.sessionId} className={styles.sessionRow}>
                <span>{formatMediumDate(entry.at)}</span>
                <span className="tabular">{formatDuration(entry.seconds)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Sheet open={sheet?.kind === 'menu'} onClose={close} title={piece.title}>
        <ActionList
          actions={[
            {
              label: 'Edit details',
              icon: <Pencil size={20} />,
              onSelect: () => {
                close();
                void navigate(`/pieces/${piece.id}/edit`);
              },
            },
            {
              label: 'Change status',
              icon: <RefreshCw size={20} />,
              onSelect: () => open({ kind: 'status', preset: piece.status }),
            },
            {
              label: 'Delete piece',
              icon: <Trash2 size={20} />,
              danger: true,
              onSelect: () => open({ kind: 'delete' }),
            },
          ]}
        />
      </Sheet>

      <StatusSheet
        key={`status-${sheetKey}`}
        open={sheet?.kind === 'status'}
        onClose={close}
        initialStatus={sheet?.kind === 'status' ? sheet.preset : piece.status}
        initialOutcome={outcome}
        onSave={(status, newOutcome) => {
          void changePieceStatus(piece.id, status, newOutcome);
          close();
        }}
      />

      <NoteSheet
        key={`focus-${sheetKey}`}
        open={sheet?.kind === 'focus'}
        onClose={close}
        title="Focus next time"
        label="What to work on next time"
        placeholder="e.g. LH jumps in bars 13–16: land early"
        initial={piece.focusNote}
        onSave={(focusNote) => {
          void updatePiece(piece.id, { focusNote });
          close();
        }}
      />

      <NoteSheet
        key={`notes-${sheetKey}`}
        open={sheet?.kind === 'notes'}
        onClose={close}
        title="Notes"
        label="Notes"
        initial={piece.notes}
        onSave={(notes) => {
          void updatePiece(piece.id, { notes });
          close();
        }}
      />

      <Sheet
        open={sheet?.kind === 'delete'}
        onClose={close}
        title="Delete this piece?"
        footer={
          <>
            <Button onClick={close}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                close();
                goBack();
                void deletePiece(piece.id);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p>
          “{piece.title}” and its notes will be removed. Time you practiced it still counts in your
          sessions. This can’t be undone.
        </p>
        <p className={styles.muted}>
          To keep its history instead, shelve it: it moves out of your active list.
        </p>
      </Sheet>
    </Screen>
  );
}

interface StatusActionsProps {
  status: PieceStatus;
  onChange: (status: PieceStatus) => void;
  onOpenSheet: (preset: PieceStatus) => void;
}

/** The most likely next step for the current status, plus a way to pick any status. */
function StatusActions({ status, onChange, onOpenSheet }: StatusActionsProps) {
  return (
    <div className={styles.statusActions}>
      {status === 'upNext' && (
        <Button variant="primary" onClick={() => onChange('learning')}>
          Start learning
        </Button>
      )}
      {status === 'shelved' && (
        <Button variant="primary" onClick={() => onChange('learning')}>
          Learn again
        </Button>
      )}
      {(status === 'learning' || status === 'maintaining') && (
        <Button onClick={() => onOpenSheet('shelved')}>Shelve…</Button>
      )}
      <Button variant="ghost" onClick={() => onOpenSheet(status)}>
        Change status
      </Button>
    </div>
  );
}
