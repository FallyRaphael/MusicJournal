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

/** "0 min", "< 1 min", "45 min", "17 h 25 m" */
export function formatDuration(seconds: number): string {
  if (seconds > 0 && seconds < 60) return '< 1 min';
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

/** "08:42", or "1:02:03" from one hour on. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}`
    : `${String(minutes).padStart(2, '0')}:${rest}`;
}

const dayLabel = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const monthLong = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

/** "Today", "Tomorrow", "Yesterday", or "Tue 29 Sept". */
export function formatDayLabel(date: Date, now: Date = new Date()): string {
  const days = differenceInCalendarDays(date, now);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return dayLabel.format(date);
}

/** "September 2026" */
export function formatMonthLong(date: Date | number): string {
  return monthLong.format(date);
}
