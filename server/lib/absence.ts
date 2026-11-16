import type { AbsenceDetectRequest, AbsenceDetectResponse } from '../../shared/api';
import type { AbsenceReason, ISODate } from '../../shared/types';
import { addDays, diffDays, isValidISODate, weekdayIndex } from './dates';

/** What the model (or the mock heuristic) reports before the server validates it. */
export interface RawDetection {
  isAbsence: boolean;
  dates: string[];
  classes: string[];
  wholeDay: boolean;
  reason: string | null;
  reasonText: string | null;
}

export const ABSENCE_REASONS = [
  'sykdom',
  'lege_tannlege',
  'familie',
  'transport',
  'annet',
] as const satisfies readonly AbsenceReason[];

type UpcomingClass = AbsenceDetectRequest['upcomingClasses'][number];

const MAX_DAYS_BACK = 7;
const MAX_DAYS_AHEAD = 31;
const MAX_DATES = 14;
const MAX_REASON_TEXT = 60;

/** Everyday names students use for subjects, mapped to words in the official subject name. */
const SUBJECT_ALIASES: Record<string, string[]> = {
  matte: ['matematikk'],
  gym: ['kroppsøving'],
  krø: ['kroppsøving'],
  samf: ['samfunnskunnskap', 'samfunnsfag'],
  yff: ['yrkesfaglig fordypning'],
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
const firstWordOf = (name: string) => name.split(/[\s,-]/)[0];

export function uniqueSubjects(upcomingClasses: UpcomingClass[]): string[] {
  return [...new Set(upcomingClasses.map((item) => item.subject))];
}

function subjectForAlias(alias: string, subjects: string[]): string | undefined {
  const targets = SUBJECT_ALIASES[alias] ?? [];
  return subjects.find((subject) => targets.some((target) => normalize(subject).includes(target)));
}

/**
 * Finds the subject in `subjects` that `mention` refers to: the exact name, a name that
 * contains the mention (or the other way round, as in "norsktimen"), or a known alias.
 */
export function matchSubject(mention: string, subjects: string[]): string | null {
  const needle = normalize(mention);
  if (!needle) return null;

  const exact = subjects.find((subject) => normalize(subject) === needle);
  if (exact) return exact;

  for (const subject of subjects) {
    const name = normalize(subject);
    const firstWord = firstWordOf(name);
    if (needle.length >= 3 && name.includes(needle)) return subject;
    if (needle.includes(name)) return subject;
    if (firstWord.length >= 4 && needle.includes(firstWord)) return subject;
  }

  for (const alias of Object.keys(SUBJECT_ALIASES)) {
    if (!needle.includes(alias)) continue;
    const hit = subjectForAlias(alias, subjects);
    if (hit) return hit;
  }
  return null;
}

/** Subjects from `upcomingClasses` that are mentioned somewhere in `text`. */
export function findMentionedSubjects(text: string, upcomingClasses: UpcomingClass[]): string[] {
  const haystack = normalize(text);
  const subjects = uniqueSubjects(upcomingClasses);
  const found = new Set<string>();

  for (const subject of subjects) {
    const name = normalize(subject);
    const firstWord = firstWordOf(name);
    const startsWord = (needle: string) => new RegExp(`(?<!\\p{L})${escapeRegExp(needle)}`, 'u').test(haystack);
    if (startsWord(name) || (firstWord.length >= 4 && startsWord(firstWord))) found.add(subject);
  }
  for (const alias of Object.keys(SUBJECT_ALIASES)) {
    if (!new RegExp(`(?<!\\p{L})${alias}`, 'u').test(haystack)) continue;
    const hit = subjectForAlias(alias, subjects);
    if (hit) found.add(hit);
  }
  return [...found];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const NOT_ABSENCE = {
  isAbsence: false,
  dates: [],
  classes: [],
  classEventIds: [],
  wholeDay: false,
  reason: null,
  reasonText: null,
} satisfies Omit<AbsenceDetectResponse, 'mock'>;

/**
 * Validates and clamps a raw detection, then computes `classEventIds` by matching the
 * mentioned subjects against `upcomingClasses` on the detected dates. Used for both the
 * live model output and the mock heuristic, so the response shape is identical.
 */
export function finalizeDetection(
  raw: RawDetection,
  request: AbsenceDetectRequest,
  mock: boolean,
): AbsenceDetectResponse {
  if (!raw.isAbsence) return { ...NOT_ABSENCE, mock };

  const dates: ISODate[] = [...new Set(raw.dates)]
    .filter((date) => isValidISODate(date))
    .filter((date) => {
      const offset = diffDays(request.today, date);
      return offset >= -MAX_DAYS_BACK && offset <= MAX_DAYS_AHEAD;
    })
    .sort()
    .slice(0, MAX_DATES);
  if (dates.length === 0) dates.push(request.today);

  const subjects = uniqueSubjects(request.upcomingClasses);
  const classes = [
    ...new Set(
      raw.classes
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => matchSubject(name, subjects) ?? name),
    ),
  ];

  const wholeDay = raw.wholeDay || classes.length === 0;
  const wanted = new Set(classes.map(normalize));
  const classEventIds = wholeDay
    ? []
    : request.upcomingClasses
        .filter((item) => dates.includes(item.date) && wanted.has(normalize(item.subject)))
        .map((item) => item.eventId);

  const reason: AbsenceReason = (ABSENCE_REASONS as readonly string[]).includes(raw.reason ?? '')
    ? (raw.reason as AbsenceReason)
    : 'annet';
  const reasonText = raw.reasonText?.trim().slice(0, MAX_REASON_TEXT) || null;

  return {
    isAbsence: true,
    dates,
    classes: wholeDay ? [] : classes,
    classEventIds,
    wholeDay,
    reason,
    reasonText,
    mock,
  };
}

/** Weekdays (Mon–Fri) from `from` to `to`, inclusive. */
export function schoolDaysBetween(from: ISODate, to: ISODate): ISODate[] {
  const days: ISODate[] = [];
  for (let date = from; diffDays(date, to) >= 0 && days.length < MAX_DATES; date = addDays(date, 1)) {
    if (weekdayIndex(date) < 5) days.push(date);
  }
  return days;
}
