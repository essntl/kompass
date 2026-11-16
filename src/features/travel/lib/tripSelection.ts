import type { ISOInstant, TripFit, TripPattern } from '@shared/types';
import { toDate, type DateInput } from '@/lib/date';
import { ARRIVAL_WINDOW } from '@/stores/settings';

/**
 * Picking the right trip out of Entur's suggestions. Pure functions, no I/O.
 *
 * All comparisons are made on whole clock minutes, because that is what the student sees:
 * a bus that arrives 08:05:40 is shown as "08:05" and counts as 10 minutes before an
 * 08:15 class. Times are the real-time adjusted ones (`TripPattern.startTime/endTime`).
 */

export interface ArrivalWindowMinutes {
  /** Arrive at least this many minutes before the target. */
  min: number;
  /** Arrive at most this many minutes before the target. */
  max: number;
}

export interface ArrivalSelection {
  pattern: TripPattern | null;
  fit: TripFit;
  /** Minutes between arrival and target. Negative = late. Undefined when there is no trip. */
  minutesEarly?: number;
  /** Norwegian, user-facing. Set when `fit` is not 'in_window'. */
  warning?: string;
}

const MINUTE_MS = 60_000;

/** The clock minute an instant falls in (seconds dropped), as minutes since the epoch. */
export function clockMinute(input: DateInput): number {
  return Math.floor(toDate(input).getTime() / MINUTE_MS);
}

/** Whole minutes from the arrival to the target, as shown on a clock. Negative = late. */
export function minutesBefore(target: DateInput, arrival: ISOInstant): number {
  return clockMinute(target) - clockMinute(arrival);
}

/** Later departure first; for the same departure the one that arrives first. */
function byLatestDeparture(a: TripPattern, b: TripPattern): number {
  return clockMinute(b.startTime) - clockMinute(a.startTime) || clockMinute(a.endTime) - clockMinute(b.endTime);
}

function plural(minutes: number): string {
  return `${minutes} min`;
}

export function arrivalWarning(fit: TripFit, minutesEarly: number | undefined): string | undefined {
  switch (fit) {
    case 'in_window':
      return undefined;
    case 'early':
      return `Du er fremme ${plural(minutesEarly ?? 0)} før timen starter. Det går ingen avgang som passer bedre.`;
    case 'tight':
      return minutesEarly === 0
        ? 'Knapt med tid: du er fremme akkurat når timen starter.'
        : `Knapt med tid: du er fremme bare ${plural(minutesEarly ?? 0)} før timen starter.`;
    case 'late':
      return `Du rekker ikke timen: du er fremme ${plural(Math.abs(minutesEarly ?? 0))} etter at den har startet. Si fra til læreren.`;
    case 'none':
      return 'Vi fant ingen reise som passer til denne timen.';
  }
}

/**
 * Chooses the trip to take to something that starts at `targetTime`.
 *
 * 1. Trips that arrive inside the window (`min`–`max` minutes before the target, both
 *    inclusive) win; of several, the one that leaves latest.
 * 2. Otherwise the trip closest to the window that is not late: `early` (more than `max`
 *    minutes before) or `tight` (fewer than `min`, down to arriving on the minute). When an
 *    early and a tight trip are equally far from the window, the early one wins.
 * 3. Otherwise every trip is late: the least late one, with fit `late`.
 * 4. No trips: `pattern: null`, fit `none`.
 */
export function selectArrivalTrip(
  patterns: TripPattern[],
  targetTime: DateInput,
  window: ArrivalWindowMinutes = ARRIVAL_WINDOW,
): ArrivalSelection {
  if (patterns.length === 0) {
    return { pattern: null, fit: 'none', warning: arrivalWarning('none', undefined) };
  }

  const options = patterns.map((pattern) => ({
    pattern,
    minutesEarly: minutesBefore(targetTime, pattern.endTime),
  }));

  const inWindow = options
    .filter((o) => o.minutesEarly >= window.min && o.minutesEarly <= window.max)
    .sort((a, b) => byLatestDeparture(a.pattern, b.pattern));
  const best = inWindow[0];
  if (best) return { pattern: best.pattern, fit: 'in_window', minutesEarly: best.minutesEarly };

  const distance = (minutesEarly: number) =>
    minutesEarly > window.max ? minutesEarly - window.max : window.min - minutesEarly;

  const onTime = options
    .filter((o) => o.minutesEarly >= 0)
    .sort(
      (a, b) =>
        distance(a.minutesEarly) - distance(b.minutesEarly) ||
        // Same distance on either side of the window: rather early than tight.
        b.minutesEarly - a.minutesEarly ||
        byLatestDeparture(a.pattern, b.pattern),
    );
  const closest = onTime[0];
  if (closest) {
    const fit: TripFit = closest.minutesEarly > window.max ? 'early' : 'tight';
    return {
      pattern: closest.pattern,
      fit,
      minutesEarly: closest.minutesEarly,
      warning: arrivalWarning(fit, closest.minutesEarly),
    };
  }

  const leastLate = options.sort(
    (a, b) => b.minutesEarly - a.minutesEarly || byLatestDeparture(a.pattern, b.pattern),
  )[0]!;
  return {
    pattern: leastLate.pattern,
    fit: 'late',
    minutesEarly: leastLate.minutesEarly,
    warning: arrivalWarning('late', leastLate.minutesEarly),
  };
}

/**
 * Chooses the trip home: the first sensible departure at or after `earliest`.
 * "Sensible" means not beaten by a trip that leaves later and still arrives earlier, which
 * comes down to: earliest arrival, and for equal arrivals the latest departure.
 */
export function selectDepartureTrip(patterns: TripPattern[], earliest?: DateInput): TripPattern | null {
  const earliestMinute = earliest === undefined ? Number.NEGATIVE_INFINITY : clockMinute(earliest);
  const candidates = patterns.filter((pattern) => clockMinute(pattern.startTime) >= earliestMinute);
  if (candidates.length === 0) return null;
  return candidates.sort(
    (a, b) =>
      clockMinute(a.endTime) - clockMinute(b.endTime) || clockMinute(b.startTime) - clockMinute(a.startTime),
  )[0]!;
}

/** Patterns in departure order (earliest first), without duplicates (by id). */
export function sortByDeparture(patterns: TripPattern[]): TripPattern[] {
  const seen = new Set<string>();
  return patterns
    .filter((pattern) => (seen.has(pattern.id) ? false : (seen.add(pattern.id), true)))
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime) || Date.parse(a.endTime) - Date.parse(b.endTime));
}
