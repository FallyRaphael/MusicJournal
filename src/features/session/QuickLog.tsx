import { Minus, Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { Id } from '../../domain/model';
import { Button, IconButton } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ChipRow, ToggleChip } from '../../ui/Chip';
import { Input } from '../../ui/Field';
import styles from './QuickLog.module.css';

const BPM_STEP = 2;

interface PassageOption {
  id: Id;
  label: string;
}

interface QuickLogProps {
  methods: readonly string[];
  /** Starting tempo: the last one logged for this item (or the chosen passage). */
  defaultBpm?: number;
  entryCount: number;
  onLog: (entry: { method: string; bpm?: number; note: string; passageId?: Id }) => void;
  onShowEntries: () => void;
  /** Pieces only: passages to log for; `passage` null means the whole piece. */
  passages?: readonly PassageOption[];
  passage?: Id | null;
  onPassageChange?: (passage: Id | null) => void;
  onAddPassage?: () => void;
}

/**
 * Logs how an item is being practiced in a few taps: a passage (pieces), a method, an
 * optional tempo and an optional note. Method and tempo stay selected after logging, for the
 * next repetition; the tempo is kept per passage. Mount with `key` = item id so each item
 * starts fresh.
 */
export function QuickLog({
  methods,
  defaultBpm,
  entryCount,
  onLog,
  onShowEntries,
  passages,
  passage = null,
  onPassageChange,
  onAddPassage,
}: QuickLogProps) {
  const [method, setMethod] = useState<string | null>(null);
  const [bpms, setBpms] = useState<Record<string, number | null>>({});
  const [note, setNote] = useState('');

  const bpmKey = passage ?? '';
  const bpm = bpms[bpmKey] ?? null;
  const setBpm = (update: (current: number | null) => number | null) =>
    setBpms((all) => ({ ...all, [bpmKey]: update(all[bpmKey] ?? null) }));

  const canLog = method !== null || bpm !== null || note.trim() !== '';
  const step = (delta: number) =>
    setBpm((current) =>
      Math.min(300, Math.max(20, (current ?? defaultBpm ?? 60) + (current === null ? 0 : delta))),
    );

  const log = () => {
    if (!canLog) return;
    onLog({
      method: method ?? '',
      ...(bpm !== null ? { bpm } : {}),
      ...(passage !== null ? { passageId: passage } : {}),
      note: note.trim(),
    });
    setNote('');
  };

  return (
    <Card aria-labelledby="quick-log-title">
      <div className={styles.header}>
        <h2 id="quick-log-title" className={styles.title}>
          Log entry
        </h2>
        {entryCount > 0 && (
          <button type="button" className={styles.count} onClick={onShowEntries}>
            {entryCount} logged
          </button>
        )}
      </div>

      {passages && (
        <div className={styles.group} role="group" aria-label="Passage">
          <span className={styles.groupLabel} aria-hidden="true">
            Passage
          </span>
          <ChipRow>
            <ToggleChip pressed={passage === null} onChange={() => onPassageChange?.(null)}>
              Whole piece
            </ToggleChip>
            {passages.map((p) => (
              <ToggleChip
                key={p.id}
                pressed={passage === p.id}
                onChange={() => onPassageChange?.(p.id)}
              >
                {p.label}
              </ToggleChip>
            ))}
            <button type="button" className={styles.addChip} onClick={onAddPassage}>
              <Plus size={16} aria-hidden="true" /> Passage
            </button>
          </ChipRow>
        </div>
      )}

      <div className={styles.group} role="group" aria-label="Method">
        {passages && (
          <span className={styles.groupLabel} aria-hidden="true">
            Method
          </span>
        )}
        <ChipRow>
          {methods.map((m) => (
            <ToggleChip key={m} pressed={method === m} onChange={(on) => setMethod(on ? m : null)}>
              {m}
            </ToggleChip>
          ))}
        </ChipRow>
      </div>

      <div className={styles.bpm} role="group" aria-label="Tempo">
        <IconButton label="Slower" variant="outline" onClick={() => step(-BPM_STEP)}>
          <Minus size={20} />
        </IconButton>
        <output className={`${styles.bpmValue} tabular`} aria-live="polite">
          {bpm ?? '–'} <span className={styles.bpmUnit}>BPM</span>
        </output>
        <IconButton label="Faster" variant="outline" onClick={() => step(BPM_STEP)}>
          <Plus size={20} />
        </IconButton>
        {bpm !== null ? (
          <IconButton label="No tempo" onClick={() => setBpm(() => null)}>
            <X size={18} />
          </IconButton>
        ) : (
          defaultBpm !== undefined && <span className={styles.lastBpm}>last time {defaultBpm}</span>
        )}
      </div>

      <form
        className={styles.noteRow}
        onSubmit={(event) => {
          event.preventDefault();
          log();
        }}
      >
        <Input
          aria-label="Note for this entry"
          placeholder="Note (optional)"
          value={note}
          enterKeyHint="done"
          onChange={(event) => setNote(event.target.value)}
        />
        <Button type="submit" variant="soft" disabled={!canLog}>
          Log
        </Button>
      </form>
    </Card>
  );
}

