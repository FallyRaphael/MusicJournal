const longDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const narrowWeekday = new Intl.DateTimeFormat('en-GB', { weekday: 'narrow' });

/** "Sunday 27 September" */
export function formatLongDate(date: Date): string {
  return longDate.format(date);
}

/** "S" */
export function formatWeekdayLetter(date: Date): string {
  return narrowWeekday.format(date);
}
