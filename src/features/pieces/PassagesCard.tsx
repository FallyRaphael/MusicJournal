import { ChevronRight, Plus } from 'lucide-react';
import type { Passage, Piece, Session } from '../../domain/model';
import { barsLabel, passageLabel, passageTempo, sortPassages } from '../../domain/passages';
import { IconButton } from '../../ui/Button';
import { Card } from '../../ui/Card';
import styles from './PassagesCard.module.css';

interface PassagesCardProps {
  piece: Piece;
  sessions: readonly Session[];
  /** Opens a passage for editing, or the form for a new one. */
  onOpen: (passage?: Passage) => void;
}

/** The piece's passages with their tempo and focus notes; solid ones folded away. */
export function PassagesCard({ piece, sessions, onOpen }: PassagesCardProps) {
  const passages = sortPassages(piece.passages ?? []);
  const known = new Set(passages.map((p) => p.id));
  const active = passages.filter((p) => !p.solid);
  const solid = passages.filter((p) => p.solid);

  const row = (passage: Passage) => {
    const tempo = passageTempo(piece.id, passage.id, known, sessions);
    const bars = passage.name.trim() ? barsLabel(passage) : '';
    const details = [
      bars,
      tempo.last !== undefined &&
        (tempo.best !== tempo.last
          ? `last ${tempo.last} · best ${tempo.best} BPM`
          : `${tempo.last} BPM`),
    ].filter(Boolean);
    return (
      <li key={passage.id}>
        <button type="button" className={styles.row} onClick={() => onOpen(passage)}>
          <span className={styles.text}>
            <span className={styles.name}>{passageLabel(passage)}</span>
            {details.length > 0 && <span className={styles.sub}>{details.join(' · ')}</span>}
            {passage.focusNote && <span className={styles.focus}>Focus: {passage.focusNote}</span>}
          </span>
          <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
        </button>
      </li>
    );
  };

  return (
    <Card aria-labelledby="passages-title">
      <div className={styles.header}>
        <h2 id="passages-title" className={styles.title}>
          Passages
        </h2>
        <IconButton label="Add passage" onClick={() => onOpen()}>
          <Plus size={20} />
        </IconButton>
      </div>
      {passages.length === 0 && (
        <p className={styles.placeholder}>
          Practicing a part on its own, e.g. bars 13–16? Add it as a passage to log its tempo and
          focus notes separately.
        </p>
      )}
      {active.length > 0 && <ul className={styles.list}>{active.map(row)}</ul>}
      {solid.length > 0 && (
        <details className={styles.solid}>
          <summary className={styles.summary}>Solid ({solid.length})</summary>
          <ul className={styles.list}>{solid.map(row)}</ul>
        </details>
      )}
    </Card>
  );
}
