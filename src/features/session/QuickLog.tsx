import { Minus, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button, IconButton } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ChipRow, ToggleChip } from '../../ui/Chip';
import { Input } from '../../ui/Field';
import styles from './QuickLog.module.css';

const BPM_STEP = 2;

interface QuickLogProps {
  methods: readonly string[];
  /** Starting tempo: the last one logged for this piece or technique item. */
  defaultBpm?: number;
  entryCount: number;
  onLog: (entry: { method: string; bpm?: number; note: string }) => void;
  onShowEntries: () => void;
}

/**
 * Logs how an item is being practiced in a few taps: a method, an optional tempo and an
 * optional note. Method and tempo stay selected after logging, for the next repetition.
 * Mount with `key` = item id so each item starts fresh.
 */
export function QuickLog({ methods, defaultBpm, entryCount, onLog, onShowEntries }: QuickLogProps) {
  const [method, setMethod] = useState<string | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const canLog = method !== null || bpm !== null || note.trim() !== '';
  const step = (delta: number) =>
    setBpm((current) =>
      Math.min(300, Math.max(20, (current ?? defaultBpm ?? 60) + (current === null ? 0 : delta))),
    );

  const log = () => {
    if (!canLog) return;
    onLog({ method: method ?? '', ...(bpm !== null ? { bpm } : {}), note: note.trim() });
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

      <ChipRow>
        {methods.map((m) => (
          <ToggleChip key={m} pressed={method === m} onChange={(on) => setMethod(on ? m : null)}>
            {m}
          </ToggleChip>
        ))}
      </ChipRow>

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
        {bpm !== null && (
          <IconButton label="No tempo" onClick={() => setBpm(null)}>
            <X size={18} />
          </IconButton>
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
