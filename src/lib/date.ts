import { addDays, differenceInCalendarDays, format, getISOWeek, startOfWeek } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { ISODate, ISOInstant, LocalDateTime } from '@shared/types';

/**
 * Date helpers for Kompass. Everything user-visible is formatted here, with the `nb` locale.
 *
 * Three string shapes are in play (see shared/types.ts):
 *  - `ISODate`        "2026-11-16"            a calendar day, local
 *  - `LocalDateTime`  "2026-11-16T08:15"      wall time, parsed as local time
 *  - `ISOInstant`     "2026-11-16T07:15:00Z"  a point in time (Entur, message timestamps)
 *
 * Every helper takes a `DateInput`, so callers can pass a `Date` or any of the three strings.
 */
export type DateInput = Date | string;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

/**
 * Parses an `ISODate` (→ local midnight) or a `LocalDateTime` as local wall time.
 * `new Date('2026-11-16')` would be read as UTC, which is why this exists.
 */
export function parseLocal(value: LocalDateTime | ISODate): Date {
  const date = DATE_ONLY.exec(value);
  if (date) return new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3]));
  const dateTime = LOCAL_DATE_TIME.exec(value);
  if (dateTime) {
    return new Date(
      Number(dateTime[1]),
      Number(dateTime[2]) - 1,
      Number(dateTime[3]),
      Number(dateTime[4]),
      Number(dateTime[5]),
      Number(dateTime[6] ?? 0),
    );
  }
  return new Date(Number.NaN);
}

/** Any supported input → `Date`. Strings with an offset or `Z` are treated as instants. */
export function toDate(input: DateInput): Date {
  if (input instanceof Date) return new Date(input.getTime());
  if (DATE_ONLY.test(input) || LOCAL_DATE_TIME.test(input)) return parseLocal(input);
  return new Date(input);
}

// ---------------------------------------------------------------- conversion

/** "2026-11-16" for the local calendar day of the input. */
export function toISODate(input: DateInput = new Date()): ISODate {
  return format(toDate(input), 'yyyy-MM-dd');
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

/** "2026-11-16T08:15" in local wall time. */
export function toLocalDateTime(input: DateInput = new Date()): LocalDateTime {
  return format(toDate(input), "yyyy-MM-dd'T'HH:mm");
}

/** Joins a day and a clock time: `atTime('2026-11-16', '08:15')` → "2026-11-16T08:15". */
export function atTime(date: DateInput, time: string): LocalDateTime {
  return `${toISODate(date)}T${time}`;
}

/** Local wall time → ISO instant (UTC, `Z`), e.g. for Entur's `dateTime`. */
export function localToInstant(value: LocalDateTime | ISODate): ISOInstant {
  return parseLocal(value).toISOString();
}

// ---------------------------------------------------------------- arithmetic

/** Whole minutes from `from` to `to` (negative when `to` is earlier). */
export function minutesBetween(from: DateInput, to: DateInput): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 60_000);
}

/** Calendar days from `now` to `date`: 0 = today, 1 = tomorrow, -1 = yesterday. */
export function daysUntil(date: DateInput, now: DateInput = new Date()): number {
  return differenceInCalendarDays(toDate(date), toDate(now));
}

export function addDaysISO(date: DateInput, days: number): ISODate {
  return toISODate(addDays(toDate(date), days));
}

/** The Monday of the week the input falls in. */
export function startOfWeekISO(input: DateInput = new Date()): ISODate {
  return toISODate(startOfWeek(toDate(input), { weekStartsOn: 1 }));
}

/** The days of the input's week, Monday first. `count` 5 gives the school week. */
export function weekDays(input: DateInput = new Date(), count = 7): ISODate[] {
  const monday = startOfWeekISO(input);
  return Array.from({ length: count }, (_, i) => addDaysISO(monday, i));
}

/** ISO 8601 week number (the one Norwegian calendars use). */
export function isoWeek(input: DateInput = new Date()): number {
  return getISOWeek(toDate(input));
}

export function isSameDay(a: DateInput, b: DateInput): boolean {
  return toISODate(a) === toISODate(b);
}

/** True for Saturday and Sunday. */
export function isWeekend(input: DateInput): boolean {
  const day = toDate(input).getDay();
  return day === 0 || day === 6;
}

// ---------------------------------------------------------------- formatting

/** "08:15" */
export function formatTime(input: DateInput): string {
  return format(toDate(input), 'HH:mm');
}

/** "08:15–09:45" */
export function formatTimeRange(start: DateInput, end: DateInput): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

/** "mandag 16. november" */
export function formatDayLong(input: DateInput): string {
  return format(toDate(input), 'EEEE d. MMMM', { locale: nb });
}

/** "man. 16. nov." */
export function formatDayShort(input: DateInput): string {
  return format(toDate(input), "EEE'.' d. MMM", { locale: nb });
}

/** "mandag" */
export function formatWeekday(input: DateInput): string {
  return format(toDate(input), 'EEEE', { locale: nb });
}

/** "16. november 2026" */
export function formatDate(input: DateInput): string {
  return format(toDate(input), 'd. MMMM yyyy', { locale: nb });
}

/** "november 2026" */
export function formatMonthYear(input: DateInput): string {
  return format(toDate(input), 'MMMM yyyy', { locale: nb });
}

/**
 * The day relative to `now`, for running text: "i dag", "i morgen", "i går",
 * "på fredag" (2–6 days ahead), otherwise "fre. 20. nov.".
 */
export function relativeDay(input: DateInput, now: DateInput = new Date()): string {
  const diff = daysUntil(input, now);
  if (diff === 0) return 'i dag';
  if (diff === 1) return 'i morgen';
  if (diff === -1) return 'i går';
  if (diff >= 2 && diff <= 6) return `på ${formatWeekday(input)}`;
  return formatDayShort(input);
}

/** Distance in days, for deadlines: "i dag", "i morgen", "om 3 dager", "i går", "for 2 dager siden". */
export function formatDaysUntil(input: DateInput, now: DateInput = new Date()): string {
  const diff = daysUntil(input, now);
  if (diff === 0) return 'i dag';
  if (diff === 1) return 'i morgen';
  if (diff === -1) return 'i går';
  return diff > 0 ? `om ${diff} dager` : `for ${-diff} dager siden`;
}

/**
 * A duration until something happens: "nå" (under a minute), "om 12 min", "om 1 t 5 min",
 * "om 2 t", and "om 3 dager" from 24 hours and up. Past values give "nå".
 */
export function formatCountdown(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return 'nå';
  if (minutes < 60) return `om ${minutes} min`;
  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `om ${hours} t` : `om ${hours} t ${rest} min`;
  }
  const days = Math.floor(minutes / (24 * 60));
  return days === 1 ? 'om 1 dag' : `om ${days} dager`;
}

/** A length of time: "45 min", "1 t 30 min", "3 t". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours} t` : `${hours} t ${rest} min`;
}

/**
 * Compact timestamp for message lists: "14:32" today, "i går 14:32", "tor. 14:32" within the
 * last week, otherwise "12. nov." (with the year when it is not the current one).
 */
export function formatTimestamp(input: DateInput, now: DateInput = new Date()): string {
  const date = toDate(input);
  const diff = daysUntil(date, now);
  if (diff === 0) return formatTime(date);
  if (diff === -1) return `i går ${formatTime(date)}`;
  if (diff < -1 && diff >= -6) return `${format(date, "EEE'.'", { locale: nb })} ${formatTime(date)}`;
  const sameYear = date.getFullYear() === toDate(now).getFullYear();
  return format(date, sameYear ? 'd. MMM' : 'd. MMM yyyy', { locale: nb });
}
