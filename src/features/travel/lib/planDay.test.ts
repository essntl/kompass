import { describe, expect, it, vi } from 'vitest';
import type { TripsRequest } from '@shared/api';
import type { CalendarEvent, Place, TripPattern } from '@shared/types';
import { SEED_HOME, SEED_PLACEMENT, SEED_SCHOOL } from '@/data/seed/places';
import { buildSeedClasses } from '@/data/seed/timetable';
import { formatTime, parseLocal } from '@/lib/date';
import { distanceMetres, hasAnyRoute, planDay, samePlace, tripsInOrder, tripsNeeded, type FetchTrips } from './planDay';

const MIN = 60_000;

/**
 * A fake journey planner: a line that leaves every `every` minutes (at :00 + offset)
 * and takes `duration` minutes. Answers like Entur: arriveBy → the trips that arrive
 * by the time, latest first; otherwise the first trips that leave at or after it.
 */
function fakeEntur({ every = 10, offset = 0, duration = 25, count = 4, delay = 0 } = {}) {
  const calls: TripsRequest[] = [];
  const fetchTrips: FetchTrips = async (request) => {
    calls.push(request);
    const at = Date.parse(request.dateTime);
    const day = new Date(at);
    day.setHours(0, 0, 0, 0);
    const all: TripPattern[] = [];
    for (let m = offset; m < 24 * 60; m += every) {
      const aimedStart = day.getTime() + m * MIN;
      const start = new Date(aimedStart + delay * MIN).toISOString();
      const end = new Date(aimedStart + (duration + delay) * MIN).toISOString();
      all.push({
        id: `${request.from.label}>${request.to.label}@${m}`,
        startTime: start,
        endTime: end,
        duration: duration * 60,
        walkDistance: 400,
        legs: [],
      });
    }
    if (request.arriveBy) {
      return all.filter((p) => Date.parse(p.endTime) <= at).slice(-count).reverse();
    }
    return all.filter((p) => Date.parse(p.startTime) >= at).slice(0, count);
  };
  return { fetchTrips, calls };
}

const cls = (id: string, start: string, end: string, location?: Place): CalendarEvent => ({
  id,
  kind: 'class',
  title: id,
  start,
  end,
  source: 'manual',
  ...(location ? { location } : {}),
});

const DAY = '2026-11-16';
/** A Sunday evening before the day, so "now" never limits the plan. */
const BEFORE = new Date(2026, 10, 15, 20, 0);
const base = { home: SEED_HOME, school: SEED_SCHOOL, walkSpeed: 1.3, now: BEFORE };

describe('tripsNeeded', () => {
  it('plans home → school → home for a normal day', () => {
    const needs = tripsNeeded(
      [cls('a', `${DAY}T08:15`, `${DAY}T11:15`), cls('b', `${DAY}T12:00`, `${DAY}T14:25`)],
      SEED_HOME,
      SEED_SCHOOL,
    );
    expect(needs.map((n) => n.purpose)).toEqual(['to_school', 'home']);
    expect(needs[0]).toMatchObject({ targetTime: `${DAY}T08:15`, eventId: 'a', to: SEED_SCHOOL });
    expect(needs[1]).toMatchObject({ targetTime: `${DAY}T14:25`, eventId: 'b', from: SEED_SCHOOL });
  });

  it('adds a trip between classes at different places', () => {
    const needs = tripsNeeded(
      [cls('yff', `${DAY}T10:30`, `${DAY}T15:00`, SEED_PLACEMENT), cls('eng', `${DAY}T08:15`, `${DAY}T09:45`)],
      SEED_HOME,
      SEED_SCHOOL,
    );
    expect(needs.map((n) => n.purpose)).toEqual(['to_school', 'between', 'home']);
    expect(needs[1]).toMatchObject({
      from: SEED_SCHOOL,
      to: SEED_PLACEMENT,
      targetTime: `${DAY}T10:30`,
      notBefore: `${DAY}T09:45`,
      eventId: 'yff',
    });
    expect(needs[2]).toMatchObject({ from: SEED_PLACEMENT, eventId: 'yff' });
  });

  it('needs no trip to a place within walking distance of the same spot', () => {
    const nearSchool: Place = { label: 'Kabelgata 8', lat: SEED_SCHOOL.lat + 0.0005, lon: SEED_SCHOOL.lon };
    expect(samePlace(SEED_SCHOOL, nearSchool)).toBe(true);
    expect(distanceMetres(SEED_HOME, SEED_SCHOOL)).toBeGreaterThan(2000);
    const needs = tripsNeeded(
      [cls('a', `${DAY}T08:15`, `${DAY}T09:00`), cls('b', `${DAY}T09:15`, `${DAY}T10:00`, nearSchool)],
      SEED_HOME,
      SEED_SCHOOL,
    );
    expect(needs.map((n) => n.purpose)).toEqual(['to_school', 'home']);
  });

  it('returns nothing without classes', () => {
    expect(tripsNeeded([], SEED_HOME, SEED_SCHOOL)).toEqual([]);
  });
});

