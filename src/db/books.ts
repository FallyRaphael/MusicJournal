import { useLiveQuery } from 'dexie-react-hooks';
import { oneOffLabels, replaceOneOff } from '../domain/books';
import type { Book, Id, Session } from '../domain/model';
import { sessionIndexes } from '../domain/session';
import { db } from './database';
import { deleteRecord, newRecord } from './records';

export interface BookDetails {
  name: string;
  total?: number;
  notes: string;
}

export async function createBook(details: BookDetails): Promise<Book> {
  const book: Book = newRecord({ ...details, archived: false });
  await db.books.add(book);
  return book;
}

export async function updateBook(
  id: Id,
  changes: Partial<BookDetails & Pick<Book, 'archived'>>,
): Promise<void> {
  await db.transaction('rw', db.books, async () => {
    const book = await db.books.get(id);
    if (book) await db.books.put({ ...book, ...changes, updatedAt: Date.now() });
  });
}

export function deleteBook(id: Id): Promise<void> {
  return deleteRecord('books', id);
}

/**
 * Turns a one-off into a book: creates the book and points every session and template
 * that used the one-off to it, so its history counts for the book.
 */
export async function makeBookFromOneOff(label: string, details: BookDetails): Promise<Book> {
  return db.transaction('rw', db.books, db.sessions, db.templates, async () => {
    const book = await createBook(details);
    const now = Date.now();
    for (const session of await db.sessions.toArray()) {
      const sections = replaceOneOff(session, label, book.id);
      if (!sections) continue;
      const next: Session = { ...session, sections, updatedAt: now };
      await db.sessions.put({ ...next, ...sessionIndexes(next.sections) });
    }
    for (const template of await db.templates.toArray()) {
      const sections = replaceOneOff(template, label, book.id);
      if (sections) await db.templates.put({ ...template, sections, updatedAt: now });
    }
    return book;
  });
}

/** All books (archived ones too), by name. */
export function useBooks(): Book[] | undefined {
  return useLiveQuery(async () => {
    const books = await db.books.toArray();
    return books.sort((a, b) => a.name.localeCompare(b.name));
  }, []);
}

/** All sessions that include any book. */
export function useBookSessions(): Session[] | undefined {
  return useLiveQuery(() => db.sessions.where('bookIds').above('').distinct().toArray(), []);
}

/** One-offs used in sessions or templates, most used first: candidates for a book. */
export function useOneOffLabels(): { label: string; count: number }[] | undefined {
  return useLiveQuery(async () => {
    const [sessions, templates] = await Promise.all([
      db.sessions.toArray(),
      db.templates.toArray(),
    ]);
    return oneOffLabels([...sessions, ...templates]);
  }, []);
}
