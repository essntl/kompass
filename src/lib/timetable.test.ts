import { describe, expect, it } from 'vitest';
import type { CalendarEvent, Listing, Place } from '@shared/types';
import { SEED_PLACEMENT, SEED_SCHOOL } from '@/data/seed/places';
import { buildSeedClasses } from '@/data/seed/timetable';
import {
  classesBetween,
  classesOn,
  currentClass,
  eventPlace,
  eventsOn,
  firstClassOn,
  isAbsentFrom,
  lastClassOn,
  listingDeadlineEvents,
  nextClass,
  withoutAbsentClasses,
} from './timetable';

// The seed week around Monday 16 November 2026 (classes 9 Nov – 18 Dec).
const classes = buildSeedClasses(new Date(2026, 10, 16, 7, 0));

const event = (patch: Partial<CalendarEvent> & Pick<CalendarEvent, 'start' | 'end'>): CalendarEvent => ({
  id: `e-${patch.start}-${patch.kind ?? 'custom'}`,
  kind: 'custom',
  title: 'Hendelse',
  source: 'manual',
  ...patch,
});

describe('classesOn / firstClassOn / lastClassOn', () => {
  it('returns the classes of a day in time order', () => {
    const monday = classesOn(classes, '2026-11-16');
    expect(monday.map((e) => e.start.slice(11))).toEqual(['08:15', '12:00', '13:40']);
    expect(classesOn([...classes].reverse(), '2026-11-16')).toEqual(monday);
  });

  it('accepts a Date as well as a string', () => {
    expect(classesOn(classes, new Date(2026, 10, 16, 15, 0))).toHaveLength(3);
  });

  it('finds the first and last class', () => {
    expect(firstClassOn(classes, '2026-11-17')?.start).toBe('2026-11-17T09:55');
    expect(lastClassOn(classes, '2026-11-18')?.end).toBe('2026-11-18T15:05');
    expect(firstClassOn(classes, '2026-11-19')?.title).toBe('Engelsk');
    expect(lastClassOn(classes, '2026-11-19')?.title).toBe('Yrkesfaglig fordypning');
  });

  it('returns null on days without classes', () => {
    expect(firstClassOn(classes, '2026-11-21')).toBeNull();
    expect(lastClassOn(classes, '2026-11-22')).toBeNull();
  });

  it('picks the class that ends last, not the one that starts last', () => {
    const overlapping = [
      event({ kind: 'class', start: '2026-11-16T08:00', end: '2026-11-16T15:00' }),
      event({ kind: 'class', start: '2026-11-16T10:00', end: '2026-11-16T11:00' }),
    ];
    expect(lastClassOn(overlapping, '2026-11-16')?.end).toBe('2026-11-16T15:00');
  });

  it('ignores events that are not classes', () => {
    const mixed = [...classes, event({ start: '2026-11-16T07:00', end: '2026-11-16T07:30' })];
    expect(firstClassOn(mixed, '2026-11-16')?.start).toBe('2026-11-16T08:15');
  });
});

describe('nextClass / currentClass', () => {
  it('finds the next class later the same day', () => {
    expect(nextClass(classes, new Date(2026, 10, 16, 7, 30))?.start).toBe('2026-11-16T08:15');
    expect(nextClass(classes, new Date(2026, 10, 16, 9, 0))?.start).toBe('2026-11-16T12:00');
  });

  it('does not count a class that has just started', () => {
    expect(nextClass(classes, new Date(2026, 10, 16, 8, 15, 20))?.start).toBe('2026-11-16T12:00');
  });

  it('crosses the weekend', () => {
    const fridayAfternoon = new Date(2026, 10, 20, 13, 0);
    expect(nextClass(classes, fridayAfternoon)?.start).toBe('2026-11-23T08:15');
    expect(nextClass(classes, new Date(2026, 10, 21, 12, 0))?.start).toBe('2026-11-23T08:15');
    expect(nextClass(classes, new Date(2026, 10, 22, 23, 59))?.start).toBe('2026-11-23T08:15');
  });

  it('returns null after the last class there is', () => {
    expect(nextClass(classes, new Date(2027, 0, 10, 12, 0))).toBeNull();
    expect(nextClass([], new Date())).toBeNull();
  });

  it('finds the class in progress', () => {
    expect(currentClass(classes, new Date(2026, 10, 16, 9, 0))?.title).toBe('Produksjon og tjenester');
    expect(currentClass(classes, new Date(2026, 10, 16, 8, 15))?.title).toBe('Produksjon og tjenester');
    // Lunch, and the minute a class ends.
    expect(currentClass(classes, new Date(2026, 10, 16, 11, 30))).toBeNull();
    expect(currentClass(classes, new Date(2026, 10, 16, 11, 15))).toBeNull();
  });
});

