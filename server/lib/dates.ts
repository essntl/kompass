import type { ISODate } from '../../shared/types';

/**
 * Calendar-date helpers for `YYYY-MM-DD` strings. Everything is computed in UTC on the
 * date parts only, so the server's time zone never shifts a date.
 */

/** Monday first, matching how Norwegian weeks are written. */
export const WEEKDAYS_NB = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag'] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidISODate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function toUtc(date: ISODate): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(date: ISODate, days: number): ISODate {
  const utc = toUtc(date);
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: ISODate): number {
  return (toUtc(date).getUTCDay() + 6) % 7;
}

export function weekdayName(date: ISODate): string {
  return WEEKDAYS_NB[weekdayIndex(date)];
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

const MONTHS_NB = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
] as const;

export function monthIndexNb(name: string): number {
  const lower = name.toLowerCase();
  return MONTHS_NB.findIndex((month) => month === lower || (lower.length >= 3 && month.startsWith(lower.replace(/\.$/, ''))));
}

/** "mandag 16. november 2026" */
export function formatLongNb(date: ISODate): string {
  const utc = toUtc(date);
  return `${weekdayName(date)} ${utc.getUTCDate()}. ${MONTHS_NB[utc.getUTCMonth()]} ${utc.getUTCFullYear()}`;
}
