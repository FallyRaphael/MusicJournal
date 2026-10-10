import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { createBook, deleteBook, makeBookFromOneOff, updateBook } from '../../db/books';
import { bookProgressText } from '../../domain/books';
import type { Book, Session } from '../../domain/model';
import { isBook, sessionSummaries } from '../../domain/pieceStats';
import { formatDuration } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { Button } from '../../ui/Button';
import { TextArea, TextInput } from '../../ui/Field';
import { Sheet } from '../../ui/Sheet';
import styles from '../technique/TechniqueScreen.module.css';

interface BookSheetProps {
  /** The book to edit; without it the sheet creates a new one. */
  book?: Book;
  /** Creates the book from this one-off and moves its history over. */
  fromOneOff?: string;
  sessions: readonly Session[];
  onClose: () => void;
}

/** Creates or edits a book. Mount with a changing `key` for each opening. */
export function BookSheet({ book, fromOneOff, sessions, onClose }: BookSheetProps) {
  const [name, setName] = useState(book?.name ?? fromOneOff ?? '');
  const [total, setTotal] = useState(book?.total ? String(book.total) : '');
  const [notes, setNotes] = useState(book?.notes ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    const count = Number(total);
    const details = {
      name: name.trim(),
      total: Number.isInteger(count) && count > 0 ? count : undefined,
      notes: notes.trim(),
    };
    if (!details.name) return;
    if (book) await updateBook(book.id, details);
    else if (fromOneOff) await makeBookFromOneOff(fromOneOff, details);
    else await createBook(details);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={book ? 'Book' : 'New book'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => void save()}>
            {fromOneOff ? 'Make book' : 'Save'}
          </Button>
        </>
      }
    >
      {book && <BookStats book={book} sessions={sessions} />}
      {fromOneOff && (
        <p className={styles.stats}>
          Every session and template with “{fromOneOff}” will use this book instead.
        </p>
      )}
      <TextInput
        label="Name"
        placeholder="e.g. Sight-reading book 1"
        value={name}
        data-autofocus={book ? undefined : true}
        onChange={(event) => setName(event.target.value)}
      />
      <TextInput
        label="Number of exercises (optional)"
        type="number"
        inputMode="numeric"
        min={1}
        value={total}
        onChange={(event) => setTotal(event.target.value)}
      />
      <TextArea
        label="Notes"
        rows={3}
        placeholder="Edition, level, how many per day…"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      {book && !confirmDelete && (
        <div className={styles.itemActions}>
          <Button
            variant="ghost"
            icon={
              book.archived ? (
                <ArchiveRestore size={18} aria-hidden="true" />
              ) : (
                <Archive size={18} aria-hidden="true" />
              )
            }
            onClick={() => void updateBook(book.id, { archived: !book.archived }).then(onClose)}
          >
            {book.archived ? 'Restore' : 'Archive'}
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
      {book && confirmDelete && (
        <div className={styles.confirm} role="alert">
          <p>
            Delete “{book.name}”? Time you practiced it stays in your sessions. To just hide it,
            archive it instead.
          </p>
          <div className={styles.itemActions}>
            <Button onClick={() => setConfirmDelete(false)}>Keep it</Button>
            <Button variant="danger" onClick={() => void deleteBook(book.id).then(onClose)}>
              Delete
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function BookStats({ book, sessions }: { book: Book; sessions: readonly Session[] }) {
  const now = useNow();
  const summaries = sessionSummaries(isBook(book.id), sessions, now);
  const total = summaries.reduce((sum, s) => sum + s.seconds, 0);
  return (
    <p className={styles.stats}>
      {bookProgressText(book, sessions)}
      {summaries.length > 0 &&
        ` · ${formatDuration(total)} in ${summaries.length} ${summaries.length === 1 ? 'session' : 'sessions'}`}
    </p>
  );
}
