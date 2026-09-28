import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTechniqueSessions } from '../../db/sessions';
import { createTechnique, deleteTechnique, updateTechnique } from '../../db/techniques';
import type { TechniqueItem } from '../../domain/model';
import { isTechnique, sessionSummaries } from '../../domain/pieceStats';
import { formatDuration, formatRelativeDay } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { Button } from '../../ui/Button';
import { TextArea, TextInput } from '../../ui/Field';
import { Sheet } from '../../ui/Sheet';
import styles from './TechniqueScreen.module.css';

const SUGGESTED_CATEGORIES = ['Scales', 'Arpeggios', 'Chords', 'Exercises', 'Études'];

interface TechniqueSheetProps {
  /** The item to edit; without it the sheet creates a new one. */
  item?: TechniqueItem;
  categories: readonly string[];
  onClose: () => void;
}

/** Creates or edits a technique item. Mount with a changing `key` for each opening. */
export function TechniqueSheet({ item, categories, onClose }: TechniqueSheetProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [focusNote, setFocusNote] = useState(item?.focusNote ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    const details = { name: name.trim(), category: category.trim(), notes: notes.trim() };
    if (!details.name) return;
    if (item) await updateTechnique(item.id, { ...details, focusNote: focusNote.trim() });
    else await createTechnique(details);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={item ? 'Technique item' : 'New technique item'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      {item && <TechniqueStats item={item} />}
      <TextInput
        label="Name"
        placeholder="e.g. C major scale, Hanon No. 1"
        value={name}
        data-autofocus={item ? undefined : true}
        onChange={(event) => setName(event.target.value)}
      />
      <TextInput
        label="Category"
        placeholder="e.g. Scales"
        list="technique-category-options"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
      />
      <datalist id="technique-category-options">
        {[...new Set([...categories, ...SUGGESTED_CATEGORIES])].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      {item && (
        <TextArea
          label="Focus next time"
          rows={2}
          value={focusNote}
          onChange={(event) => setFocusNote(event.target.value)}
        />
      )}
      <TextArea
        label="Notes"
        rows={3}
        placeholder="Keys, fingerings, tempo goals…"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      {item && !confirmDelete && (
        <div className={styles.itemActions}>
          <Button
            variant="ghost"
            icon={
              item.archived ? (
                <ArchiveRestore size={18} aria-hidden="true" />
              ) : (
                <Archive size={18} aria-hidden="true" />
              )
            }
            onClick={() =>
              void updateTechnique(item.id, { archived: !item.archived }).then(onClose)
            }
          >
            {item.archived ? 'Restore' : 'Archive'}
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
      {item && confirmDelete && (
        <div className={styles.confirm} role="alert">
          <p>
            Delete “{item.name}”? Time you practiced it stays in your sessions. To just hide it,
            archive it instead.
          </p>
          <div className={styles.itemActions}>
            <Button onClick={() => setConfirmDelete(false)}>Keep it</Button>
            <Button variant="danger" onClick={() => void deleteTechnique(item.id).then(onClose)}>
              Delete
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function TechniqueStats({ item }: { item: TechniqueItem }) {
  const sessions = useTechniqueSessions(item.id);
  const now = useNow();
  if (!sessions) return null;
  const summaries = sessionSummaries(isTechnique(item.id), sessions, now);
  if (summaries.length === 0) return <p className={styles.stats}>Not practiced yet.</p>;
  const total = summaries.reduce((sum, s) => sum + s.seconds, 0);
  return (
    <p className={styles.stats}>
      {formatDuration(total)} in {summaries.length}{' '}
      {summaries.length === 1 ? 'session' : 'sessions'}
      {' · last '}
      {formatRelativeDay(summaries[0].at).toLowerCase()}
    </p>
  );
}
