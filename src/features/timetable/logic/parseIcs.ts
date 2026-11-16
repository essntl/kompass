import ICAL from 'ical.js';
import type { CalendarEvent, LocalDateTime } from '@shared/types';

/**
 * Pure .ics parser for the timetable import (Visma InSchool and similar exports).
 *
 * Every time is converted to Oslo wall time (`LocalDateTime`), independent of the
 * machine's own time zone:
 *  - `...Z` (UTC)                 → instant → Oslo wall time
 *  - `TZID=Europe/Oslo`           → kept as written (it already is Oslo wall time)
 *  - `TZID=<other zone>`          → via the file's VTIMEZONE if present, else via Intl
 *  - floating (no Z, no TZID)     → kept as written
 * Recurring events (RRULE/RDATE minus EXDATE, with RECURRENCE-ID overrides) are expanded
 * inside a window around `now`.
 */

export type IcsEvent = Omit<CalendarEvent, 'id'>;

export interface IcsSkipped {
  title: string;
  /** Norwegian, user-facing. */
  reason: string;
}

export interface IcsParseOptions {
  /** Centre of the import window. Default: now. */
  now?: Date;
  /** Weeks before `now` to include. Default 4. */
  weeksBack?: number;
  /** Weeks after `now` to include. Default 26. */
  weeksAhead?: number;
  /** Optional teacher lookup from the event's description, returns a teacher id. */
  matchTeacher?: (text: string) => string | undefined;
}

export interface IcsParseResult {
  /** Sorted by start. */
  events: IcsEvent[];
  /** Entries that could not be imported, with a reason. */
  skipped: IcsSkipped[];
  /** Occurrences that are valid but fall outside the import window. */
  outsideWindow: number;
  /** X-WR-CALNAME, when the file has one. */
  calendarName?: string;
  /** Window used, as ISO dates (inclusive). */
  window: { from: string; to: string };
}

/** Thrown for files that are not a readable calendar. `message` is Norwegian. */
export class IcsParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IcsParseError';
  }
}

export const OSLO = 'Europe/Oslo';
const MAX_OCCURRENCES_PER_EVENT = 5000;
/** A timed event without an end gets a normal lesson length. */
const DEFAULT_MINUTES = 45;

/** Windows / Outlook zone names that show up in exports, mapped to IANA. */
const WINDOWS_ZONES: Record<string, string> = {
  'W. Europe Standard Time': OSLO,
  'Romance Standard Time': 'Europe/Paris',
  'Central Europe Standard Time': 'Europe/Budapest',
  'Central European Standard Time': 'Europe/Warsaw',
  'GMT Standard Time': 'Europe/London',
  'FLE Standard Time': 'Europe/Helsinki',
  'UTC': 'UTC',
  'Coordinated Universal Time': 'UTC',
};

// ---------------------------------------------------------------- time zone maths

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

interface WallParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function wallPartsIn(timeZone: string, ms: number): WallParts {
  const parts: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(new Date(ms))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year ?? 1970,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: (parts.hour ?? 0) % 24,
    minute: parts.minute ?? 0,
  };
}

