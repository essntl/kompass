import type { AbsenceDetectRequest, AbsenceDetectResponse } from '@shared/api';
import type { CalendarEvent, ISODate } from '@shared/types';
import {
  ABSENCE_REASONS,
  ABSENCE_REASON_LABELS,
  joinNorwegian,
  type AbsenceInput,
} from '@/lib/absence';
import {
  addDaysISO,
  formatTime,
  formatTimeRange,
  formatWeekday,
  relativeDay,
  type DateInput,
} from '@/lib/date';
import { classesBetween, classesOn, isAbsentFrom } from '@/lib/timetable';

/**
 * Pure helpers around automatic absence detection: what we send to the backend, how its
 * answer becomes an absence input, and how that input reads in the suggestion card.
 */

/** Today plus this many days ahead are sent along, so "norsktimen på fredag" can be resolved. */
export const DETECTION_WINDOW_DAYS = 10;

/** Limits of the backend's request schema (server/lib/validate.ts). */
const MAX_CLASSES = 200;
const MAX_SUBJECT_LENGTH = 120;
const MAX_EVENT_ID_LENGTH = 100;
export const MAX_DETECTION_MESSAGE_LENGTH = 2000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const dayOf = (event: CalendarEvent): ISODate => event.start.slice(0, 10);
const uniq = <T>(items: T[]): T[] => [...new Set(items)];

export function capitalise(text: string): string {
  return text.charAt(0).toLocaleUpperCase('nb') + text.slice(1);
}

/** The classes from `today` through `days` days ahead, in the shape the backend expects. */
export function buildUpcomingClasses(
  events: CalendarEvent[],
  today: ISODate,
  days: number = DETECTION_WINDOW_DAYS,
): AbsenceDetectRequest['upcomingClasses'] {
  return classesBetween(events, today, addDaysISO(today, days))
    .filter((event) => event.id.length <= MAX_EVENT_ID_LENGTH && event.title.trim().length > 0)
    .slice(0, MAX_CLASSES)
    .map((event) => ({
      eventId: event.id,
      date: dayOf(event),
      subject: event.title.trim().slice(0, MAX_SUBJECT_LENGTH),
      start: formatTime(event.start),
      end: formatTime(event.end),
    }));
}

/**
 * Turns the backend's answer into something `reportAbsence` accepts, or `null` when there
 * is nothing sensible to suggest:
 *  - not an absence, or no day from today onwards,
 *  - single classes were meant but none of them exists in the timetable (any more).
 *
 * For a whole day the response has no class ids; the days alone describe the absence.
 */
export function detectionToAbsenceInput(
  response: AbsenceDetectResponse,
  events: CalendarEvent[],
  today: ISODate,
): AbsenceInput | null {
  if (!response.isAbsence) return null;

  const reason =
    response.reason && ABSENCE_REASONS.includes(response.reason) ? response.reason : 'annet';
  // "Annet" says little on its own, so the model's short phrase goes along as the note.
  const reasonText = response.reasonText?.trim();
  const text = reason === 'annet' && reasonText ? reasonText : undefined;

  const dates = uniq(response.dates.filter((date) => ISO_DATE.test(date) && date >= today)).sort();

  if (response.wholeDay) {
    if (dates.length === 0) return null;
    return {
      dates,
      wholeDay: true,
      classEventIds: [],
      reason,
      ...(text ? { text } : {}),
      source: 'ai',
    };
  }

  const wanted = new Set(response.classEventIds);
  const classes = events
    .filter((event) => event.kind === 'class' && wanted.has(event.id) && dayOf(event) >= today)
    .sort((a, b) => a.start.localeCompare(b.start));
  if (classes.length === 0) return null;

  return {
    dates: uniq(classes.map(dayOf)).sort(),
    wholeDay: false,
    classEventIds: classes.map((event) => event.id),
    reason,
    ...(text ? { text } : {}),
    source: 'ai',
  };
}

/**
 * True when the calendar already holds this absence: every day (whole day) or every class
 * is covered by an absence event. Used to avoid suggesting or reporting the same thing twice.
 */
export function isAbsenceRegistered(
  input: Pick<AbsenceInput, 'dates' | 'wholeDay' | 'classEventIds'>,
  events: CalendarEvent[],
): boolean {
  const absences = events.filter((event) => event.kind === 'absence');
  if (absences.length === 0) return false;

  if (input.wholeDay) {
    if (input.dates.length === 0) return false;
    return input.dates.every((date) => {
      if (absences.some((event) => event.allDay && dayOf(event) === date)) return true;
      // Every lesson that day reported one by one amounts to the same thing.
      const classes = classesOn(events, date);
      return classes.length > 0 && classes.every((cls) => isAbsentFrom(cls, absences));
    });
  }

  const classes = events.filter(
    (event) => event.kind === 'class' && input.classEventIds.includes(event.id),
  );
  return classes.length > 0 && classes.every((cls) => isAbsentFrom(cls, absences));
}

export interface AbsenceSummary {
  /** "I morgen", "I dag og i morgen", "På fredag". */
  when: string;
  /** "Hele dagen" or "Norsk kl. 13:40–14:25". */
  scope: string;
  /** "Sykdom" */
  reason: string;
}

/** A readable summary of an absence input for the suggestion card. */
export function summariseAbsence(
  input: Pick<AbsenceInput, 'dates' | 'wholeDay' | 'classEventIds' | 'reason'>,
  events: CalendarEvent[],
  now: DateInput = new Date(),
): AbsenceSummary {
  const dates = [...input.dates].sort();
  const when = capitalise(joinNorwegian(dates.map((date) => relativeDay(date, now))));
  const reason = ABSENCE_REASON_LABELS[input.reason];
  if (input.wholeDay) return { when, scope: 'Hele dagen', reason };

  const classes = events
    .filter((event) => event.kind === 'class' && input.classEventIds.includes(event.id))
    .sort((a, b) => a.start.localeCompare(b.start));
  if (classes.length === 0) return { when, scope: 'Enkelttimer', reason };

  const severalDays = dates.length > 1;
  const scope = joinNorwegian(
    classes.map((cls) => {
      const time = `kl. ${formatTimeRange(cls.start, cls.end)}`;
      return severalDays
        ? `${cls.title} ${formatWeekday(cls.start)} ${time}`
        : `${cls.title} ${time}`;
    }),
  );
  return { when, scope, reason };
}
