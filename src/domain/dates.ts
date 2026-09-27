import { addDays, startOfWeek } from 'date-fns';

/** A calendar day in local time, formatted `YYYY-MM-DD`. Sorts correctly as a string. */
export type DateKey = string;

// Written by hand: date-fns' format/parse would add a lot of locale code for this.
export function toDateKey(date: Date): DateKey {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromDateKey(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** The seven days (Monday to Sunday) of the week that contains `date`. */
export function weekDays(date: Date): DateKey[] {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i)));
}
