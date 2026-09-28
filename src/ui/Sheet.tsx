import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconButton } from './Button';
import styles from './Sheet.module.css';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Buttons pinned to the bottom of the sheet. */
  footer?: ReactNode;
}

/**
 * A bottom sheet built on the native modal `<dialog>`: focus stays inside, and the
 * Android back gesture, Escape or a tap on the backdrop close it. Mark a field with
 * `data-autofocus` to focus it when the sheet opens.
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // Set while we close the dialog because `open` became false. Its "close" event must not
  // call onClose then: the parent may already have opened another sheet in its place.
  const closingFromProps = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // React's autoFocus runs before the dialog is visible, so focus the marked field here.
      const field = dialog.querySelector<HTMLElement>('[data-autofocus]');
      field?.focus();
      if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
        try {
          // Continue typing after existing text rather than before it.
          field.setSelectionRange(field.value.length, field.value.length);
        } catch {
          // Number and date inputs have no text cursor; plain focus is enough there.
        }
      }
    }
    if (!open && dialog.open) {
      closingFromProps.current = true;
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titleId}
      onClose={() => {
        if (closingFromProps.current) closingFromProps.current = false;
        else onClose();
      }}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className={styles.content}>
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <IconButton label="Close" onClick={onClose}>
              <X size={22} />
            </IconButton>
          </header>
          <div className={styles.body}>{children}</div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
