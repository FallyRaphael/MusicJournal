import { X } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useBlocker } from 'react-router';
import { searchCatalog, useCatalog, type CatalogMatch } from '../../catalog/catalog';
import type { PieceDetails } from '../../db/pieces';
import type { Feel, PieceStatus } from '../../domain/model';
import { addTag } from '../../domain/pieces';
import { Button, IconButton } from '../../ui/Button';
import { ChipRow, ToggleChip } from '../../ui/Chip';
import { FieldGroup, Input, TextArea, TextInput } from '../../ui/Field';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { Sheet } from '../../ui/Sheet';
import { FEEL_LABELS, STATUS_LABELS } from './labels';
import styles from './PieceForm.module.css';

const FEEL_OPTIONS = [
  { value: 'none', label: 'Not set' },
  ...(Object.keys(FEEL_LABELS) as Feel[]).map((value) => ({ value, label: FEEL_LABELS[value] })),
] as const;

const START_STATUSES = ['upNext', 'learning', 'maintaining'] as const;

interface PieceFormProps {
  heading: string;
  initial: PieceDetails;
  /** Only for new pieces: the status to start in. */
  initialStatus?: PieceStatus;
  /** Composers and tags already used, offered as suggestions. */
  knownComposers: readonly string[];
  knownTags: readonly string[];
  onSubmit: (details: PieceDetails, status?: PieceStatus) => Promise<void>;
  onCancel: () => void;
}

