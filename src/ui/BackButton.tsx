import { ChevronLeft } from 'lucide-react';
import { useGoBack } from '../lib/navigation';
import styles from './BackButton.module.css';

export function BackButton({ label, fallback }: { label: string; fallback: string }) {
  const goBack = useGoBack(fallback);
  return (
    <button type="button" className={styles.back} onClick={goBack}>
      <ChevronLeft size={22} aria-hidden="true" />
      {label}
    </button>
  );
}
