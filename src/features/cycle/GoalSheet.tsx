import { Check, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { newId } from '../../domain/ids';
import type { Goal, GoalKind, ItemRef } from '../../domain/model';
import { filterPieces } from '../../domain/pieces';
import { refKey } from '../../domain/refs';
import { Button } from '../../ui/Button';
import { FieldGroup, TextInput } from '../../ui/Field';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { SearchField } from '../../ui/SearchField';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { Sheet } from '../../ui/Sheet';
import { Stepper } from '../../ui/Stepper';
import { composerLine } from '../pieces/labels';
import type { Lookups } from '../session/lookups';
import styles from './GoalSheet.module.css';
import { GOAL_KIND_LABELS } from './goals';

const KINDS = (Object.keys(GOAL_KIND_LABELS) as GoalKind[]).map((value) => ({
  value,
  label: GOAL_KIND_LABELS[value],
}));

const TARGET_KINDS = [
  { value: 'piece', label: 'Pieces' },
  { value: 'technique', label: 'Technique' },
] as const;

interface GoalSheetProps {
  /** The goal to edit; without it the sheet creates a new one. */
  goal?: Goal;
  lookups: Lookups;
  /** The last tempo logged for an item, to suggest a starting tempo. */
  suggestBpm: (ref: ItemRef) => number | undefined;
  onSave: (goal: Goal) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** Creates or edits a goal. Mount with a changing `key` for each opening. */
export function GoalSheet({
  goal,
  lookups,
  suggestBpm,
  onSave,
  onDelete,
  onClose,
}: GoalSheetProps) {
  const [ref, setRef] = useState<ItemRef | undefined>(goal?.ref);
  const [choosing, setChoosing] = useState(!goal);
  const [targetKind, setTargetKind] = useState<'piece' | 'technique'>(
    goal?.ref.kind === 'technique' ? 'technique' : 'piece',
  );
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<GoalKind>(goal?.kind ?? 'bpm');
  const [fromBpm, setFromBpm] = useState(goal?.fromBpm ?? 60);
  const [toBpm, setToBpm] = useState(goal?.toBpm ?? 80);
  const [hours, setHours] = useState(Math.max(1, Math.round((goal?.targetMinutes ?? 300) / 60)));
  const [label, setLabel] = useState(goal?.label ?? '');

  const choose = (next: ItemRef) => {
    setRef(next);
    setChoosing(false);
    if (!goal) {
      // Start from where the piece is now: the last tempo logged for it.
      const start = suggestBpm(next) ?? 60;
      setFromBpm(start);
      setToBpm(start + 20);
    }
  };

  const valid =
    ref !== undefined &&
    (kind !== 'bpm' || toBpm > fromBpm) &&
    (kind !== 'check' || label.trim() !== '');

  const save = () => {
    if (!valid || !ref) return;
    const base = { id: goal?.id ?? newId(), ref, done: goal?.done ?? false };
    const note = label.trim();
    const next: Goal =
      kind === 'bpm'
        ? { ...base, kind, fromBpm, toBpm, ...(note ? { label: note } : {}) }
        : kind === 'time'
          ? { ...base, kind, targetMinutes: hours * 60, ...(note ? { label: note } : {}) }
          : { ...base, kind, label: note };
    onSave(next);
  };

  const pieces = [
    ...filterPieces(lookups.pieces, { tab: 'active', query, feels: [], tags: [] }),
    ...filterPieces(lookups.pieces, { tab: 'upNext', query, feels: [], tags: [] }),
  ];
  const techniques = lookups.techniques.filter(
    (t) => !t.archived && t.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const options: { ref: ItemRef; title: string; sub: string }[] =
    targetKind === 'piece'
      ? pieces.map((p) => ({
          ref: { kind: 'piece', pieceId: p.id },
          title: p.title,
          sub: composerLine(p),
        }))
      : techniques.map((t) => ({
          ref: { kind: 'technique', techniqueId: t.id },
          title: t.name,
          sub: t.category,
        }));

  return (
    <Sheet
      open
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New goal'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <FieldGroup label="For">
        {ref && !choosing ? (
          <div className={styles.chosen}>
            <span className={styles.chosenTitle}>
              <NoBreakKeys text={lookups.info(ref).title} />
            </span>
            <Button variant="ghost" onClick={() => setChoosing(true)}>
              Change
            </Button>
          </div>
        ) : (
          <div className={styles.chooser}>
            <SegmentedControl
              legend="Piece or technique"
              name="goal-target"
              options={TARGET_KINDS}
              value={targetKind}
              onChange={setTargetKind}
            />
            <SearchField label="Search" value={query} onChange={setQuery} />
            {options.length === 0 ? (
              <p className={styles.muted}>
                {targetKind === 'piece'
                  ? 'No matching pieces you are learning or planning.'
                  : 'No technique items – add them under More › Technique items.'}
              </p>
            ) : (
              <ul className={styles.options}>
                {options.map((option) => (
                  <li key={refKey(option.ref)}>
                    <button
                      type="button"
                      className={styles.option}
                      onClick={() => choose(option.ref)}
                    >
                      <span className={styles.optionText}>
                        <span className={styles.optionTitle}>
                          <NoBreakKeys text={option.title} />
                        </span>
                        {option.sub && <span className={styles.muted}>{option.sub}</span>}
                      </span>
                      {ref && refKey(ref) === refKey(option.ref) && (
                        <Check size={20} className={styles.selected} aria-label="Selected" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </FieldGroup>

      <FieldGroup label="Goal">
        <SegmentedControl
          legend="Kind of goal"
          name="goal-kind"
          options={KINDS}
          value={kind}
          onChange={setKind}
        />
      </FieldGroup>

      {kind === 'bpm' && (
        <div className={styles.steppers}>
          <div className={styles.stepperRow}>
            <span>From</span>
            <Stepper
              label="Starting tempo"
              value={fromBpm}
              min={20}
              max={300}
              step={2}
              unit="BPM"
              onChange={setFromBpm}
            />
          </div>
          <div className={styles.stepperRow}>
            <span>To</span>
            <Stepper
              label="Target tempo"
              value={toBpm}
              min={20}
              max={300}
              step={2}
              unit="BPM"
              onChange={setToBpm}
            />
          </div>
          {toBpm <= fromBpm && <p className={styles.warning}>The target tempo should be higher.</p>}
          <p className={styles.muted}>Progress comes from the tempos you log in sessions.</p>
        </div>
      )}

      {kind === 'time' && (
        <div className={styles.steppers}>
          <div className={styles.stepperRow}>
            <span>Practice</span>
            <Stepper
              label="Target time"
              value={hours}
              min={1}
              max={200}
              unit="h"
              onChange={setHours}
            />
          </div>
          <p className={styles.muted}>Counts the time practiced during this cycle.</p>
        </div>
      )}

      <TextInput
        label={kind === 'check' ? 'What should be done?' : 'Note (optional)'}
        placeholder={
          kind === 'check'
            ? 'e.g. Memorize the first page'
            : 'e.g. with the metronome, hands together'
        }
        value={label}
        onChange={(event) => setLabel(event.target.value)}
      />

      {goal && onDelete && (
        <Button
          variant="ghost"
          className={styles.delete}
          icon={<Trash2 size={18} aria-hidden="true" />}
          onClick={onDelete}
        >
          Delete goal
        </Button>
      )}
    </Sheet>
  );
}
