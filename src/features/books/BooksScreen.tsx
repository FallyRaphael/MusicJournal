import { BookOpen, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { useBookSessions, useBooks, useOneOffLabels } from '../../db/books';
import { bookProgress, bookProgressText } from '../../domain/books';
import type { Book, Session } from '../../domain/model';
import { BackButton } from '../../ui/BackButton';
import { Button, IconButton } from '../../ui/Button';
import { EmptyState, PageHeader, Screen } from '../../ui/Screen';
import styles from '../technique/TechniqueScreen.module.css';
import { BookSheet } from './BookSheet';
import bookStyles from './BooksScreen.module.css';

type OpenSheet = { book?: Book; fromOneOff?: string };

/** Books of numbered exercises, worked through in order (e.g. for sight-reading). */
export function BooksScreen() {
  const books = useBooks();
  const sessions = useBookSessions();
  const oneOffs = useOneOffLabels();
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  // Changes on every opening, so the sheet starts fresh.
  const [sheetKey, setSheetKey] = useState(0);

  if (books === undefined || sessions === undefined) return null;
  const active = books.filter((book) => !book.archived);
  const archived = books.filter((book) => book.archived);
  const openSheet = (next: OpenSheet) => {
    setSheetKey((k) => k + 1);
    setSheet(next);
  };

  const row = (book: Book) => (
    <li key={book.id}>
      <button type="button" className={styles.row} onClick={() => openSheet({ book })}>
        <span className={styles.rowText}>
          <span className={styles.name}>{book.name}</span>
          <span className={bookStyles.progressText}>{bookProgressText(book, sessions)}</span>
          {book.total && <ProgressBar book={book} sessions={sessions} />}
        </span>
        <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
      </button>
    </li>
  );

  return (
    <Screen>
      <BackButton label="Back" fallback="/more" />
      <PageHeader
        title="Books"
        actions={
          <IconButton label="New book" onClick={() => openSheet({})}>
            <Plus size={24} />
          </IconButton>
        }
      />

      {active.length === 0 && (
        <>
          <EmptyState icon={<BookOpen size={24} aria-hidden="true" />} title="No books yet">
            Sight-reading books, étude collections – anything with numbered exercises you work
            through in order. The app remembers where you are.
          </EmptyState>
          <Button variant="primary" size="lg" block onClick={() => openSheet({})}>
            Add a book
          </Button>
        </>
      )}

      {active.length > 0 && <ul className={styles.list}>{active.map(row)}</ul>}

      {oneOffs && oneOffs.length > 0 && (
        <section className={styles.group} aria-labelledby="one-offs-title">
          <h2 id="one-offs-title" className={styles.groupTitle}>
            Turn a one-off into a book
          </h2>
          <p className={bookStyles.hint}>
            Sessions where you practiced it then count for the book.
          </p>
          <ul className={styles.list}>
            {oneOffs.map(({ label, count }) => (
              <li key={label}>
                <button
                  type="button"
                  className={styles.row}
                  onClick={() => openSheet({ fromOneOff: label })}
                >
                  <span className={styles.rowText}>
                    <span className={styles.name}>{label}</span>
                    <span className={bookStyles.progressText}>
                      Used {count} {count === 1 ? 'time' : 'times'}
                    </span>
                  </span>
                  <span className={bookStyles.action}>Make book</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {archived.length > 0 && (
        <details className={styles.archived}>
          <summary className={styles.summary}>Archived ({archived.length})</summary>
          <ul className={styles.list}>{archived.map(row)}</ul>
        </details>
      )}

      {sheet && (
        <BookSheet
          key={sheetKey}
          book={sheet.book}
          fromOneOff={sheet.fromOneOff}
          sessions={sessions}
          onClose={() => setSheet(null)}
        />
      )}
    </Screen>
  );
}

function ProgressBar({ book, sessions }: { book: Book; sessions: readonly Session[] }) {
  const done = bookProgress(book.id, sessions).last ?? 0;
  const ratio = book.total ? Math.min(1, done / book.total) : 0;
  return (
    <span className={bookStyles.bar} aria-hidden="true">
      <span className={bookStyles.fill} style={{ width: `${ratio * 100}%` }} />
    </span>
  );
}
