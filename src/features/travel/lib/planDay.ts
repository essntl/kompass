import type { TripsRequest } from '@shared/api';
import type {
  CalendarEvent,
  ISODate,
  LocalDateTime,
  Place,
  PlannedTrip,
  TripPattern,
  TripPurpose,
} from '@shared/types';
import { parseLocal, toISODate } from '@/lib/date';
import { classesOn, eventPlace, withoutAbsentClasses } from '@/lib/timetable';
import { ARRIVAL_WINDOW } from '@/stores/settings';
import {
  clockMinute,
  selectArrivalTrip,
  selectDepartureTrip,
  sortByDeparture,
  type ArrivalWindowMinutes,
} from './tripSelection';

/**
 * Works out which trips a school day needs and plans each of them:
 *
 *  - home → the place of the first class (arrive 10–15 minutes before it starts),
 *  - between consecutive classes that are at different places,
 *  - the place of the last class → home.
 *
 * The Entur lookup is injected (`fetchTrips`), so everything here can be tested without
 * a network.
 */

export type FetchTrips = (request: TripsRequest) => Promise<TripPattern[]>;

export interface TripNeed {
  purpose: TripPurpose;
  from: Place;
  to: Place;
  /** to_school/between: when the class starts. home: when the last class ends. */
  targetTime: LocalDateTime;
  /** between: the end of the class before; the student cannot leave earlier. */
  notBefore?: LocalDateTime;
  eventId?: string;
}

export interface DayPlanResult {
  toSchool: PlannedTrip | null;
  between: PlannedTrip[];
  home: PlannedTrip | null;
}

export interface PlanDayInput {
  date: ISODate;
  /** The timetable (any days, any kinds). Classes covered by an absence are left out. */
  events: CalendarEvent[];
  home: Place;
  school: Place;
  /** Metres per second. */
  walkSpeed: number;
  fetchTrips: FetchTrips;
  /** Defaults to the current time. Trips that have already left are not suggested. */
  now?: Date;
  window?: ArrivalWindowMinutes & { target: number };
  /** How many suggestions to ask Entur for per lookup. */
  numTripPatterns?: number;
}

/** Places closer than this are treated as the same place (no trip needed). */
const SAME_PLACE_METRES = 150;
/** "Leave now" is only suggested when the class is this close. */
const LEAVE_NOW_HORIZON_MIN = 180;
/** After the last class, the trip home is planned from "now" for this long. */
const HOME_FROM_NOW_MIN = 180;
const MAX_ALTERNATIVES = 5;
const MINUTE_MS = 60_000;

/** Great-circle distance in metres. */
export function distanceMetres(a: Place, b: Place): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function samePlace(a: Place, b: Place): boolean {
  return distanceMetres(a, b) <= SAME_PLACE_METRES;
}

/** The classes the student actually attends on the day, in time order. */
export function attendedClassesOn(events: CalendarEvent[], date: ISODate): CalendarEvent[] {
  return classesOn(withoutAbsentClasses(events), date);
}

/** The trips a day needs, in time order. `classes` are the attended classes of one day. */
export function tripsNeeded(classes: CalendarEvent[], home: Place, school: Place): TripNeed[] {
  if (classes.length === 0) return [];
  const sorted = [...classes].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  const placeOf = (event: CalendarEvent) => eventPlace(event, school) ?? school;
  const needs: TripNeed[] = [];

  const first = sorted[0]!;
  if (!samePlace(home, placeOf(first))) {
    needs.push({
      purpose: 'to_school',
      from: home,
      to: placeOf(first),
      targetTime: first.start,
      eventId: first.id,
    });
  }

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1]!;
    const next = sorted[i]!;
    if (samePlace(placeOf(previous), placeOf(next))) continue;
    needs.push({
      purpose: 'between',
      from: placeOf(previous),
      to: placeOf(next),
      targetTime: next.start,
      notBefore: previous.end,
      eventId: next.id,
    });
  }

  const last = sorted.reduce((latest, event) => (event.end > latest.end ? event : latest));
  if (!samePlace(placeOf(last), home)) {
    needs.push({
      purpose: 'home',
      from: placeOf(last),
      to: home,
      targetTime: last.end,
      eventId: last.id,
    });
  }
  return needs;
}

interface PlanContext {
  date: ISODate;
  walkSpeed: number;
  fetchTrips: FetchTrips;
  now: Date;
  window: ArrivalWindowMinutes & { target: number };
  numTripPatterns: number;
}

function request(need: TripNeed, ctx: PlanContext, dateTime: Date, arriveBy: boolean): TripsRequest {
  return {
    from: need.from,
    to: need.to,
    dateTime: dateTime.toISOString(),
    arriveBy,
    walkSpeed: ctx.walkSpeed,
    numTripPatterns: ctx.numTripPatterns,
  };
}

function alternativesTo(chosen: TripPattern | null, pool: TripPattern[]): TripPattern[] {
  const others = sortByDeparture(pool).filter((pattern) => pattern.id !== chosen?.id);
  if (!chosen || others.length <= MAX_ALTERNATIVES) return others;
  // Keep the ones that leave closest to the chosen trip.
  const chosenStart = Date.parse(chosen.startTime);
  const nearest = [...others]
    .sort((a, b) => Math.abs(Date.parse(a.startTime) - chosenStart) - Math.abs(Date.parse(b.startTime) - chosenStart))
    .slice(0, MAX_ALTERNATIVES);
  return sortByDeparture(nearest);
}

/**
 * The earliest moment the student can leave for an arrival trip, or null when there is
 * no such limit (a class on a later day, or one that has already started).
 */
