import { describe, expect, it } from 'vitest';
import type { TripLeg, TripPattern } from '@shared/types';
import { delayHint, hasRealtime, tripSummary } from './trip';

// Local wall times → instants, so the expectations do not depend on the test machine's zone.
const t = (time: string) => new Date(`2026-11-16T${time}:00`).toISOString();

const leg = (patch: Partial<TripLeg>): TripLeg => ({
  mode: 'foot',
  fromName: 'Hjem',
  toName: 'Torshov',
  aimedStart: t('07:41'),
  expectedStart: t('07:41'),
  aimedEnd: t('07:45'),
  expectedEnd: t('07:45'),
  realtime: false,
  distance: 300,
  duration: 240,
  situations: [],
  ...patch,
});

const pattern = (legs: TripLeg[], end = '08:03'): TripPattern => ({
  id: 'p',
  startTime: legs[0]!.expectedStart,
  endTime: t(end),
  duration: 22 * 60,
  walkDistance: 500,
  legs,
});

const bus = leg({
  mode: 'bus',
  fromName: 'Torshov',
  toName: 'Kuben',
  aimedStart: t('07:46'),
  expectedStart: t('07:46'),
  realtime: true,
  duration: 900,
  line: { publicCode: '20' },
});

describe('tripSummary', () => {
  it('describes the first walk, each transit leg and the arrival', () => {
    expect(tripSummary(pattern([leg({}), bus, leg({ fromName: 'Kuben', duration: 120 })]))).toBe(
      'Gå 4 min · Buss 20 fra Torshov 07:46 · fremme 08:03',
    );
  });

  it('handles changes and lines without a number', () => {
    const train = leg({ mode: 'rail', fromName: 'Oslo S', expectedStart: t('07:55'), aimedStart: t('07:55') });
    expect(tripSummary(pattern([bus, train], '08:10'))).toBe(
      'Buss 20 fra Torshov 07:46 · Tog fra Oslo S 07:55 · fremme 08:10',
    );
  });

  it('describes a walk-only trip', () => {
    expect(tripSummary({ ...pattern([leg({})], '07:59'), duration: 18 * 60 })).toBe(
      'Gå 18 min · fremme 07:59',
    );
  });
});

describe('delayHint', () => {
  it('mentions a noticeably late real-time leg', () => {
    const late = { ...bus, expectedStart: t('07:50') };
    expect(delayHint(pattern([leg({}), late]))).toBe('Buss 20 er 4 min forsinket');
  });

  it('ignores small delays and legs without real-time data', () => {
    expect(delayHint(pattern([{ ...bus, expectedStart: t('07:47') }]))).toBeNull();
    expect(delayHint(pattern([{ ...bus, realtime: false, expectedStart: t('07:55') }]))).toBeNull();
  });

  it('knows whether a trip has real-time data', () => {
    expect(hasRealtime(pattern([leg({}), bus]))).toBe(true);
    expect(hasRealtime(pattern([leg({ realtime: true })]))).toBe(false);
  });
});