describe('eventsOn', () => {
  const absence = event({
    kind: 'absence',
    start: '2026-11-17T00:00',
    end: '2026-11-17T23:59',
    allDay: true,
  });
  const evening = event({ start: '2026-11-17T18:00', end: '2026-11-17T19:30' });
  const overnight = event({ start: '2026-11-16T22:00', end: '2026-11-17T02:00' });
  const untilMidnight = event({ start: '2026-11-16T20:00', end: '2026-11-17T00:00' });
  const all = [...classes, evening, absence, overnight, untilMidnight];

  it('returns every kind of event on the day, all-day first', () => {
    const tuesday = eventsOn(all, '2026-11-17');
    expect(tuesday[0]).toBe(absence);
    expect(tuesday.map((e) => e.start)).toEqual([
      '2026-11-17T00:00',
      '2026-11-16T22:00',
      '2026-11-17T09:55',
      '2026-11-17T12:05',
      '2026-11-17T18:00',
    ]);
  });

  it('does not spill an event that ends at midnight into the next day', () => {
    expect(eventsOn(all, '2026-11-17')).not.toContain(untilMidnight);
    expect(eventsOn(all, '2026-11-16')).toContain(untilMidnight);
  });
});

describe('classesBetween', () => {
  it('includes both days when given dates', () => {
    const week = classesBetween(classes, '2026-11-16', '2026-11-20');
    expect(week).toHaveLength(13);
    expect(week[0]?.start).toBe('2026-11-16T08:15');
    expect(week[12]?.start).toBe('2026-11-20T12:10');
  });

  it('treats exact times as a half-open range', () => {
    const from = new Date(2026, 10, 16, 12, 0);
    const to = new Date(2026, 10, 17, 9, 55);
    expect(classesBetween(classes, from, to).map((e) => e.start)).toEqual([
      '2026-11-16T12:00',
      '2026-11-16T13:40',
    ]);
  });
});

describe('eventPlace', () => {
  it('uses the event location, otherwise the school', () => {
    const school: Place = SEED_SCHOOL;
    const yff = lastClassOn(classes, '2026-11-19') as CalendarEvent;
    const english = firstClassOn(classes, '2026-11-19') as CalendarEvent;
    expect(eventPlace(yff, school)).toEqual(SEED_PLACEMENT);
    expect(eventPlace(english, school)).toBe(school);
    expect(eventPlace(english, null)).toBeNull();
  });
});

describe('absences', () => {
  const english = firstClassOn(classes, '2026-11-17') as CalendarEvent;
  const workshop = lastClassOn(classes, '2026-11-17') as CalendarEvent;

  it('knows when a lesson absence covers a class', () => {
    const absence = event({ kind: 'absence', start: english.start, end: english.end });
    expect(isAbsentFrom(english, [absence])).toBe(true);
    expect(isAbsentFrom(workshop, [absence])).toBe(false);
  });

  it('removes covered classes for a whole-day absence', () => {
    const absence = event({
      kind: 'absence',
      start: '2026-11-17T00:00',
      end: '2026-11-17T23:59',
      allDay: true,
    });
    const remaining = withoutAbsentClasses([...classes, absence]);
    expect(classesOn(remaining, '2026-11-17')).toHaveLength(0);
    expect(classesOn(remaining, '2026-11-18')).toHaveLength(3);
    expect(remaining).toContain(absence);
    expect(nextClass(remaining, new Date(2026, 10, 17, 7, 0))?.start).toBe('2026-11-18T08:15');
  });

  it('returns the same array when there are no absences', () => {
    expect(withoutAbsentClasses(classes)).toBe(classes);
  });
});

describe('listingDeadlineEvents', () => {
  const listing = (id: string, deadline: string): Listing => ({
    id,
    company: `Firma ${id}`,
    trade: 'Industrimekaniker',
    programme: 'Teknologi- og industrifag',
    title: 'Lærling',
    location: 'Oslo',
    county: 'Oslo',
    deadline,
    positions: 1,
    startDate: '2027-08-10',
    postedAt: '2026-11-01',
    summary: '',
    description: '',
    tasks: [],
    requirements: [],
    offers: [],
    contactName: '',
    contactRole: '',
    logo: { initials: 'F', color: 1 },
  });

  it('turns saved listings into all-day deadline events', () => {
    const events = listingDeadlineEvents(
      [listing('a', '2026-11-19'), listing('b', '2026-12-01')],
      ['b'],
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'deadline-b',
      kind: 'deadline',
      allDay: true,
      listingId: 'b',
      title: 'Søknadsfrist: Firma b',
      start: '2026-12-01T00:00',
      end: '2026-12-01T23:59',
    });
    expect(eventsOn(events, '2026-12-01')).toHaveLength(1);
  });
});
