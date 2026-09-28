import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { createTechnique } from '../../db/techniques';
import type { Id, ItemRef, SectionType } from '../../domain/model';
import { filterPieces } from '../../domain/pieces';
import { Button } from '../../ui/Button';
import { ChipRow, ToggleChip } from '../../ui/Chip';
import { FieldGroup, Input, TextInput } from '../../ui/Field';
import { NoBreakKeys } from '../../ui/NoBreakKeys';
import { SearchField } from '../../ui/SearchField';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { Sheet } from '../../ui/Sheet';
import { composerLine } from '../pieces/labels';
import styles from './ItemPicker.module.css';
import { refKey } from '../../domain/refs';
import type { Lookups } from './lookups';

type Kind = 'piece' | 'technique' | 'free';

const KINDS = [
  { value: 'piece', label: 'Pieces' },
  { value: 'technique', label: 'Technique' },
  { value: 'free', label: 'Other' },
] as const;

/** Which section new items of each kind go to, unless the user picks one. */
const DEFAULT_SECTION: Record<Kind, string> = {
  piece: 'repertoire',
  technique: 'technique',
  free: 'sight-reading',
};

function defaultSection(types: readonly SectionType[], kind: Kind): Id | undefined {
  const wanted = DEFAULT_SECTION[kind];
  return (types.find((t) => t.name.toLowerCase() === wanted) ?? types[0])?.id;
}

interface ItemPickerProps {
  open: boolean;
  onClose: () => void;
  lookups: Lookups;
  /** Preselects a section, e.g. when adding from a section's own button. */
  sectionTypeId?: Id;
  onAdd: (sectionTypeId: Id, ref: ItemRef) => void;
}

/**
 * Adds pieces, technique items or free text to a plan. Stays open so several items can
 * be added in a row. Mount with a changing `key` to reset it on open.
 */
export function ItemPicker({ open, onClose, lookups, sectionTypeId, onAdd }: ItemPickerProps) {
  const types = lookups.activeSectionTypes;
  const [kind, setKind] = useState<Kind>('piece');
  const [chosenSection, setChosenSection] = useState<Id | undefined>(sectionTypeId);
  const [query, setQuery] = useState('');
  const [freeText, setFreeText] = useState('');
  const [newTechnique, setNewTechnique] = useState({ name: '', category: '' });
  const [added, setAdded] = useState<string[]>([]);

  const section = chosenSection ?? defaultSection(types, kind);

  const add = (ref: ItemRef) => {
    if (!section) return;
    onAdd(section, ref);
    setAdded((keys) => [...keys, refKey(ref)]);
  };

  const pieces = [
    ...filterPieces(lookups.pieces, { tab: 'active', query, feels: [], tags: [] }),
    ...filterPieces(lookups.pieces, { tab: 'upNext', query, feels: [], tags: [] }),
    // Shelved pieces only when searching for them.
    ...(query ? filterPieces(lookups.pieces, { tab: 'shelf', query, feels: [], tags: [] }) : []),
  ];
  const techniques = lookups.techniques.filter((t) => !t.archived);
  const categories = [...new Set(lookups.techniques.map((t) => t.category).filter(Boolean))];

  const addTechnique = async () => {
    const name = newTechnique.name.trim();
    if (!name) return;
    const item = await createTechnique({
      name,
      category: newTechnique.category.trim(),
      notes: '',
    });
    add({ kind: 'technique', techniqueId: item.id });
    setNewTechnique((t) => ({ ...t, name: '' }));
  };

  const addFree = () => {
    const label = freeText.trim();
    if (!label) return;
    add({ kind: 'free', label });
    setFreeText('');
  };

  const isAdded = (ref: ItemRef) => added.includes(refKey(ref));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add to session"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done{added.length > 0 ? ` · ${added.length} added` : ''}
        </Button>
      }
    >
      <FieldGroup label="Section">
        <ChipRow>
          {types.map((type) => (
            <ToggleChip
              key={type.id}
              pressed={type.id === section}
              onChange={() => setChosenSection(type.id)}
            >
              {type.name}
            </ToggleChip>
          ))}
        </ChipRow>
      </FieldGroup>

      <SegmentedControl
        legend="What to add"
        name="picker-kind"
        options={KINDS}
        value={kind}
        onChange={setKind}
      />

      {kind === 'piece' && (
        <>
          <SearchField label="Search pieces" value={query} onChange={setQuery} />
          {pieces.length === 0 ? (
            <p className={styles.empty}>
              {lookups.pieces.length === 0
                ? 'No pieces yet – add them under Pieces, or use “Other”.'
                : 'No matching pieces.'}
            </p>
          ) : (
            <ul className={styles.list}>
              {pieces.map((piece) => {
                const ref: ItemRef = { kind: 'piece', pieceId: piece.id };
                return (
                  <li key={piece.id}>
                    <button type="button" className={styles.option} onClick={() => add(ref)}>
                      <span className={styles.text}>
                        <span className={styles.title}>
                          <NoBreakKeys text={piece.title} />
                        </span>
                        {composerLine(piece) && (
                          <span className={styles.sub}>{composerLine(piece)}</span>
                        )}
                        {piece.focusNote && (
                          <span className={styles.focus}>Focus: {piece.focusNote}</span>
                        )}
                      </span>
                      {isAdded(ref) ? (
                        <Check size={20} className={styles.added} aria-label="Added" />
                      ) : (
                        <Plus size={20} className={styles.plus} aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {kind === 'technique' && (
        <>
          {techniques.length > 0 && (
            <ul className={styles.list}>
              {techniques.map((technique) => {
                const ref: ItemRef = { kind: 'technique', techniqueId: technique.id };
                return (
                  <li key={technique.id}>
                    <button type="button" className={styles.option} onClick={() => add(ref)}>
                      <span className={styles.text}>
                        <span className={styles.title}>{technique.name}</span>
                        {technique.category && (
                          <span className={styles.sub}>{technique.category}</span>
                        )}
                      </span>
                      {isAdded(ref) ? (
                        <Check size={20} className={styles.added} aria-label="Added" />
                      ) : (
                        <Plus size={20} className={styles.plus} aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <form
            className={styles.newForm}
            onSubmit={(event) => {
              event.preventDefault();
              void addTechnique();
            }}
          >
            <span className={styles.formTitle}>New technique item</span>
            <Input
              aria-label="Name"
              placeholder="Name, e.g. Hanon No. 1, C major scale"
              value={newTechnique.name}
              onChange={(event) => setNewTechnique((t) => ({ ...t, name: event.target.value }))}
            />
            <Input
              aria-label="Category"
              placeholder="Category, e.g. Scales (optional)"
              list="technique-categories"
              value={newTechnique.category}
              onChange={(event) => setNewTechnique((t) => ({ ...t, category: event.target.value }))}
            />
            <datalist id="technique-categories">
              {[...new Set([...categories, 'Scales', 'Arpeggios', 'Chords', 'Exercises'])].map(
                (c) => (
                  <option key={c} value={c} />
                ),
              )}
            </datalist>
            <Button type="submit" disabled={!newTechnique.name.trim()}>
              Create and add
            </Button>
          </form>
        </>
      )}

      {kind === 'free' && (
        <form
          className={styles.newForm}
          onSubmit={(event) => {
            event.preventDefault();
            addFree();
          }}
        >
          <TextInput
            label="What will you practice?"
            placeholder="e.g. Mikrokosmos II, p. 12"
            value={freeText}
            onChange={(event) => setFreeText(event.target.value)}
          />
          <Button type="submit" disabled={!freeText.trim()}>
            Add
          </Button>
        </form>
      )}
    </Sheet>
  );
}
