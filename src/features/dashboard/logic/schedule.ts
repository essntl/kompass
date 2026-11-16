import type { CalendarEvent, ISODate } from '@shared/types';
import { addDaysISO, toDate, toISODate, toLocalDateTime } from '@/lib/date';
import {
  classesOn,
  currentClass,
  firstClassOn,
  isAbsentFrom,
  nextClass,
  withoutAbsentClasses,
} from '@/lib/timetable';

/**
 * Pure schedule decisions for the dashboard. Everything takes `now` explicitly so it can
 * be tested; the components pass the ticking value from `useNow`.
 */

/** How far ahead we look for the next school day (covers holidays like autumn break). */
export const LOOKAHEAD_DAYS = 21;

// ---------------------------------------------------------------- greeting

/** "God morgen" … "God kveld", by the hour of `now`. */
export function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour < 5) return 'God natt';
  if (hour < 10) return 'God morgen';
  if (hour < 12) return 'God formiddag';
  if (hour < 18) return 'God ettermiddag';
  if (hour < 23) return 'God kveld';
  return 'God natt';
}

/** "Sara Nilsen" → "Sara". Empty names give an empty string. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

// ---------------------------------------------------------------- next class

export type NextClassState =
  /** A class is going on now. `next` is the following class the same day, if any. */
  | { kind: 'ongoing'; event: CalendarEvent; next: CalendarEvent | null }
  /** The next class that has not started yet (today or a later day). */
  | { kind: 'upcoming'; event: CalendarEvent }
  /** No attended class ahead at all. */
  | { kind: 'none' };

/** What the hero card shows. Classes the student reported absence from are skipped. */
export function nextClassState(events: CalendarEvent[], now: Date): NextClassState {
  const attended = withoutAbsentClasses(events);
  const current = currentClass(attended, now);
  const next = nextClass(attended, now);
  if (current) {
    const sameDay = next && next.start.slice(0, 10) === current.start.slice(0, 10);
    return { kind: 'ongoing', event: current, next: sameDay ? next : null };
  }
  if (next) return { kind: 'upcoming', event: next };
  return { kind: 'none' };
}

/** 0…1, how far a class has come at `now`. */
export function classProgress(event: CalendarEvent, now: Date): number {
  const start = toDate(event.start).getTime();
  const end = toDate(event.end).getTime();
  if (!(end > start)) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
}

// ---------------------------------------------------------------- which day to plan travel for

export interface TravelDay {
  date: ISODate;
  isToday: boolean;
}

/**
 * The day the "Når må jeg dra?" card plans for: today while today's first attended class
 * has not started yet, otherwise the next day with attended classes. When nothing is found
 * within the lookahead it falls back to today (the plan then reports `no_classes`).
 */
export function travelDayFor(events: CalendarEvent[], now: Date): TravelDay {
  const today = toISODate(now);
  const attended = withoutAbsentClasses(events);
  const first = firstClassOn(attended, today);
  if (first && first.start > toLocalDateTime(now)) return { date: today, isToday: true };
  for (let offset = 1; offset <= LOOKAHEAD_DAYS; offset += 1) {
    const day = addDaysISO(today, offset);
    if (firstClassOn(attended, day)) return { date: day, isToday: false };
  }
  return { date: today, isToday: true };
}

// ---------------------------------------------------------------- day overview

export type ClassStatus = 'done' | 'ongoing' | 'upcoming';

export interface DayClass {
  event: CalendarEvent;
  status: ClassStatus;
  /** The student reported absence for this class. */
  absent: boolean;
}

export interface DayOverview {
  date: ISODate;
  isToday: boolean;
  classes: DayClass[];
}

export function classStatus(event: CalendarEvent, now: Date): ClassStatus {
  const nowLocal = toLocalDateTime(now);
  if (event.end <= nowLocal) return 'done';
  if (event.start <= nowLocal) return 'ongoing';
  return 'upcoming';
}

/**
 * Today's classes, or – when today has none – the next day that has any.
 * Absent classes are kept and flagged. Null when there is nothing in the lookahead.
 */
export function dayOverview(events: CalendarEvent[], now: Date): DayOverview | null {
  const today = toISODate(now);
  for (let offset = 0; offset <= LOOKAHEAD_DAYS; offset += 1) {
    const day = offset === 0 ? today : addDaysISO(today, offset);
    const classes = classesOn(events, day);
    if (classes.length === 0) continue;
    return {
      date: day,
      isToday: offset === 0,
      classes: classes.map((event) => ({
        event,
        status: classStatus(event, now),
        absent: isAbsentFrom(event, events),
      })),
    };
  }
  return null;
}

/** True when no attended class is left in the overview. */
export function dayIsOver(overview: DayOverview): boolean {
  return overview.classes.every((c) => c.status === 'done' || c.absent);
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The class note without a "Lærer: <name>" line or sentence when the card already names
 * that teacher (imported timetables put the teacher in the description). Empty → ''.
 */
export function noteWithoutTeacher(note: string | undefined, teacherName: string | undefined): string {
  if (!note) return '';
  if (!teacherName) return note.trim();
  const pattern = new RegExp(
    `(?:^|\\s)lærer\\s*:\\s*${escapeRegExp(teacherName)}\\s*\\.?(?=\\s|$)`,
    'giu',
  );
  return note
    .replace(pattern, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}
