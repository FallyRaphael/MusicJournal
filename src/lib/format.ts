import { differenceInCalendarDays } from 'date-fns';

const longDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const narrowWeekday = new Intl.DateTimeFormat('en-GB', { weekday: 'narrow' });
const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const mediumDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });

/** "Sunday 27 September" */
export function formatLongDate(date: Date): string {
  return longDate.format(date);
}

/** "S" */
export function formatWeekdayLetter(date: Date): string {
  return narrowWeekday.format(date);
}

/** "15 Dec" */
export function formatShortDate(date: Date | number): string {
  return shortDate.format(date);
}

/** "15 Dec 2026" */
export function formatMediumDate(date: Date | number): string {
  return mediumDate.format(date);
}

/** "Aug 2026" */
export function formatMonthYear(date: Date | number): string {
  return monthYear.format(date);
}

/** "0 min", "45 min", "17 h 25 m" */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} h ${String(minutes).padStart(2, '0')} m`;
}

/** "Today", "Yesterday", "3 days ago", or a date for anything older than a week. */
export function formatRelativeDay(date: Date | number, now: Date = new Date()): string {
  const days = differenceInCalendarDays(now, date);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatShortDate(date);
}
