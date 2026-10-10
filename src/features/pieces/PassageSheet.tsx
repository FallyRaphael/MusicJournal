import { CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { createPassage, deletePassage, updatePassage } from '../../db/pieces';
import type { Id, Passage } from '../../domain/model';
import { barsLabel } from '../../domain/passages';
import { Button } from '../../ui/Button';
import { TextArea, TextInput } from '../../ui/Field';
import { Sheet } from '../../ui/Sheet';
import styles from './PassageSheet.module.css';

interface PassageSheetProps {
  pieceId: Id;
  /** The passage to edit; without it the sheet creates a new one. */
  passage?: Passage;
  onClose: () => void;
  onCreated?: (passage: Passage) => void;
}

const toBar = (text: string) => {
  const value = Number(text);
  return text.trim() !== '' && Number.isInteger(value) && value > 0 ? value : undefined;
};

/** Creates or edits a passage of a piece. Mount with a changing `key` for each opening. */
export function PassageSheet({ pieceId, passage, onClose, onCreated }: PassageSheetProps) {
  const [name, setName] = useState(passage?.name ?? '');
  const [from, setFrom] = useState(passage?.fromBar ? String(passage.fromBar) : '');
  const [to, setTo] = useState(passage?.toBar ? String(passage.toBar) : '');
  const [focusNote, setFocusNote] = useState(passage?.focusNote ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fromBar = toBar(from);
  const toBarValue = toBar(to);
  const bars = barsLabel({ fromBar, toBar: toBarValue });
  const valid = name.trim() !== '' || fromBar !== undefined || toBarValue !== undefined;

  const save = async () => {
    if (!valid) return;
    const details = { name: name.trim(), fromBar, toBar: toBarValue };
    if (passage) {
      await updatePassage(pieceId, passage.id, { ...details, focusNote: focusNote.trim() });
    } else {
      onCreated?.(await createPassage(pieceId, details));
    }
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={passage ? 'Passage' : 'New passage'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid} onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <div className={styles.bars}>
        <TextInput
          label="From bar"
          type="number"
          inputMode="numeric"
          min={1}
          value={from}
          data-autofocus={passage ? undefined : true}
          onChange={(event) => setFrom(event.target.value)}
        />
        <TextInput
          label="To bar"
          type="number"
          inputMode="numeric"
          min={1}
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>
      <TextInput
        label="Name (optional)"
        placeholder={bars || 'e.g. Coda, LH jumps'}
        hint="Without a name, the bars are shown."
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      {passage && (
        <TextArea
          label="Focus next time"
          rows={2}
          placeholder="What to work on in this passage"
          value={focusNote}
          onChange={(event) => setFocusNote(event.target.value)}
        />
      )}

      {passage && !confirmDelete && (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            icon={
              passage.solid ? (
                <RotateCcw size={18} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={18} aria-hidden="true" />
              )
            }
            onClick={() =>
              void updatePassage(pieceId, passage.id, { solid: !passage.solid }).then(onClose)
            }
          >
            {passage.solid ? 'Practice again' : 'Mark as solid'}
          </Button>
          <Button
            variant="ghost"
            className={styles.danger}
            icon={<Trash2 size={18} aria-hidden="true" />}
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        </div>
      )}
      {passage && confirmDelete && (
        <div className={styles.confirm} role="alert">
          <p>
            Delete this passage? Entries logged for it then count for the whole piece. To just move
            it out of the way, mark it as solid instead.
          </p>
          <div className={styles.actions}>
            <Button onClick={() => setConfirmDelete(false)}>Keep it</Button>
            <Button
              variant="danger"
              onClick={() => void deletePassage(pieceId, passage.id).then(onClose)}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
