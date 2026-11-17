/**
 * Builds an iCalendar document (RFC 5545) from a week of lessons. Pure: the same input
 * always gives the same text, so UIDs are stable across imports.
 *
 * Times are written as Oslo wall time with `TZID=Europe/Oslo` plus a VTIMEZONE block,
 * which the client's parseIcs keeps as written and other calendar apps understand too.
 */
import type { ISODate } from '../../shared/types';
import { addDays } from './dates';

export interface IcsLesson {
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  subject: string;
  room: string | null;
  teacher: string | null;
  /** Street address when the lesson is away from school. Wins over `room` as LOCATION. */
  address: string | null;
}

export interface BuildIcsOptions {
  lessons: IcsLesson[];
  /** Monday of the week the lessons are placed in. */
  weekStart: ISODate;
  /** Last day of the weekly repetition (Oslo date), or null for one week only. */
  repeatsUntil: ISODate | null;
  /** DTSTAMP. */
  now: Date;
  calendarName?: string;
}

const CRLF = '\r\n';
const MAX_LINE_OCTETS = 75;

const OSLO_VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Oslo',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

/** Escapes a TEXT value: backslash, semicolon, comma and newlines. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n?|\n/g, '\\n');
}

/**
 * Folds a content line so no physical line is longer than 75 octets (UTF-8), never
 * splitting a multi-byte character. Continuation lines start with one space.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= MAX_LINE_OCTETS) return line;
  const parts: string[] = [];
  let current = '';
  let currentOctets = 0;
  let limit = MAX_LINE_OCTETS;
  for (const char of line) {
    const octets = encoder.encode(char).length;
    if (currentOctets + octets > limit) {
      parts.push(current);
      current = '';
      currentOctets = 0;
      limit = MAX_LINE_OCTETS - 1; // the leading space counts
    }
    current += char;
    currentOctets += octets;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

const compactDate = (date: ISODate) => date.replace(/-/g, '');
const compactTime = (time: string) => `${time.replace(':', '')}00`;

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** FNV-1a, 32 bit, as 8 hex digits. Enough to keep UIDs stable and distinct. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(text)) {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function lessonUid(lesson: IcsLesson): string {
  const key = [lesson.weekday, lesson.start, lesson.end, lesson.subject, lesson.room ?? '', lesson.address ?? '']
    .join('|')
    .toLowerCase();
  return `pdf-${hash(key)}-${lesson.weekday}${lesson.start.replace(':', '')}@kompass.app`;
}

/**
 * RRULE UNTIL must be UTC when DTSTART has a TZID. The end of 20 June in Oslo is always
 * summer time (UTC+2), so the last moment of an Oslo date in June is 21:59:59Z. For other
 * months it is computed from the standard offset, which is close enough for an end date.
 */
function untilUtc(date: ISODate): string {
  const month = Number(date.slice(5, 7));
  const summer = month >= 4 && month <= 9;
  return `${compactDate(date)}T${summer ? '215959' : '225959'}Z`;
}

export function buildTimetableIcs(options: BuildIcsOptions): string {
  const { lessons, weekStart, repeatsUntil, now } = options;
  const stamp = utcStamp(now);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kompass//Timeplan fra PDF//NO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(options.calendarName ?? 'Timeplan fra PDF')}`,
    'X-WR-TIMEZONE:Europe/Oslo',
    ...OSLO_VTIMEZONE,
  ];

  for (const lesson of lessons) {
    const day = compactDate(addDays(weekStart, lesson.weekday));
    const location = lesson.address ?? lesson.room;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${lessonUid(lesson)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Oslo:${day}T${compactTime(lesson.start)}`,
      `DTEND;TZID=Europe/Oslo:${day}T${compactTime(lesson.end)}`,
    );
    if (repeatsUntil) lines.push(`RRULE:FREQ=WEEKLY;UNTIL=${untilUtc(repeatsUntil)}`);
    lines.push(`SUMMARY:${escapeText(lesson.subject)}`);
    if (location) lines.push(`LOCATION:${escapeText(location)}`);
    if (lesson.teacher) lines.push(`DESCRIPTION:${escapeText(`Lærer: ${lesson.teacher}`)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}
