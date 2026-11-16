import { describe, expect, it } from 'vitest';
import type { TripLeg, TripPattern } from '@shared/types';
import { localToInstant } from '@/lib/date';
import { contrastRatio, lineBadgeColors, modeColor, modeLabel } from './modes';
import { delayMinutes, formatDistance } from './format';
import { buildTimeline } from './timeline';

const DAY = '2026-11-17';
const at = (time: string) => localToInstant(`${DAY}T${time}`);

function leg(mode: TripLeg['mode'], from: string, to: string, start: string, end: string): TripLeg {
  return {
    mode,
    fromName: from,
    toName: to,
    aimedStart: at(start),
    expectedStart: at(start),
    aimedEnd: at(end),
    expectedEnd: at(end),
    realtime: false,
    distance: 300,
    duration: 240,
    situations: [],
  };
}

const pattern = (legs: TripLeg[]): TripPattern => ({
  id: 'p',
  startTime: legs[0]!.expectedStart,
  endTime: legs[legs.length - 1]!.expectedEnd,
  duration: 0,
  walkDistance: 0,
  legs,
});

describe('buildTimeline', () => {
  it('walk → bus → walk: origin, walk, stop, bus, stop, walk, destination', () => {
    const items = buildTimeline(
      pattern([
        leg('foot', 'Origin', 'Vogts gate', '07:33', '07:37'),
        leg('bus', 'Vogts gate', 'Ulven torg', '07:40', '07:50'),
        leg('foot', 'Ulven torg', 'Destination', '07:50', '07:55'),
      ]),
      { from: 'Hjemme', to: 'Kuben' },
    );
    expect(items.map((i) => i.type)).toEqual(['node', 'walk', 'wait', 'node', 'transit', 'node', 'walk', 'node']);
    expect(items[0]).toMatchObject({ name: 'Hjemme', end: 'origin' });
    expect(items[2]).toMatchObject({ type: 'wait', minutes: 3, transfer: false });
    expect(items[items.length - 1]).toMatchObject({ name: 'Kuben', end: 'destination' });
  });

  it('marks a wait between two transit legs as a transfer', () => {
    const items = buildTimeline(
      pattern([leg('metro', 'A', 'B', '07:30', '07:40'), leg('tram', 'B', 'C', '07:44', '07:50')]),
      { from: 'Hjemme', to: 'Kuben' },
    );
    expect(items.find((i) => i.type === 'wait')).toMatchObject({ minutes: 4, transfer: true });
    expect(items[0]).toMatchObject({ type: 'node', name: 'A', end: 'origin' });
    expect(items[items.length - 1]).toMatchObject({ type: 'node', name: 'C', end: 'destination' });
  });
});

describe('modes and formatting', () => {
  it('has static classes and Norwegian labels', () => {
    expect(modeColor('bus').bg).toBe('bg-mode-bus');
    expect(modeLabel('metro')).toBe('T-bane');
    expect(modeLabel('tram')).toBe('trikk');
    expect(modeLabel('water')).toBe('båt');
  });

  it('keeps operator text colours only when they are readable', () => {
    expect(lineBadgeColors('#E60000', '#FFFFFF')).toEqual({ background: '#E60000', color: '#FFFFFF' });
    // Yellow with white text is unreadable: switch to black.
    expect(lineBadgeColors('#FFD700', '#FFFFFF')).toEqual({ background: '#FFD700', color: '#000000' });
    expect(lineBadgeColors(undefined)).toBeNull();
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('formats distances and delays', () => {
    expect(formatDistance(258.19)).toBe('260 m');
    expect(formatDistance(1234)).toBe('1,2 km');
    expect(delayMinutes(at('07:40'), at('07:43'))).toBe(3);
  });
});
