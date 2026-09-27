import type { ReactNode } from 'react';
import styles from './SegmentedControl.module.css';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  /** Accessible name of the whole group. */
  legend: string;
  /** Radio group name; must be unique on the page. */
  name: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A row of mutually exclusive options, built on real radio buttons. */
export function SegmentedControl<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className={styles.group}>
      <legend className="visually-hidden">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={styles.option}>
          <input
            type="radio"
            className={styles.input}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span className={styles.label}>
            {option.icon}
            {option.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
