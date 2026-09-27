import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { fromDateKey, toDateKey } from '../../domain/dates';
import type { Piece, Timestamp } from '../../domain/model';
import { formatRelativeDay, formatShortDate } from '../../lib/format';
import { ChipRow, Pill } from '../../ui/Chip';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { composerLine, FEEL_LABELS, OUTCOME_LABELS, STATUS_LABELS } from './labels';
import styles from './PieceRow.module.css';

interface PieceRowProps {
  piece: Piece;
  lastPracticedAt?: Timestamp;
}

export function PieceRow({ piece, lastPracticedAt }: PieceRowProps) {
  const outcome = piece.statusHistory[piece.statusHistory.length - 1]?.outcome;
  const overdue =
    piece.targetDate !== undefined &&
    piece.status !== 'shelved' &&
    piece.targetDate < toDateKey(new Date());

  return (
    <Link to={`/pieces/${piece.id}`} className={styles.row}>
      <div className={styles.main}>
        <span className={styles.title}>
          <NoBreakKeys text={piece.title} />
        </span>
        {composerLine(piece) && <span className={styles.sub}>{composerLine(piece)}</span>}
        <ChipRow>
          {piece.status === 'maintaining' && <Pill tone="accent">{STATUS_LABELS.maintaining}</Pill>}
          {piece.status === 'shelved' && outcome && <Pill>{OUTCOME_LABELS[outcome]}</Pill>}
          {piece.feel && <Pill>{FEEL_LABELS[piece.feel]}</Pill>}
          {piece.targetDate && (
            <Pill tone={overdue ? 'focus' : 'neutral'}>
              Target {formatShortDate(fromDateKey(piece.targetDate))}
            </Pill>
          )}
          {piece.tags.map((tag) => (
            <Pill key={tag} tone="outline">
              {tag}
            </Pill>
          ))}
        </ChipRow>
      </div>
      <div className={styles.side}>
        {lastPracticedAt !== undefined && (
          <span className={styles.last}>{formatRelativeDay(lastPracticedAt)}</span>
        )}
        <ChevronRight size={18} aria-hidden="true" />
      </div>
    </Link>
  );
}
