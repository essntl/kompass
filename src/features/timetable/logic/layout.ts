import type { CalendarEvent, ISODate, Subject } from '@shared/types';
import { addDaysISO, formatTime, toISODate, weekDays } from '@/lib/date';
import { compareEvents, eventsOn, isAbsentFrom, minutesOfDay } from '@/lib/timetable';

/**
 * Pure layout helpers for the time grid: which hours to show, where each event goes,
 * how overlapping events share a column, and what screen readers hear.
 */

export type TimetableView = 'dag' | 'uke' | 'liste';

export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 16;

export interface HourRange {
  start: number;
  end: number;
}

/** Timed events (not all-day) that start on the given day. */
export function timedEventsOn(events: CalendarEvent[], day: ISODate): CalendarEvent[] {
  return eventsOn(events, day).filter((e) => !e.allDay && e.start.slice(0, 10) === day);
}

/** All-day events that touch the given day. */
export function allDayEventsOn(events: CalendarEvent[], day: ISODate): CalendarEvent[] {
  return eventsOn(events, day).filter((e) => e.allDay);
}

/**
 * Hours to show for a set of days: 08–16 by default, widened to fit every timed event
 * (whole hours, end exclusive).
 */
export function hourRangeFor(events: CalendarEvent[], days: ISODate[]): HourRange {
  let start = DEFAULT_START_HOUR;
  let end = DEFAULT_END_HOUR;
  for (const day of days) {
    for (const event of timedEventsOn(events, day)) {
      const from = minutesOfDay(event.start);
      // Events that run past midnight are cut at the end of the day.
      const to = event.end.slice(0, 10) === day ? minutesOfDay(event.end) : 24 * 60;
      start = Math.min(start, Math.floor(from / 60));
      end = Math.max(end, Math.ceil(to / 60));
    }
  }
  return { start: Math.max(0, start), end: Math.min(24, Math.max(end, start + 1)) };
}

export interface PlacedEvent {
  event: CalendarEvent;
  /** Minutes from the top of the grid. */
  top: number;
  /** Length in minutes (at least `minMinutes`). */
  height: number;
  /** Column within its overlap cluster, and how many columns the cluster has. */
  column: number;
  columns: number;
}

/**
 * Places timed events on a day grid. Overlapping events split the width into columns
 * (greedy: each event takes the first free column of its cluster).
 */
export function placeEvents(
  events: CalendarEvent[],
  day: ISODate,
  range: HourRange,
  minMinutes = 20,
): PlacedEvent[] {
  const sorted = [...events].sort(compareEvents);
  const gridStart = range.start * 60;
  const gridEnd = range.end * 60;
  const placed: PlacedEvent[] = [];
  let cluster: PlacedEvent[] = [];
  let clusterEnd = -1;
  let columnEnds: number[] = [];

  const closeCluster = () => {
    const columns = columnEnds.length;
    for (const item of cluster) item.columns = columns;
    cluster = [];
    columnEnds = [];
  };

  for (const event of sorted) {
    const from = Math.max(minutesOfDay(event.start), gridStart);
    const rawTo = event.end.slice(0, 10) === day ? minutesOfDay(event.end) : 24 * 60;
    const to = Math.min(Math.max(rawTo, from + 1), gridEnd);
    if (from >= clusterEnd) closeCluster();
    let column = columnEnds.findIndex((endMinute) => endMinute <= from);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(to);
    } else {
      columnEnds[column] = to;
    }
    const item: PlacedEvent = {
      event,
      top: from - gridStart,
      height: Math.max(to - from, minMinutes),
      column,
      columns: 1,
    };
    cluster.push(item);
    placed.push(item);
    clusterEnd = Math.max(clusterEnd, to);
  }
  closeCluster();
  return placed;
}

/**
 * What goes on the grid for one day: timed events, without per-class absence events that
 * sit on top of a class (the class itself shows the absence).
 */
export function gridEventsOn(events: CalendarEvent[], day: ISODate): CalendarEvent[] {
  const timed = timedEventsOn(events, day);
  const classes = timed.filter((e) => e.kind === 'class');
  return timed.filter(
    (e) =>
      e.kind !== 'absence' ||
      !classes.some((c) => c.start < e.end && c.end > e.start),
  );
}

/** Days for the week view: Monday–Friday, plus Saturday/Sunday when they have events. */
export function visibleWeekDays(events: CalendarEvent[], anchor: ISODate): ISODate[] {
  const all = weekDays(anchor, 7);
  const weekend = all.slice(5).filter((day) => eventsOn(events, day).length > 0);
  // Sunday alone would leave a gap; show Saturday too when Sunday has something.
  if (weekend.length === 1 && weekend[0] === all[6]) return all;
  return [...all.slice(0, 5), ...weekend];
}

/** The days of the agenda list: `count` days from `from`, only those with events. */
export function agendaDays(
  events: CalendarEvent[],
  from: ISODate,
  count = 14,
): Array<{ day: ISODate; events: CalendarEvent[] }> {
  const result: Array<{ day: ISODate; events: CalendarEvent[] }> = [];
  for (let i = 0; i < count; i += 1) {
    const day = addDaysISO(from, i);
    const list = eventsOn(events, day).filter(
      (e) => e.allDay || e.start.slice(0, 10) === day,
    );
    const visible = list.filter(
      (e) =>
        e.kind !== 'absence' ||
        e.allDay ||
        !list.some((c) => c.kind === 'class' && c.start < e.end && c.end > e.start),
    );
    if (visible.length > 0) result.push({ day, events: visible });
  }
  return result;
}

// ---------------------------------------------------------------- labels

export const KIND_LABEL: Record<CalendarEvent['kind'], string> = {
  class: 'Time',
  custom: 'Annet',
  deadline: 'Frist',
  absence: 'Fravær',
};

/** Spoken time: "13:40 til 14:25", or "hele dagen". */
export function spokenTime(event: CalendarEvent): string {
  if (event.allDay) return 'hele dagen';
  return `${formatTime(event.start)} til ${formatTime(event.end)}`;
}

/** Accessible name for an event block: "Norsk, 13:40 til 14:25, B214". */
export function eventAriaLabel(
  event: CalendarEvent,
  opts: { subject?: Subject; absent?: boolean; withDay?: string } = {},
): string {
  const parts = [opts.subject?.name ?? event.title];
  if (opts.withDay) parts.push(opts.withDay);
  parts.push(spokenTime(event));
  if (event.room) parts.push(event.room);
  else if (event.location) parts.push(event.location.label);
  if (event.kind !== 'class') parts.push(KIND_LABEL[event.kind].toLowerCase());
  if (opts.absent) parts.push('fravær meldt');
  return parts.join(', ');
}

/** True when a class is covered by a reported absence. */
export function isAbsentClass(event: CalendarEvent, events: CalendarEvent[]): boolean {
  return event.kind === 'class' && isAbsentFrom(event, events);
}

/** Events that can be edited and deleted in the timetable. */
export function isEditable(event: CalendarEvent): boolean {
  return event.source === 'manual' || event.kind === 'custom';
}

/** "/meldinger?fravaer=2026-11-16&time=<id>" – opens the absence form for that class. */
export function absenceHref(event: CalendarEvent): string {
  const params = new URLSearchParams({ fravaer: toISODate(event.start), time: event.id });
  return `/meldinger?${params.toString()}`;
}