export function PieceForm(props: PieceFormProps) {
  const { initial, initialStatus } = props;
  const { catalog, failed: catalogFailed, retry: retryCatalog } = useCatalog();

  const [details, setDetails] = useState<PieceDetails>(initial);
  const [status, setStatus] = useState<PieceStatus | undefined>(initialStatus);
  const [newTag, setNewTag] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitted = useRef(false);

  const set = (changes: Partial<PieceDetails>) => setDetails((d) => ({ ...d, ...changes }));

  const dirty =
    JSON.stringify(details) !== JSON.stringify(initial) ||
    status !== initialStatus ||
    newTag !== '';
  const blocker = useBlocker(() => dirty && !submitted.current);
  const canSave = details.title.trim() !== '' && !saving;

  const suggestions = useMemo(
    () =>
      showSuggestions && catalog && details.title.trim().length >= 2
        ? searchCatalog(catalog, details.title, 6)
        : [],
    [showSuggestions, catalog, details.title],
  );

  const composerOptions = useMemo(() => {
    const names = new Set(props.knownComposers);
    catalog?.composers.forEach((c) => names.add(c.name));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [catalog, props.knownComposers]);

  const tagOptions = useMemo(() => {
    let all = [...props.knownTags];
    for (const tag of details.tags) all = addTag(all, tag);
    return all;
  }, [props.knownTags, details.tags]);

  const pick = ({ work, composer }: CatalogMatch) => {
    set({
      title: work.title,
      composer: composer.name,
      catalogNumber: work.catalog ?? '',
      catalogId: work.id,
    });
    setShowSuggestions(false);
  };

  const addNewTag = () => {
    set({ tags: addTag(details.tags, newTag) });
    setNewTag('');
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSave) return;
    setSaving(true);
    submitted.current = true;
    const tags = newTag.trim() ? addTag(details.tags, newTag) : details.tags;
    await props.onSubmit(
      {
        ...details,
        tags,
        title: details.title.trim(),
        composer: details.composer.trim(),
        catalogNumber: details.catalogNumber?.trim(),
        notes: details.notes.trim(),
      },
      status,
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <IconButton label="Cancel" onClick={props.onCancel}>
          <X size={22} />
        </IconButton>
        <h1 className={styles.heading}>{props.heading}</h1>
        <Button variant="ghost" onClick={() => void submit()} disabled={!canSave}>
          Save
        </Button>
      </header>

      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        <div className={styles.titleField}>
          <TextInput
            label="Title"
            required
            autoComplete="off"
            value={details.title}
            placeholder="Search the catalog or type a title"
            onChange={(event) => {
              set({ title: event.target.value, catalogId: undefined });
              setShowSuggestions(true);
              if (catalogFailed) retryCatalog();
            }}
          />
          {catalogFailed && showSuggestions && (
            <p className={styles.catalogError} role="status">
              The catalog couldn’t be loaded, so there are no suggestions. You can still type the
              title yourself.{' '}
              <button type="button" className={styles.linkButton} onClick={retryCatalog}>
                Try again
              </button>
            </p>
          )}
          {suggestions.length > 0 && (
            <div className={styles.suggestions}>
              <span className={styles.suggestionsLabel}>From the catalog</span>
              <ul className={styles.suggestionList}>
                {suggestions.map((match) => (
                  <li key={match.work.id}>
                    <button type="button" className={styles.suggestion} onClick={() => pick(match)}>
                      <span className={styles.suggestionTitle}>
                        <NoBreakKeys text={match.work.title} />
                      </span>
                      <span className={styles.suggestionMeta}>
                        {[match.composer.name, match.work.catalog].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <TextInput
          label="Composer"
          autoComplete="off"
          list="composer-options"
          value={details.composer}
          onChange={(event) => set({ composer: event.target.value })}
        />
        <datalist id="composer-options">
          {composerOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <TextInput
          label="Catalog number"
          autoComplete="off"
          placeholder="e.g. Op. 9 No. 2, BWV 846"
          value={details.catalogNumber ?? ''}
          onChange={(event) => set({ catalogNumber: event.target.value })}
        />

        {status !== undefined && (
          <FieldGroup label="Status">
            <SegmentedControl
              legend="Status"
              name="piece-status"
              options={START_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
              value={status}
              onChange={setStatus}
            />
          </FieldGroup>
        )}

        <FieldGroup label="How it feels to you" hint="Optional – change it any time.">
          <SegmentedControl
            legend="How it feels to you"
            name="piece-feel"
            options={FEEL_OPTIONS}
            value={details.feel ?? 'none'}
            onChange={(value) => set({ feel: value === 'none' ? undefined : value })}
          />
        </FieldGroup>

        <FieldGroup label="Tags">
          {tagOptions.length > 0 && (
            <ChipRow>
              {tagOptions.map((tag) => (
                <ToggleChip
                  key={tag}
                  pressed={details.tags.includes(tag)}
                  onChange={(on) =>
                    set({
                      tags: on ? addTag(details.tags, tag) : details.tags.filter((t) => t !== tag),
                    })
                  }
                >
                  {tag}
                </ToggleChip>
              ))}
            </ChipRow>
          )}
          <div className={styles.addTag}>
            <Input
              aria-label="New tag"
              placeholder="New tag, e.g. Recital"
              value={newTag}
              enterKeyHint="done"
              onChange={(event) => setNewTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addNewTag();
                }
              }}
            />
            <Button onClick={addNewTag} disabled={!newTag.trim()}>
              Add
            </Button>
          </div>
        </FieldGroup>

        <TextInput
          label="Target date"
          type="date"
          value={details.targetDate ?? ''}
          onChange={(event) => set({ targetDate: event.target.value || undefined })}
          hint={
            details.targetDate ? (
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => set({ targetDate: undefined })}
              >
                Remove target date
              </button>
            ) : (
              'Optional, e.g. a lesson or recital.'
            )
          }
        />

        <TextArea
          label="Notes"
          value={details.notes}
          placeholder="Edition, fingering ideas, recordings to listen to…"
          onChange={(event) => set({ notes: event.target.value })}
        />
      </form>

      <Sheet
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Discard changes?"
        footer={
          <>
            <Button onClick={() => blocker.reset?.()}>Keep editing</Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              Discard
            </Button>
          </>
        }
      >
        <p>Your changes haven’t been saved.</p>
      </Sheet>
    </div>
  );
}