function earliestDeparture(need: TripNeed, ctx: PlanContext): Date | null {
  const target = parseLocal(need.targetTime);
  const classEnd = need.notBefore ? parseLocal(need.notBefore) : null;
  const minutesToTarget = (target.getTime() - ctx.now.getTime()) / MINUTE_MS;
  const leaveNow = minutesToTarget > 0 && minutesToTarget <= LEAVE_NOW_HORIZON_MIN ? ctx.now : null;
  if (classEnd && leaveNow) return classEnd > leaveNow ? classEnd : leaveNow;
  return classEnd ?? leaveNow;
}

/** to_school and between: arrive inside the window before the class starts. */
async function planArrival(need: TripNeed, ctx: PlanContext): Promise<PlannedTrip> {
  const target = parseLocal(need.targetTime);
  const earliest = earliestDeparture(need, ctx);
  const usable = (patterns: TripPattern[]) =>
    earliest ? patterns.filter((p) => clockMinute(p.startTime) >= clockMinute(earliest)) : patterns;

  // 1. Ask for trips that arrive by the middle of the window (12 minutes before).
  const aimFor = new Date(target.getTime() - ctx.window.target * MINUTE_MS);
  let pool = await ctx.fetchTrips(request(need, ctx, aimFor, true));
  let selection = selectArrivalTrip(usable(pool), need.targetTime, ctx.window);

  // 2. Nothing inside the window: also look at trips that arrive right up to the start.
  //    This finds arrivals 10–11 minutes before, and tight ones.
  if (selection.fit !== 'in_window') {
    pool = sortByDeparture([...pool, ...(await ctx.fetchTrips(request(need, ctx, target, true)))]);
    selection = selectArrivalTrip(usable(pool), need.targetTime, ctx.window);
  }

  // 3. Still nothing the student can catch: the first departures from when they can leave.
  if (selection.fit === 'none' && earliest) {
    pool = sortByDeparture([...pool, ...(await ctx.fetchTrips(request(need, ctx, earliest, false)))]);
    selection = selectArrivalTrip(usable(pool), need.targetTime, ctx.window);
  }

  return {
    purpose: need.purpose,
    from: need.from,
    to: need.to,
    targetTime: need.targetTime,
    eventId: need.eventId,
    pattern: selection.pattern,
    alternatives: alternativesTo(selection.pattern, usable(pool)),
    fit: selection.fit,
    minutesEarly: selection.minutesEarly,
    warning: need.purpose === 'between' ? betweenWarning(selection) : selection.warning,
  };
}

/** Between two classes the student cannot leave early, so the wording is about the gap. */
function betweenWarning(selection: ReturnType<typeof selectArrivalTrip>): string | undefined {
  const minutes = selection.minutesEarly ?? 0;
  switch (selection.fit) {
    case 'late':
      return `Det er for kort tid mellom timene: du er fremme ${Math.abs(minutes)} min etter at neste time har startet. Si fra til læreren.`;
    case 'none':
      return 'Vi fant ingen reise mellom timene. Sjekk om du kan gå, eller si fra til læreren.';
    default:
      return selection.warning;
  }
}

/** home: leave when the last class ends (or now, shortly after it has ended today). */
async function planHome(need: TripNeed, ctx: PlanContext): Promise<PlannedTrip> {
  const classEnd = parseLocal(need.targetTime);
  const minutesSinceEnd = (ctx.now.getTime() - classEnd.getTime()) / MINUTE_MS;
  const fromNow =
    toISODate(ctx.now) === ctx.date && minutesSinceEnd > 0 && minutesSinceEnd <= HOME_FROM_NOW_MIN;
  const departAt = fromNow ? ctx.now : classEnd;

  const pool = sortByDeparture(await ctx.fetchTrips(request(need, ctx, departAt, false)));
  const pattern = selectDepartureTrip(pool, departAt);
  return {
    purpose: 'home',
    from: need.from,
    to: need.to,
    targetTime: need.targetTime,
    eventId: need.eventId,
    pattern,
    alternatives: alternativesTo(pattern, pool),
    fit: pattern ? 'in_window' : 'none',
    ...(pattern ? {} : { warning: 'Vi fant ingen reise hjem etter siste time.' }),
  };
}

/** Plans every trip of the day. Rejects when a lookup fails; no classes → all empty. */
export async function planDay(input: PlanDayInput): Promise<DayPlanResult> {
  const classes = attendedClassesOn(input.events, input.date);
  const needs = tripsNeeded(classes, input.home, input.school);
  const ctx: PlanContext = {
    date: input.date,
    walkSpeed: input.walkSpeed,
    fetchTrips: input.fetchTrips,
    now: input.now ?? new Date(),
    window: input.window ?? ARRIVAL_WINDOW,
    numTripPatterns: input.numTripPatterns ?? 6,
  };

  const trips = await Promise.all(
    needs.map((need) => (need.purpose === 'home' ? planHome(need, ctx) : planArrival(need, ctx))),
  );

  return {
    toSchool: trips.find((trip) => trip.purpose === 'to_school') ?? null,
    between: trips.filter((trip) => trip.purpose === 'between'),
    home: trips.find((trip) => trip.purpose === 'home') ?? null,
  };
}

/** True when the plan holds at least one trip with a route. */
export function hasAnyRoute(plan: DayPlanResult): boolean {
  return [plan.toSchool, ...plan.between, plan.home].some((trip) => trip?.pattern);
}

/** The planned trips of a day in time order. */
export function tripsInOrder(plan: Pick<DayPlanResult, 'toSchool' | 'between' | 'home'>): PlannedTrip[] {
  return [plan.toSchool, ...plan.between, plan.home].filter((trip): trip is PlannedTrip => trip !== null);
}
