import { useState } from 'react';
import { Button } from './Button';
import { TextArea, TextInput } from './Field';
import { Sheet } from './Sheet';

interface TextSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  placeholder?: string;
  initial: string;
  onSave: (text: string) => void;
}

/** Edits a single text, e.g. a note. Mount with a changing `key` to reset it on open. */
export function TextSheet({
  open,
  onClose,
  title,
  label,
  placeholder,
  initial,
  onSave,
}: TextSheetProps) {
  const [text, setText] = useState(initial);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(text.trim())}>
            Save
          </Button>
        </>
      }
    >
      <TextArea
        label={label}
        value={text}
        placeholder={placeholder}
        rows={5}
        data-autofocus
        onChange={(event) => setText(event.target.value)}
      />
    </Sheet>
  );
}

interface MinutesSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  hint?: string;
  initialSeconds: number;
  onSave: (seconds: number) => void;
}

/** Enters a duration in whole minutes. Mount with a changing `key` to reset it on open. */
export function MinutesSheet({
  open,
  onClose,
  title,
  hint,
  initialSeconds,
  onSave,
}: MinutesSheetProps) {
  const [minutes, setMinutes] = useState(String(Math.round(initialSeconds / 60)));
  const value = Number(minutes);
  const valid = minutes.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 24 * 60;
  const save = () => {
    if (valid) onSave(Math.round(value) * 60);
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <TextInput
          label="Minutes"
          type="number"
          inputMode="numeric"
          min={0}
          max={1440}
          step={1}
          value={minutes}
          hint={hint}
          data-autofocus
          onChange={(event) => setMinutes(event.target.value)}
        />
      </form>
    </Sheet>
  );
}
