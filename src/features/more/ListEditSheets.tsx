import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  addSectionType,
  moveSectionType,
  updateSectionType,
  useSectionTypes,
} from '../../db/sectionTypes';
import { updateSettings, useSettings } from '../../db/settings';
import type { SectionType } from '../../domain/model';
import { Button, IconButton } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { Sheet } from '../../ui/Sheet';
import styles from './ListEditSheets.module.css';

interface SheetProps {
  open: boolean;
  onClose: () => void;
}

const move = <T,>(list: readonly T[], index: number, direction: -1 | 1): T[] => {
  const next = [...list];
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

/** Edits the practice methods offered as quick-log buttons. */
export function MethodsSheet({ open, onClose }: SheetProps) {
  const { methods } = useSettings();
  const [newMethod, setNewMethod] = useState('');
  const save = (next: string[]) => void updateSettings({ methods: next });

  const add = () => {
    const clean = newMethod.trim().replace(/\s+/g, ' ');
    if (clean && !methods.some((m) => m.toLowerCase() === clean.toLowerCase())) {
      save([...methods, clean]);
    }
    setNewMethod('');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Practice methods">
      <p className={styles.hint}>These appear as buttons when you log an entry during a session.</p>
      <ul className={styles.list}>
        {methods.map((method, index) => (
          <li key={method} className={styles.row}>
            <span className={styles.label}>{method}</span>
            <IconButton
              label={`Move ${method} up`}
              disabled={index === 0}
              onClick={() => save(move(methods, index, -1))}
            >
              <ArrowUp size={18} />
            </IconButton>
            <IconButton
              label={`Move ${method} down`}
              disabled={index === methods.length - 1}
              onClick={() => save(move(methods, index, 1))}
            >
              <ArrowDown size={18} />
            </IconButton>
            <IconButton
              label={`Remove ${method}`}
              onClick={() => save(methods.filter((m) => m !== method))}
            >
              <Trash2 size={18} />
            </IconButton>
          </li>
        ))}
      </ul>
      <form
        className={styles.addRow}
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <Input
          aria-label="New method"
          placeholder="New method, e.g. Memory work"
          value={newMethod}
          onChange={(event) => setNewMethod(event.target.value)}
        />
        <Button type="submit" disabled={!newMethod.trim()}>
          Add
        </Button>
      </form>
    </Sheet>
  );
}

/** Renames, reorders, adds and removes session section types. */
export function SectionTypesSheet({ open, onClose }: SheetProps) {
  const types = (useSectionTypes() ?? []).filter((t) => !t.archived);
  const [newType, setNewType] = useState('');

  const add = () => {
    const clean = newType.trim();
    if (clean) void addSectionType(clean);
    setNewType('');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Section types">
      <p className={styles.hint}>
        Sessions are grouped into these sections, in this order. Removing one keeps it in past
        sessions.
      </p>
      <ul className={styles.list}>
        {types.map((type, index) => (
          <SectionTypeRow
            key={type.id}
            type={type}
            first={index === 0}
            last={index === types.length - 1}
            only={types.length === 1}
          />
        ))}
      </ul>
      <form
        className={styles.addRow}
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <Input
          aria-label="New section type"
          placeholder="New section, e.g. Improvisation"
          value={newType}
          onChange={(event) => setNewType(event.target.value)}
        />
        <Button type="submit" disabled={!newType.trim()}>
          Add
        </Button>
      </form>
    </Sheet>
  );
}

interface SectionTypeRowProps {
  type: SectionType;
  first: boolean;
  last: boolean;
  only: boolean;
}

function SectionTypeRow({ type, first, last, only }: SectionTypeRowProps) {
  const [name, setName] = useState(type.name);
  return (
    <li className={styles.row}>
      <Input
        aria-label={`Name of ${type.name}`}
        className={styles.nameInput}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          const clean = name.trim();
          if (clean && clean !== type.name) void updateSectionType(type.id, { name: clean });
          else setName(type.name);
        }}
      />
      <IconButton
        label={`Move ${type.name} up`}
        disabled={first}
        onClick={() => void moveSectionType(type.id, -1)}
      >
        <ArrowUp size={18} />
      </IconButton>
      <IconButton
        label={`Move ${type.name} down`}
        disabled={last}
        onClick={() => void moveSectionType(type.id, 1)}
      >
        <ArrowDown size={18} />
      </IconButton>
      <IconButton
        label={`Remove ${type.name}`}
        disabled={only}
        onClick={() => void updateSectionType(type.id, { archived: true })}
      >
        <Trash2 size={18} />
      </IconButton>
    </li>
  );
}