const wallToString = (p: WallParts): LocalDateTime =>
  `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;

/** An instant as Oslo wall time. */
export function instantToOslo(ms: number): LocalDateTime {
  return wallToString(wallPartsIn(OSLO, ms));
}

/** Offset (zone wall time − UTC) in ms at the instant. */
function offsetAt(timeZone: string, ms: number): number {
  const p = wallPartsIn(timeZone, ms);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(ms / 60_000) * 60_000;
}

/** Wall time in a zone → instant (ms). Gaps resolve forwards, overlaps to the first. */
function wallToInstant(p: WallParts, timeZone: string): number {
  const guess = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const first = offsetAt(timeZone, guess);
  const instant = guess - first;
  const second = offsetAt(timeZone, instant);
  return second === first ? instant : guess - second;
}

function isKnownZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** TZID parameter → IANA name, or null when unknown. */
export function resolveTzid(tzid: string | null | undefined): string | null {
  if (!tzid) return null;
  const clean = tzid.trim().replace(/^"|"$/g, '');
  if (!clean) return null;
  if (WINDOWS_ZONES[clean]) return WINDOWS_ZONES[clean];
  if (/europe\/oslo/i.test(clean)) return OSLO;
  // "/mozilla.org/20050126_1/Europe/Berlin" and friends: keep the IANA tail.
  const tail = /([A-Za-z_]+\/[A-Za-z_+-]+(?:\/[A-Za-z_+-]+)?)$/.exec(clean)?.[1];
  for (const candidate of [clean, tail]) {
    if (candidate && isKnownZone(candidate)) return candidate;
  }
  return null;
}

function tzidOf(property: ICAL.Property | null): string | null {
  if (!property) return null;
  const value = property.getParameter('tzid');
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** An ICAL.Time (date-time) as Oslo wall time. */
function toOsloWall(time: ICAL.Time, tzidParam: string | null): LocalDateTime {
  const wall: WallParts = {
    year: time.year,
    month: time.month,
    day: time.day,
    hour: time.hour,
    minute: time.minute,
  };
  const zoneId = time.zone?.tzid ?? 'floating';
  if (zoneId === 'UTC' || zoneId === 'Z') return instantToOslo(time.toUnixTime() * 1000);

  const iana = resolveTzid(tzidParam ?? (zoneId !== 'floating' ? zoneId : null));
  if (iana === OSLO) return wallToString(wall);
  if (zoneId !== 'floating') {
    // The file defines the zone (VTIMEZONE): ical.js knows its rules.
    return instantToOslo(time.toUnixTime() * 1000);
  }
  if (iana) return instantToOslo(wallToInstant(wall, iana));
  // Floating, or a zone we cannot resolve: take the wall time as written.
  return wallToString(wall);
}

// ---------------------------------------------------------------- dates

function isoDateOf(time: ICAL.Time): string {
  return `${pad(time.year, 4)}-${pad(time.month)}-${pad(time.day)}`;
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
  return date.toISOString().slice(0, 10);
}

function addMinutes(value: LocalDateTime, minutes: number): LocalDateTime {
  const [datePart, timePart] = value.split('T');
  const [y, m, d] = (datePart ?? '').split('-').map(Number);
  const [h, mi] = (timePart ?? '00:00').split(':').map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, h ?? 0, (mi ?? 0) + minutes));
  return date.toISOString().slice(0, 16);
}

// ---------------------------------------------------------------- text

const COURSE_CODE = /^[A-ZÆØÅ]{3,4}\d{3,4}$/; // NOR1206, MAT1019
const GROUP_CODE = /^\d[A-ZÆØÅ]{2,5}\d{0,2}$/; // 1TIA, 2ELA1
const SEPARATOR = /^[-–—/|:]$/;

/**
 * Visma-style summaries carry course and group codes: "NOR1206 Norsk 1TIA",
 * "Matematikk - 1TIA (MAT1019)". Returns the plain subject name ("Norsk").
 */
export function subjectNameFromSummary(summary: string): string {
  const original = summary.replace(/\s+/g, ' ').trim();
  if (!original) return '';
  const isSeparator = (t: string) => SEPARATOR.test(t);
  const tokens = original
    .replace(/[()[\]]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/,$/, ''))
    .filter((t) => t && !COURSE_CODE.test(t) && !GROUP_CODE.test(t));
  // Drop separators left dangling at the edges or doubled up by the removed codes.
  const kept = tokens.filter((t, i) => !isSeparator(t) || (i > 0 && i < tokens.length - 1 && !isSeparator(tokens[i - 1] ?? '')));
  while (kept.length && isSeparator(kept[kept.length - 1] ?? '')) kept.pop();
  const name = kept.join(' ').trim();
  return name || original;
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/\r\n?/g, '\n').trim();
  return text || undefined;
}

// ---------------------------------------------------------------- parsing

function parseCalendar(text: string): ICAL.Component {
  const clean = text.replace(/^﻿/, '').trim();
  if (!clean) throw new IcsParseError('Filen er tom.');
  if (!/BEGIN:VCALENDAR/i.test(clean)) {
    throw new IcsParseError('Dette ser ikke ut som en kalenderfil. Velg en .ics-fil fra Visma InSchool eller en annen kalender.');
  }
  let jcal: unknown;
  try {
    jcal = ICAL.parse(clean);
  } catch {
    throw new IcsParseError('Vi klarte ikke å lese kalenderfilen. Den kan være ødelagt. Prøv å eksportere den på nytt.');
  }
  // Several VCALENDARs in one file → an array of jCal arrays. Use the first.
  const first = Array.isArray(jcal) && Array.isArray(jcal[0]) ? jcal[0] : jcal;
  if (!Array.isArray(first) || first[0] !== 'vcalendar') {
    throw new IcsParseError('Vi klarte ikke å lese kalenderfilen. Den kan være ødelagt. Prøv å eksportere den på nytt.');
  }
  return new ICAL.Component(first);
}

const isCancelled = (component: ICAL.Component) =>
  String(component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED';

type OccurrenceDetails = ReturnType<ICAL.Event['getOccurrenceDetails']>;

interface Occurrence {
  start: ICAL.Time;
  end: ICAL.Time;
  item: ICAL.Event;
}

function occurrenceToEvent(
  { start, end, item }: Occurrence,
  options: IcsParseOptions,
): IcsEvent | { skip: string } {
  const component = item.component;
  const summary = cleanText(item.summary) ?? '';
  const title = subjectNameFromSummary(summary) || 'Uten tittel';
  const room = cleanText(item.location);
  const note = cleanText(item.description);

  let startLocal: LocalDateTime;
  let endLocal: LocalDateTime;
  const allDay = start.isDate;

  if (allDay) {
    const firstDay = isoDateOf(start);
    const endExclusive = end && end.isDate ? isoDateOf(end) : addDays(firstDay, 1);
    const lastDay = endExclusive > firstDay ? addDays(endExclusive, -1) : firstDay;
    startLocal = `${firstDay}T00:00`;
    endLocal = `${lastDay}T23:59`;
  } else {
    startLocal = toOsloWall(start, tzidOf(component.getFirstProperty('dtstart')));
    const endTzid = tzidOf(component.getFirstProperty('dtend')) ?? tzidOf(component.getFirstProperty('dtstart'));
    endLocal = end ? toOsloWall(end, endTzid) : startLocal;
    if (endLocal < startLocal) return { skip: 'Slutter før den starter' };
    if (endLocal === startLocal) endLocal = addMinutes(startLocal, DEFAULT_MINUTES);
  }

  const teacherId = options.matchTeacher?.([summary, note].filter(Boolean).join('\n'));
  return {
    // All-day entries (planning days, trips) are not lessons: keep them out of
    // "first class today" and trip planning.
    kind: allDay ? 'custom' : 'class',
    title,
    start: startLocal,
    end: endLocal,
    ...(allDay ? { allDay: true } : {}),
    ...(room ? { room } : {}),
    ...(note ? { note } : {}),
    ...(teacherId ? { teacherId } : {}),
    source: 'ics',
  };
}

/**
 * Parses an .ics text into calendar events (without ids) inside the import window.
 * Throws `IcsParseError` with a Norwegian message for unreadable files.
 */
export function parseIcs(text: string, options: IcsParseOptions = {}): IcsParseResult {
  const calendar = parseCalendar(text);
  const now = options.now ?? new Date();
  const today = instantToOslo(now.getTime()).slice(0, 10);
  const from = addDays(today, -7 * (options.weeksBack ?? 4));
  const to = addDays(today, 7 * (options.weeksAhead ?? 26));
  const windowStart = `${from}T00:00`;
  const windowEnd = `${addDays(to, 1)}T00:00`;

  const events: IcsEvent[] = [];
  const skipped: IcsSkipped[] = [];
  const seen = new Set<string>();
  let outsideWindow = 0;

  const vevents = calendar.getAllSubcomponents('vevent');

  // Group overrides (RECURRENCE-ID) with their master event.
  const masters = new Map<string, ICAL.Event>();
  const standalone: ICAL.Component[] = [];
  const overrides: ICAL.Component[] = [];
  for (const component of vevents) {
    if (component.hasProperty('recurrence-id')) overrides.push(component);
    else standalone.push(component);
  }

  const push = (result: IcsEvent | { skip: string }, title: string) => {
    if ('skip' in result) {
      skipped.push({ title, reason: result.skip });
      return;
    }
    if (result.end <= windowStart || result.start >= windowEnd) {
      outsideWindow += 1;
      return;
    }
    const key = `${result.title}|${result.start}|${result.end}|${result.room ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    events.push(result);
  };

  const built: Array<{ component: ICAL.Component; event: ICAL.Event | null; title: string }> = [];
  for (const component of standalone) {
    const title = cleanText(component.getFirstPropertyValue('summary')) ?? 'Uten tittel';
    let event: ICAL.Event | null = null;
    try {
      if (!component.hasProperty('dtstart')) throw new Error('no dtstart');
      event = new ICAL.Event(component);
      // Touch the start so invalid values throw here.
      if (!event.startDate) throw new Error('no start');
    } catch {
      skipped.push({ title, reason: 'Mangler gyldig starttid' });
      continue;
    }
    if (event.uid) masters.set(event.uid, event);
    built.push({ component, event, title });
  }

  for (const component of overrides) {
    const uid = cleanText(component.getFirstPropertyValue('uid'));
    const master = uid ? masters.get(uid) : undefined;
    if (master) {
      try {
        master.relateException(component);
      } catch {
        skipped.push({ title: cleanText(component.getFirstPropertyValue('summary')) ?? 'Uten tittel', reason: 'Ugyldig endring av en gjentakende time' });
      }
    } else {
      // An override without its series: import it as a single event.
      const title = cleanText(component.getFirstPropertyValue('summary')) ?? 'Uten tittel';
      try {
        built.push({ component, event: new ICAL.Event(component), title });
      } catch {
        skipped.push({ title, reason: 'Mangler gyldig starttid' });
      }
    }
  }

  for (const { component, event, title } of built) {
    if (!event) continue;
    if (isCancelled(component)) {
      skipped.push({ title, reason: 'Avlyst' });
      continue;
    }
    try {
      if (!event.isRecurring()) {
        push(occurrenceToEvent({ start: event.startDate, end: event.endDate, item: event }, options), title);
        continue;
      }
      const iterator = event.iterator();
      let next: ICAL.Time | undefined;
      let count = 0;
      while ((next = iterator.next()) && count < MAX_OCCURRENCES_PER_EVENT) {
        count += 1;
        const details: OccurrenceDetails = event.getOccurrenceDetails(next);
        if (isCancelled(details.item.component)) continue;
        const result = occurrenceToEvent(
          { start: details.startDate, end: details.endDate, item: details.item },
          options,
        );
        // Stop once the series has passed the window (overrides may move single dates).
        if (!('skip' in result) && result.start >= windowEnd && details.item === event) {
          outsideWindow += 1;
          break;
        }
        push(result, title);
      }
    } catch {
      skipped.push({ title, reason: 'Ugyldig dato eller gjentakelse' });
    }
  }

  events.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  const calendarName = cleanText(calendar.getFirstPropertyValue('x-wr-calname'));
  return {
    events,
    skipped,
    outsideWindow,
    ...(calendarName ? { calendarName } : {}),
    window: { from, to },
  };
}
