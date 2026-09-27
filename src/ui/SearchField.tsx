import { Search } from 'lucide-react';
import styles from './SearchField.module.css';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name and placeholder. */
  label: string;
}

export function SearchField({ value, onChange, label }: SearchFieldProps) {
  return (
    <div className={styles.field}>
      <Search size={18} className={styles.icon} aria-hidden="true" />
      <input
        type="search"
        className={styles.input}
        value={value}
        placeholder={label}
        aria-label={label}
        enterKeyHint="search"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