describe('planDay', () => {
  it('asks Entur to arrive 12 minutes before the first class and picks a trip in the window', async () => {
    const { fetchTrips, calls } = fakeEntur({ every: 10, offset: 5, duration: 25 });
    const plan = await planDay({
      ...base,
      date: DAY,
      events: [cls('a', `${DAY}T08:15`, `${DAY}T11:15`)],
      fetchTrips,
    });

    const first = calls[0]!;
    expect(first.arriveBy).toBe(true);
    expect(formatTime(first.dateTime)).toBe('08:03');
    expect(first.walkSpeed).toBe(1.3);

    // Departures :05, :15, :25 … arriving :30, :40, :50, :00 → 08:00 is 15 min early.
    expect(plan.toSchool?.fit).toBe('in_window');
    expect(formatTime(plan.toSchool!.pattern!.startTime)).toBe('07:35');
    expect(plan.toSchool?.minutesEarly).toBe(15);
    expect(plan.toSchool?.warning).toBeUndefined();
    expect(plan.toSchool?.alternatives.length).toBeGreaterThan(0);
    expect(plan.toSchool?.alternatives.some((p) => p.id === plan.toSchool?.pattern?.id)).toBe(false);
  });

  it('looks again up to the class start when nothing lands in the first answer', async () => {
    // Arrivals at :04 and :14 – 08:04 is 11 minutes before, but after the 08:03 target.
    const { fetchTrips, calls } = fakeEntur({ every: 10, offset: 9, duration: 25 });
    const plan = await planDay({ ...base, date: DAY, events: [cls('a', `${DAY}T08:15`, `${DAY}T09:00`)], fetchTrips });
    expect(calls.filter((c) => c.arriveBy).map((c) => formatTime(c.dateTime))).toContain('08:15');
    expect(plan.toSchool?.fit).toBe('in_window');
    expect(plan.toSchool?.minutesEarly).toBe(11);
  });

  it('warns when the only trips arrive too early', async () => {
    const { fetchTrips } = fakeEntur({ every: 60, offset: 25, duration: 30 }); // arrives 07:55
    const plan = await planDay({ ...base, date: DAY, events: [cls('a', `${DAY}T08:15`, `${DAY}T09:00`)], fetchTrips });
    expect(plan.toSchool?.fit).toBe('early');
    expect(plan.toSchool?.minutesEarly).toBe(20);
    expect(plan.toSchool?.warning).toBeTruthy();
  });

  it('plans the trip home from the end of the last class, leaving after it', async () => {
    const { fetchTrips, calls } = fakeEntur({ every: 10, offset: 2, duration: 20 });
    const plan = await planDay({
      ...base,
      date: DAY,
      events: [cls('a', `${DAY}T08:15`, `${DAY}T11:15`), cls('b', `${DAY}T12:00`, `${DAY}T14:25`)],
      fetchTrips,
    });
    const homeCall = calls.find((c) => !c.arriveBy)!;
    expect(formatTime(homeCall.dateTime)).toBe('14:25');
    expect(plan.home?.purpose).toBe('home');
    expect(formatTime(plan.home!.pattern!.startTime)).toBe('14:32');
    expect(plan.home?.targetTime).toBe(`${DAY}T14:25`);
    expect(plan.between).toEqual([]);
  });

  it('plans a trip between locations that leaves after the earlier class ends (seed Thursday)', async () => {
    const thursday = '2026-11-19';
    const events = buildSeedClasses(new Date(2026, 10, 16, 7, 0));
    const { fetchTrips } = fakeEntur({ every: 15, offset: 0, duration: 20 });
    const plan = await planDay({ ...base, date: thursday, events, fetchTrips });

    expect(plan.between).toHaveLength(1);
    const between = plan.between[0]!;
    expect(between.from).toEqual(SEED_SCHOOL);
    expect(between.to).toEqual(SEED_PLACEMENT);
    expect(Date.parse(between.pattern!.startTime)).toBeGreaterThanOrEqual(parseLocal(`${thursday}T09:45`).getTime());
    // 10:30 class: 10:15 → 10:35 is late, 10:00 → 10:20 is 10 min early.
    expect(between.fit).toBe('in_window');
    expect(formatTime(between.pattern!.endTime)).toBe('10:20');
    expect(plan.home?.from).toEqual(SEED_PLACEMENT);
    expect(tripsInOrder(plan).map((t) => t.purpose)).toEqual(['to_school', 'between', 'home']);
  });

  it('warns when the gap between classes is too short to make it', async () => {
    const { fetchTrips } = fakeEntur({ every: 10, offset: 0, duration: 30 });
    const plan = await planDay({
      ...base,
      date: DAY,
      events: [cls('a', `${DAY}T08:15`, `${DAY}T10:00`), cls('b', `${DAY}T10:10`, `${DAY}T12:00`, SEED_PLACEMENT)],
      fetchTrips,
    });
    const between = plan.between[0]!;
    expect(between.fit).toBe('late');
    expect(formatTime(between.pattern!.startTime)).toBe('10:00');
    expect(between.minutesEarly).toBe(-20);
    expect(between.warning).toMatch(/for kort tid mellom timene/);
  });

  it('does not suggest trips that have already left today', async () => {
    const now = new Date(2026, 10, 16, 7, 41);
    const { fetchTrips } = fakeEntur({ every: 10, offset: 5, duration: 25 });
    const plan = await planDay({ ...base, now, date: DAY, events: [cls('a', `${DAY}T08:15`, `${DAY}T09:00`)], fetchTrips });
    // 07:35 (ideal) has left; 07:45 → 08:10 is the best that is still possible.
    expect(formatTime(plan.toSchool!.pattern!.startTime)).toBe('07:45');
    expect(plan.toSchool?.fit).toBe('tight');
    for (const alt of plan.toSchool!.alternatives) {
      expect(Date.parse(alt.startTime)).toBeGreaterThanOrEqual(now.getTime() - MIN);
    }
  });

  it('uses real-time adjusted times', async () => {
    const { fetchTrips } = fakeEntur({ every: 30, offset: 5, duration: 25, delay: 4 });
    // Aimed 07:35 → 08:00 becomes 07:39 → 08:04 (11 min early).
    const plan = await planDay({ ...base, date: DAY, events: [cls('a', `${DAY}T08:15`, `${DAY}T09:00`)], fetchTrips });
    expect(plan.toSchool?.fit).toBe('in_window');
    expect(plan.toSchool?.minutesEarly).toBe(11);
  });

  it('skips classes covered by an absence, and a whole-day absence means nothing to plan', async () => {
    const { fetchTrips } = fakeEntur();
    const spy = vi.fn(fetchTrips);
    const classes = [cls('a', `${DAY}T08:15`, `${DAY}T09:00`), cls('b', `${DAY}T12:00`, `${DAY}T13:00`)];
    const lessonAbsence: CalendarEvent = {
      id: 'abs-1',
      kind: 'absence',
      title: 'Fravær: a',
      start: `${DAY}T08:15`,
      end: `${DAY}T09:00`,
      source: 'absence',
    };
    const partial = await planDay({ ...base, date: DAY, events: [...classes, lessonAbsence], fetchTrips: spy });
    expect(partial.toSchool?.targetTime).toBe(`${DAY}T12:00`);

    spy.mockClear();
    const wholeDay: CalendarEvent = { ...lessonAbsence, id: 'abs-2', allDay: true, start: `${DAY}T00:00`, end: `${DAY}T23:59` };
    const none = await planDay({ ...base, date: DAY, events: [...classes, wholeDay], fetchTrips: spy });
    expect(none).toEqual({ toSchool: null, between: [], home: null });
    expect(spy).not.toHaveBeenCalled();
  });

  it('marks trips without results and reports that the plan has no route', async () => {
    const fetchTrips: FetchTrips = async () => [];
    const plan = await planDay({ ...base, date: DAY, events: [cls('a', `${DAY}T08:15`, `${DAY}T09:00`)], fetchTrips });
    expect(plan.toSchool).toMatchObject({ pattern: null, fit: 'none' });
    expect(plan.home).toMatchObject({ pattern: null, fit: 'none' });
    expect(plan.home?.warning).toBeTruthy();
    expect(hasAnyRoute(plan)).toBe(false);
  });

  it('rejects when a lookup fails', async () => {
    const fetchTrips: FetchTrips = async () => {
      throw new Error('boom');
    };
    await expect(
      planDay({ ...base, date: DAY, events: [cls('a', `${DAY}T08:15`, `${DAY}T09:00`)], fetchTrips }),
    ).rejects.toThrow('boom');
  });
});
