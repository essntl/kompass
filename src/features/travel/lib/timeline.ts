import type { TransportMode, TripLeg, TripPattern } from '@shared/types';
import { clockMinutesBetween } from './format';

/**
 * Turns a trip into the rows of the leg timeline: stop nodes and the segments between
 * them. Transit legs get a start and an end node; walking and waiting are segments
 * on a dotted rail. The origin/destination only get their own node when the trip starts
 * or ends on foot (otherwise the first/last stop is that node).
 */

/** How the rail looks on one side of a node or along a segment. */
export type Rail = { kind: 'solid'; mode: TransportMode } | { kind: 'dotted' };

export interface NodeTime {
  aimed: string;
  expected: string;
  realtime: boolean;
}

export type TimelineItem =
  | {
      type: 'node';
      key: string;
      name: string;
      platform?: string;
      time: NodeTime;
      /** Origin and destination are drawn filled; stops are rings. */
      end: 'origin' | 'destination' | null;
      above?: Rail;
      below?: Rail;
    }
  | { type: 'transit'; key: string; leg: TripLeg; rail: Rail }
  | { type: 'walk'; key: string; leg: TripLeg; rail: Rail; isLast: boolean }
  | { type: 'wait'; key: string; minutes: number; transfer: boolean; rail: Rail };

const DOTTED: Rail = { kind: 'dotted' };
const isTransit = (leg: TripLeg) => leg.mode !== 'foot' && leg.mode !== 'bicycle';

export function buildTimeline(
  pattern: TripPattern,
  names: { from: string; to: string },
): TimelineItem[] {
  const items: TimelineItem[] = [];
  const legs = pattern.legs;
  if (legs.length === 0) return items;

  const first = legs[0]!;
  const last = legs[legs.length - 1]!;

  if (!isTransit(first)) {
    items.push({
      type: 'node',
      key: 'origin',
      name: names.from,
      time: { aimed: first.aimedStart, expected: first.expectedStart, realtime: false },
      end: 'origin',
      below: DOTTED,
    });
  }

  legs.forEach((leg, index) => {
    const previous = legs[index - 1];
    if (previous) {
      const wait = clockMinutesBetween(previous.expectedEnd, leg.expectedStart);
      if (wait >= 1) {
        items.push({
          type: 'wait',
          key: `wait-${index}`,
          minutes: wait,
          transfer: isTransit(previous) && isTransit(leg),
          rail: DOTTED,
        });
      }
    }

    if (isTransit(leg)) {
      const rail: Rail = { kind: 'solid', mode: leg.mode };
      items.push({
        type: 'node',
        key: `from-${index}`,
        name: leg.fromName,
        ...(leg.fromPlatform ? { platform: leg.fromPlatform } : {}),
        time: { aimed: leg.aimedStart, expected: leg.expectedStart, realtime: leg.realtime },
        end: index === 0 ? 'origin' : null,
        ...(index > 0 ? { above: DOTTED } : {}),
        below: rail,
      });
      items.push({ type: 'transit', key: `leg-${index}`, leg, rail });
      const isLastLeg = index === legs.length - 1;
      items.push({
        type: 'node',
        key: `to-${index}`,
        name: leg.toName,
        ...(leg.toPlatform ? { platform: leg.toPlatform } : {}),
        time: { aimed: leg.aimedEnd, expected: leg.expectedEnd, realtime: leg.realtime },
        end: isLastLeg ? 'destination' : null,
        above: rail,
        ...(isLastLeg ? {} : { below: DOTTED }),
      });
    } else {
      items.push({ type: 'walk', key: `leg-${index}`, leg, rail: DOTTED, isLast: index === legs.length - 1 });
    }
  });

  if (!isTransit(last)) {
    items.push({
      type: 'node',
      key: 'destination',
      name: names.to,
      time: { aimed: last.aimedEnd, expected: last.expectedEnd, realtime: false },
      end: 'destination',
      above: DOTTED,
    });
  }

  return items;
}
