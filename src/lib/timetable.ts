import { useEffect, useMemo, useState } from 'react';
import type { CalendarEvent, Listing, Place } from '@shared/types';
import { addDaysISO, atTime, toDate, toISODate, toLocalDateTime, type DateInput } from '@/lib/date';
import { useApprenticeshipStore } from '@/stores/apprenticeships';
import { useTimetableStore } from '@/stores/timetable';

/**
 * Derived timetable helpers. The functions are pure and work on any event list; the hooks
 * at the bottom read the stores. `LocalDateTime` strings sort chronologically, so the
 * comparisons below are plain string comparisons.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** All-day events first, then by start, then by end. */
export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  if (!!a.allDay !== !!b.allDay) return a.allDay ? -1 : 1;
  return a.start.localeCompare(b.start) || a.end.localeCompare(b.end);
}

const isClass = (event: CalendarEvent) => event.kind === 'class';

/** Every event that touches the given day (any kind), sorted. */
export function eventsOn(events: CalendarEvent[], date: DateInput): CalendarEvent[] {
  const day = toISODate(date);
  const dayStart = atTime(day, '00:00');
  const nextDayStart = atTime(addDaysISO(day, 1), '00:00');
  return events
    .filter((e) => e.start < nextDayStart && (e.end > dayStart || e.start >= dayStart))
    .sort(compareEvents);
}

/** The classes that start on the given day, in time order. */
export function classesOn(events: CalendarEvent[], date: DateInput): CalendarEvent[] {
  const day = toISODate(date);
  return events.filter((e) => isClass(e) && e.start.slice(0, 10) === day).sort(compareEvents);
}

export function firstClassOn(events: CalendarEvent[], date: DateInput): CalendarEvent | null {
  return classesOn(events, date)[0] ?? null;
}

/** The class that ends last on the given day. */
export function lastClassOn(events: CalendarEvent[], date: DateInput): CalendarEvent | null {
  const classes = classesOn(events, date);
  if (classes.length === 0) return null;
  return classes.reduce((latest, e) => (e.end > latest.end ? e : latest));
}

/** The first class that starts after `now` (a class in progress does not count). */
export function nextClass(events: CalendarEvent[], now: DateInput = new Date()): CalendarEvent | null {
  const nowLocal = toLocalDateTime(now);
  let next: CalendarEvent | null = null;
  for (const event of events) {
    if (!isClass(event) || event.start <= nowLocal) continue;
    if (!next || event.start < next.start) next = event;
  }
  return next;
}

/** The class in progress at `now`, if any. */
export function currentClass(events: CalendarEvent[], now: DateInput = new Date()): CalendarEvent | null {
  const nowLocal = toLocalDateTime(now);
  return (
    events
      .filter((e) => isClass(e) && e.start <= nowLocal && e.end > nowLocal)
      .sort(compareEvents)[0] ?? null
  );
}

/**
 * Classes that start in the range, in time order. Each bound is either a day
 * ("2026-11-16": from its start / through its end) or an exact time (`Date`,
 * `LocalDateTime`; `to` is exclusive then).
 */
export function classesBetween(
  events: CalendarEvent[],
  from: DateInput,
  to: DateInput,
): CalendarEvent[] {
  const isDay = (value: DateInput) => typeof value === 'string' && DATE_ONLY.test(value);
  const lower = isDay(from) ? atTime(from, '00:00') : toLocalDateTime(from);
  const upper = isDay(to) ? atTime(addDaysISO(to, 1), '00:00') : toLocalDateTime(to);
  return events
    .filter((e) => isClass(e) && e.start >= lower && e.start < upper)
    .sort(compareEvents);
}

/** Where an event takes place: its own location, otherwise the school. */
export function eventPlace(event: CalendarEvent, school: Place | null): Place | null {
  return event.location ?? school;
}

/** True when a reported absence (whole day or that lesson) covers the class. */
export function isAbsentFrom(classEvent: CalendarEvent, events: CalendarEvent[]): boolean {
  return events.some(
    (e) => e.kind === 'absence' && e.start < classEvent.end && e.end > classEvent.start,
  );
}

/** The events without the classes the student has reported absence from. */
export function withoutAbsentClasses(events: CalendarEvent[]): CalendarEvent[] {
  const absences = events.filter((e) => e.kind === 'absence');
  if (absences.length === 0) return events;
  return events.filter((e) => !isClass(e) || !isAbsentFrom(e, absences));
}

/** Minutes of the day ("08:15" → 495), for laying events out on a time grid. */
export function minutesOfDay(value: DateInput): number {
  const date = toDate(value);
  return date.getHours() * 60 + date.getMinutes();
}

/** Saved listings as all-day calendar events of kind 'deadline'. */
export function listingDeadlineEvents(listings: Listing[], savedIds: string[]): CalendarEvent[] {
  return listings
    .filter((listing) => savedIds.includes(listing.id))
    .map((listing) => ({
      id: `deadline-${listing.id}`,
      kind: 'deadline' as const,
      title: `Søknadsfrist: ${listing.company}`,
      start: atTime(listing.deadline, '00:00'),
      end: atTime(listing.deadline, '23:59'),
      allDay: true,
      note: `${listing.trade} · ${listing.location}`,
      source: 'application' as const,
      listingId: listing.id,
    }));
}

// ---------------------------------------------------------------- hooks

/** Timetable events plus the deadlines of saved listings. The array is stable between changes. */
export function useCalendarEvents(): CalendarEvent[] {
  const events = useTimetableStore((s) => s.events);
  const listings = useApprenticeshipStore((s) => s.listings);
  const savedIds = useApprenticeshipStore((s) => s.savedIds);
  return useMemo(
    () => [...events, ...listingDeadlineEvents(listings, savedIds)],
    [events, listings, savedIds],
  );
}

/** The current time, refreshed on an interval and whenever the tab becomes visible again. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}
