import { Fragment } from 'react';

const KEY_NAME = /([A-G]-(?:sharp|flat))/;

/**
 * Renders text so that key names like "C-sharp" never break after the hyphen
 * ("…in C-" / "sharp minor").
 */
export function NoBreakKeys({ text }: { text: string }) {
  const parts = text.split(KEY_NAME);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} style={{ whiteSpace: 'nowrap' }}>
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