interface BookLogProps {
  /** Where the book continues: one after the highest number logged. */
  next: number;
  total?: number;
  entryCount: number;
  onLog: (entry: { method: string; from: number; to: number; note: string }) => void;
  onShowEntries: () => void;
}

/**
 * Logs which exercises of a book were played, e.g. No. 45–48. After logging, the range
 * moves on to the next number. Mount with `key` = item id so each item starts fresh.
 */
export function BookLog({ next, total, entryCount, onLog, onShowEntries }: BookLogProps) {
  const [range, setRange] = useState({ from: next, to: next });
  const [note, setNote] = useState('');
  const max = total ?? 9999;

  const setFrom = (from: number) => {
    const value = Math.min(max, Math.max(1, from));
    setRange((r) => ({ from: value, to: Math.max(value, r.to) }));
  };
  const setTo = (to: number) =>
    setRange((r) => ({ ...r, to: Math.min(max, Math.max(r.from, to)) }));

  const log = () => {
    onLog({ method: '', from: range.from, to: range.to, note: note.trim() });
    const following = Math.min(max, range.to + 1);
    setRange({ from: following, to: following });
    setNote('');
  };

  return (
    <Card aria-labelledby="quick-log-title">
      <div className={styles.header}>
        <h2 id="quick-log-title" className={styles.title}>
          Exercises played
        </h2>
        {entryCount > 0 && (
          <button type="button" className={styles.count} onClick={onShowEntries}>
            {entryCount} logged
          </button>
        )}
      </div>

      <div className={styles.range}>
        <NumberStepper label="From" value={range.from} onChange={setFrom} />
        <NumberStepper label="To" value={range.to} onChange={setTo} />
      </div>

      <form
        className={styles.noteRow}
        onSubmit={(event) => {
          event.preventDefault();
          log();
        }}
      >
        <Input
          aria-label="Note for this entry"
          placeholder="Note (optional)"
          value={note}
          enterKeyHint="done"
          onChange={(event) => setNote(event.target.value)}
        />
        <Button type="submit" variant="soft">
          Log
        </Button>
      </form>
    </Card>
  );
}

function NumberStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.numberField} role="group" aria-label={label}>
      <span className={styles.numberLabel} aria-hidden="true">
        {label}
      </span>
      <div className={styles.number}>
        <IconButton
          label={`${label}: one less`}
          variant="outline"
          onClick={() => onChange(value - 1)}
        >
          <Minus size={18} />
        </IconButton>
        <output className={`${styles.numberValue} tabular`} aria-live="polite">
          <span className={styles.bpmUnit}>No.</span> {value}
        </output>
        <IconButton
          label={`${label}: one more`}
          variant="outline"
          onClick={() => onChange(value + 1)}
        >
          <Plus size={18} />
        </IconButton>
      </div>
    </div>
  );
}
