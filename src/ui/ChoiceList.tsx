import { Check } from 'lucide-react';
import styles from './ChoiceList.module.css';

interface Choice<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface ChoiceListProps<T extends string> {
  /** Accessible name of the group. */
  legend: string;
  /** Radio group name; must be unique on the page. */
  name: string;
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A vertical list of radio options with optional descriptions. */
export function ChoiceList<T extends string>({
  legend,
  name,
  choices,
  value,
  onChange,
}: ChoiceListProps<T>) {
  return (
    <fieldset className={styles.list}>
      <legend className="visually-hidden">{legend}</legend>
      {choices.map((choice) => (
        <label key={choice.value} className={styles.choice}>
          <input
            type="radio"
            className={styles.input}
            name={name}
            value={choice.value}
            checked={value === choice.value}
            onChange={() => onChange(choice.value)}
          />
          <span className={styles.text}>
            <span className={styles.label}>{choice.label}</span>
            {choice.description && <span className={styles.description}>{choice.description}</span>}
          </span>
          <Check size={20} className={styles.check} aria-hidden="true" />
        </label>
      ))}
    </fieldset>
  );
}
