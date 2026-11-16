import type { TransportMode, TripLeg, TripPattern } from '@shared/types';
import { formatTime } from '@/lib/date';

/** Norwegian names for the transport modes, as used in running text ("Buss 20"). */
export const MODE_LABELS: Record<TransportMode, string> = {
  foot: 'Gå',
  bus: 'Buss',
  tram: 'Trikk',
  metro: 'T-bane',
  rail: 'Tog',
  water: 'Båt',
  coach: 'Ekspressbuss',
  bicycle: 'Sykkel',
  other: 'Reise',
};

/** Delays shorter than this are not worth mentioning. */
export const DELAY_THRESHOLD_MIN = 2;

const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));

export const isTransit = (leg: TripLeg) => leg.mode !== 'foot' && leg.mode !== 'bicycle';

/** "Buss 20", "T-bane 5", or just "Tog" without a line number. */
export function lineLabel(leg: TripLeg): string {
  const code = leg.line?.publicCode?.trim();
  return code ? `${MODE_LABELS[leg.mode]} ${code}` : MODE_LABELS[leg.mode];
}

/**
 * One line for the dashboard: "Gå 4 min · Buss 20 fra Torshov 07:46 · fremme 08:03".
 * Only the walk at the start is mentioned; walks between and after legs are implied.
 */
export function tripSummary(pattern: TripPattern): string {
  const parts: string[] = [];
  const [first] = pattern.legs;
  const transit = pattern.legs.filter(isTransit);

  if (transit.length === 0) {
    const mode = first?.mode === 'bicycle' ? 'Sykkel' : 'Gå';
    parts.push(`${mode} ${minutes(pattern.duration)} min`);
  } else {
    if (first && !isTransit(first)) parts.push(`${MODE_LABELS[first.mode]} ${minutes(first.duration)} min`);
    for (const leg of transit) {
      parts.push(`${lineLabel(leg)} fra ${leg.fromName} ${formatTime(leg.expectedStart)}`);
    }
  }
  parts.push(`fremme ${formatTime(pattern.endTime)}`);
  return parts.join(' · ');
}

/** Minutes a leg leaves later than planned (negative = earlier). */
export function legDelayMinutes(leg: TripLeg): number {
  return Math.round((Date.parse(leg.expectedStart) - Date.parse(leg.aimedStart)) / 60_000);
}

/** "Buss 20 er 4 min forsinket" for the first real-time leg that is noticeably late. */
export function delayHint(pattern: TripPattern): string | null {
  const late = pattern.legs.find(
    (leg) => isTransit(leg) && leg.realtime && legDelayMinutes(leg) >= DELAY_THRESHOLD_MIN,
  );
  if (!late) return null;
  return `${lineLabel(late)} er ${legDelayMinutes(late)} min forsinket`;
}

/** True when any transit leg has real-time data. */
export function hasRealtime(pattern: TripPattern): boolean {
  return pattern.legs.some((leg) => isTransit(leg) && leg.realtime);
}
