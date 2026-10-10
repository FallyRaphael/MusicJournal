import { ArrowLeft, Check, ChevronRight, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { createBook } from '../../db/books';
import { createPiece } from '../../db/pieces';
import { useRecentSessions } from '../../db/sessions';
import { createTechnique } from '../../db/techniques';
import type { Id, ItemRef } from '../../domain/model';
import { matchesQuery, recentInSection, sectionKind, type PickKind } from '../../domain/picker';
import { filterPieces } from '../../domain/pieces';
import { refKey } from '../../domain/refs';
import { Button } from '../../ui/Button';
import { Field, Input, TextInput } from '../../ui/Field';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { SearchField } from '../../ui/SearchField';
import { Sheet } from '../../ui/Sheet';
import styles from './ItemPicker.module.css';
import type { Lookups } from './lookups';

const CREATE_LABELS: Record<PickKind, string> = {
  piece: 'Piece',
  technique: 'Technique',
  book: 'Book',
  free: 'One-off',
};
const KINDS = ['piece', 'technique', 'book', 'free'] as const;

interface ItemPickerProps {
  open: boolean;
  onClose: () => void;
  lookups: Lookups;
  /** The section to add to. Without it, the picker asks for one first. */
  sectionTypeId?: Id;
  /** Items already in the plan, shown as added. */
  existing?: readonly ItemRef[];
  onAdd: (sectionTypeId: Id, ref: ItemRef) => void;
}

/**
 * Adds items to one section of a plan: suggestions from earlier sessions, a search across
 * pieces, technique and one-offs, and quick creation. Stays open so several items can be
 * added in a row. Mount with a changing `key` to reset it on open.
 */
export function ItemPicker({
  open,
  onClose,
  lookups,
  sectionTypeId,
  existing = [],
  onAdd,
}: ItemPickerProps) {
  const sessions = useRecentSessions();
  const [section, setSection] = useState<Id | undefined>(sectionTypeId);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState<PickKind | null>(null);
  const [added, setAdded] = useState<string[]>([]);

  const addedKeys = new Set([...existing.map(refKey), ...added]);
  const add = (ref: ItemRef) => {
    if (!section || addedKeys.has(refKey(ref))) return;
    onAdd(section, ref);
    setAdded((keys) => [...keys, refKey(ref)]);
  };

  const footer = (
    <Button variant="primary" onClick={onClose}>
      Done{added.length > 0 ? ` · ${added.length} added` : ''}
    </Button>
  );

  if (!section) {
    return (
      <Sheet open={open} onClose={onClose} title="Add to which section?" footer={footer}>
        <ul className={styles.list}>
          {lookups.activeSectionTypes.map((type) => (
            <li key={type.id}>
              <button type="button" className={styles.option} onClick={() => setSection(type.id)}>
                <span className={styles.text}>
                  <span className={styles.title}>{type.name}</span>
                </span>
                <ChevronRight size={20} className={styles.plus} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    );
  }

  const sectionName = lookups.sectionName(section);
  const recent = recentInSection(sessions ?? [], section).filter(
    (ref) => !lookups.info(ref).missing,
  );
  const preferred = sectionKind(sessions ?? [], section, sectionName);

  const row = (ref: ItemRef, extra?: ReactNode) => {
    const info = lookups.info(ref);
    const isAdded = addedKeys.has(refKey(ref));
    return (
      <li key={refKey(ref)}>
        <button
          type="button"
          className={styles.option}
          onClick={() => add(ref)}
          aria-disabled={isAdded}
        >
          <span className={styles.text}>
            <span className={styles.title}>
              <NoBreakKeys text={info.title} />
            </span>
            {info.subtitle && <span className={styles.sub}>{info.subtitle}</span>}
            {extra}
          </span>
          {isAdded ? (
            <Check size={20} className={styles.added} aria-label="Added" />
          ) : (
            <Plus size={20} className={styles.plus} aria-hidden="true" />
          )}
        </button>
      </li>
    );
  };

  const group = (title: string, refs: ItemRef[], empty?: string) =>
    refs.length === 0 && !empty ? null : (
      <section className={styles.group} aria-label={title}>
        <h3 className={styles.groupTitle}>{title}</h3>
        {refs.length === 0 ? (
          <p className={styles.empty}>{empty}</p>
        ) : (
          <ul className={styles.list}>
            {refs.map((ref) => {
              const focus = lookups.info(ref).focusNote;
              return row(ref, focus && <span className={styles.focus}>Focus: {focus}</span>);
            })}
          </ul>
        )}
      </section>
    );

  const pieceTabs = query
    ? (['active', 'upNext', 'shelf'] as const)
    : (['active', 'upNext'] as const);
  const pieceRefs: ItemRef[] = pieceTabs
    .flatMap((tab) => filterPieces(lookups.pieces, { tab, query, feels: [], tags: [] }))
    .map((piece) => ({ kind: 'piece', pieceId: piece.id }));
  const techniqueRefs: ItemRef[] = lookups.techniques
    .filter((t) => !t.archived && matchesQuery(query, `${t.name} ${t.category}`))
    .map((t) => ({ kind: 'technique', techniqueId: t.id }));
  const bookRefs: ItemRef[] = lookups.books
    .filter((b) => !b.archived && matchesQuery(query, b.name))
    .map((b) => ({ kind: 'book', bookId: b.id }));
  const freeRefs = recentInSection(sessions ?? [], section, 50).filter(
    (ref) => ref.kind === 'free' && matchesQuery(query, ref.label),
  );

  // Without a search, suggested items aren't listed a second time below.
  const suggestedKeys = new Set(query ? [] : recent.map(refKey));
  const notSuggested = (refs: ItemRef[]) => refs.filter((ref) => !suggestedKeys.has(refKey(ref)));
  const groups: Record<PickKind, ReactNode> = {
    piece: group(
      'Pieces',
      notSuggested(pieceRefs),
      lookups.pieces.length === 0 && !query ? 'No pieces yet – create one below.' : undefined,
    ),
    technique: group('Technique', notSuggested(techniqueRefs)),
    book: group('Books', notSuggested(bookRefs)),
    free: query ? group('One-offs', freeRefs) : null,
  };
  const order: PickKind[] = [preferred, ...KINDS].filter((kind, i, all) => all.indexOf(kind) === i);
  const nothingFound =
    query !== '' &&
    pieceRefs.length + techniqueRefs.length + bookRefs.length + freeRefs.length === 0;

  return (
    <Sheet open={open} onClose={onClose} title={`Add to ${sectionName}`} footer={footer}>
      {creating ? (
        <CreateForm
          kind={creating}
          lookups={lookups}
          initial={query}
          onBack={() => setCreating(null)}
          onCreated={(ref) => {
            add(ref);
            setCreating(null);
            setQuery('');
          }}
        />
      ) : (
        <>
          {!sectionTypeId && (
            <button type="button" className={styles.change} onClick={() => setSection(undefined)}>
              <ArrowLeft size={16} aria-hidden="true" /> Other section
            </button>
          )}
          <SearchField
            label="Search pieces, technique and books"
            value={query}
            onChange={setQuery}
          />

          {!query && group('Suggested', recent)}
          {nothingFound && <p className={styles.empty}>Nothing found – create it below.</p>}
          {order.map((kind) => groups[kind] && <div key={kind}>{groups[kind]}</div>)}

          <section className={styles.group} aria-label="Create new">
            <h3 className={styles.groupTitle}>Create new</h3>
            <div className={styles.createButtons}>
              {KINDS.map((kind) => (
                <Button
                  key={kind}
                  icon={<Plus size={18} aria-hidden="true" />}
                  onClick={() => setCreating(kind)}
                >
                  {CREATE_LABELS[kind]}
                </Button>
              ))}
            </div>
          </section>
        </>
      )}
    </Sheet>
  );
}

interface CreateFormProps {
  kind: PickKind;
  lookups: Lookups;
  /** Prefills the name, e.g. with what was searched for. */
  initial: string;
  onBack: () => void;
  onCreated: (ref: ItemRef) => void;
}

/** Creates a piece, technique item or one-off and adds it. */
function CreateForm({ kind, lookups, initial, onBack, onCreated }: CreateFormProps) {
  const [name, setName] = useState(initial);
  const [detail, setDetail] = useState('');
  const categories = [
    ...new Set([
      ...lookups.techniques.map((t) => t.category).filter(Boolean),
      'Scales',
      'Arpeggios',
      'Chords',
      'Exercises',
    ]),
  ];

  const submit = async () => {
    const title = name.trim();
    if (!title) return;
    if (kind === 'piece') {
      const piece = await createPiece(
        { title, composer: detail.trim(), tags: [], notes: '' },
        'learning',
      );
      onCreated({ kind: 'piece', pieceId: piece.id });
    } else if (kind === 'technique') {
      const item = await createTechnique({ name: title, category: detail.trim(), notes: '' });
      onCreated({ kind: 'technique', techniqueId: item.id });
    } else if (kind === 'book') {
      const total = Number(detail);
      const book = await createBook({
        name: title,
        total: Number.isInteger(total) && total > 0 ? total : undefined,
        notes: '',
      });
      onCreated({ kind: 'book', bookId: book.id });
    } else {
      onCreated({ kind: 'free', label: title });
    }
  };

  return (
    <form
      className={styles.newForm}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <button type="button" className={styles.change} onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </button>
      {kind === 'piece' && (
        <>
          <TextInput
            label="Title"
            placeholder="e.g. Clair de lune"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          <TextInput
            label="Composer (optional)"
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
          />
          <p className={styles.hint}>
            It’s added to your pieces as “Learning”. Add details later on its page.
          </p>
        </>
      )}
      {kind === 'technique' && (
        <>
          <TextInput
            label="Name"
            placeholder="e.g. Hanon No. 1, C major scale"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          <Field label="Category (optional)" htmlFor="new-technique-category">
            <Input
              id="new-technique-category"
              placeholder="e.g. Scales"
              list="technique-categories"
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
            />
          </Field>
          <datalist id="technique-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </>
      )}
      {kind === 'book' && (
        <>
          <TextInput
            label="Name"
            placeholder="e.g. Sight-reading book 1"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          <TextInput
            label="Number of exercises (optional)"
            type="number"
            inputMode="numeric"
            min={1}
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
          />
          <p className={styles.hint}>
            You log which numbers you played, and the app remembers where you are.
          </p>
        </>
      )}
      {kind === 'free' && (
        <>
          <TextInput
            label="What will you practice?"
            placeholder="e.g. Hymn accompaniment, p. 12"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          <p className={styles.hint}>
            For something you practice once. For things you come back to, create a piece, technique
            item or book instead.
          </p>
        </>
      )}
      <Button type="submit" variant="primary" disabled={!name.trim()}>
        Create and add
      </Button>
    </form>
  );
}
