import type { TransportMode, TripLeg, TripPattern } from '@shared/types';
import { clockMinute } from './tripSelection';

/** "450 m", "1,2 km". */
export function formatDistance(metres: number): string {
  const m = Math.max(0, Math.round(metres));
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Whole clock minutes from `from` to `to` (negative when `to` is earlier). */
export function clockMinutesBetween(from: string, to: string): number {
  return clockMinute(to) - clockMinute(from);
}

/** Minutes the expected time is after the aimed one (negative = ahead of schedule). */
export function delayMinutes(aimed: string, expected: string): number {
  return clockMinutesBetween(aimed, expected);
}

/** "+3 min", "−2 min". */
export function formatDelay(minutes: number): string {
  return minutes > 0 ? `+${minutes} min` : `−${Math.abs(minutes)} min`;
}

/** Trip length in whole clock minutes, as the student reads it off the times. */
export function tripMinutes(pattern: TripPattern): number {
  return Math.max(0, clockMinutesBetween(pattern.startTime, pattern.endTime));
}

/** The transit legs of a trip (no walking). */
export function transitLegs(pattern: TripPattern): TripLeg[] {
  return pattern.legs.filter((leg) => leg.mode !== 'foot' && leg.mode !== 'bicycle');
}

/** Distinct modes in travel order, for compact summaries. Walking only when it is all there is. */
export function tripModes(pattern: TripPattern): TransportMode[] {
  const transit = transitLegs(pattern).map((leg) => leg.mode);
  return transit.length > 0 ? transit : ['foot'];
}

/** "3 stopp", "1 stopp", "Ingen stopp underveis". */
export function formatStops(count: number): string {
  if (count <= 0) return 'Ingen stopp underveis';
  return `${count} stopp`;
}

/** "12 min før", "på minuttet", "5 min for sent". */
export function formatMinutesEarly(minutes: number): string {
  if (minutes > 0) return `${minutes} min før`;
  if (minutes === 0) return 'på minuttet';
  return `${Math.abs(minutes)} min for sent`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
