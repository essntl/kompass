import { describe, expect, it } from 'vitest';
import type { TripPattern } from '@shared/types';
import { localToInstant } from '@/lib/date';
import {
  clockMinute,
  minutesBefore,
  selectArrivalTrip,
  selectDepartureTrip,
  sortByDeparture,
} from './tripSelection';

const DAY = '2026-11-16';
const CLASS_START = `${DAY}T08:15`;

/** A one-leg trip with local wall times ("07:40"); `delay` shifts the expected times. */
function trip(id: string, start: string, end: string, delayMin = 0): TripPattern {
  const shift = (time: string) =>
    new Date(Date.parse(localToInstant(`${DAY}T${time}`)) + delayMin * 60_000).toISOString();
  const aimedStart = localToInstant(`${DAY}T${start}`);
  const aimedEnd = localToInstant(`${DAY}T${end}`);
  return {
    id,
    startTime: shift(start),
    endTime: shift(end),
    duration: (Date.parse(aimedEnd) - Date.parse(aimedStart)) / 1000,
    walkDistance: 300,
    legs: [
      {
        mode: 'bus',
        fromName: 'Hjemme',
        toName: 'Skolen',
        aimedStart,
        expectedStart: shift(start),
        aimedEnd,
        expectedEnd: shift(end),
        realtime: delayMin !== 0,
        distance: 3000,
        duration: 1200,
        situations: [],
      },
    ],
  };
}

describe('selectArrivalTrip', () => {
  it('picks the trip that arrives inside the 10–15 minute window', () => {
    const result = selectArrivalTrip(
      [trip('a', '07:20', '07:50'), trip('b', '07:33', '08:03'), trip('c', '07:43', '08:11')],
      CLASS_START,
    );
    expect(result.pattern?.id).toBe('b');
    expect(result.fit).toBe('in_window');
    expect(result.minutesEarly).toBe(12);
    expect(result.warning).toBeUndefined();
  });

  it('of several trips in the window, picks the one that leaves latest', () => {
    const result = selectArrivalTrip(
      [trip('early-in', '07:30', '08:00'), trip('late-in', '07:38', '08:04'), trip('mid-in', '07:35', '08:02')],
      CLASS_START,
    );
    expect(result.pattern?.id).toBe('late-in');
    expect(result.minutesEarly).toBe(11);
  });

  it('for the same departure, prefers the one that arrives first', () => {
    const result = selectArrivalTrip([trip('slow', '07:38', '08:05'), trip('fast', '07:38', '08:01')], CLASS_START);
    expect(result.pattern?.id).toBe('fast');
  });

  it('treats 10 and 15 minutes as inside the window (inclusive bounds)', () => {
    const ten = selectArrivalTrip([trip('ten', '07:40', '08:05')], CLASS_START);
    expect(ten).toMatchObject({ fit: 'in_window', minutesEarly: 10 });
    const fifteen = selectArrivalTrip([trip('fifteen', '07:30', '08:00')], CLASS_START);
    expect(fifteen).toMatchObject({ fit: 'in_window', minutesEarly: 15 });
  });

  it('treats 9 and 16 minutes as outside the window', () => {
    expect(selectArrivalTrip([trip('nine', '07:40', '08:06')], CLASS_START).fit).toBe('tight');
    expect(selectArrivalTrip([trip('sixteen', '07:29', '07:59')], CLASS_START).fit).toBe('early');
  });

  it('counts whole clock minutes: 08:05:40 shows as 08:05 and is 10 minutes early', () => {
    const t = trip('seconds', '07:40', '08:05');
    t.endTime = new Date(Date.parse(t.endTime) + 40_000).toISOString();
    expect(selectArrivalTrip([t], CLASS_START)).toMatchObject({ fit: 'in_window', minutesEarly: 10 });
  });

  it('only early options: picks the latest-arriving early trip and warns', () => {
    const result = selectArrivalTrip([trip('a', '07:00', '07:30'), trip('b', '07:20', '07:50')], CLASS_START);
    expect(result.pattern?.id).toBe('b');
    expect(result.fit).toBe('early');
    expect(result.minutesEarly).toBe(25);
    expect(result.warning).toMatch(/25 min før/);
  });

  it('only tight options: picks the earliest-arriving one that is not late and warns', () => {
    const result = selectArrivalTrip([trip('a', '07:50', '08:08'), trip('b', '07:55', '08:13')], CLASS_START);
    expect(result.pattern?.id).toBe('a');
    expect(result.fit).toBe('tight');
    expect(result.minutesEarly).toBe(7);
    expect(result.warning).toMatch(/Knapt med tid/);
  });

  it('arriving on the minute is tight, not late', () => {
    const result = selectArrivalTrip([trip('exact', '07:50', '08:15')], CLASS_START);
    expect(result).toMatchObject({ fit: 'tight', minutesEarly: 0 });
    expect(result.warning).toMatch(/akkurat når timen starter/);
  });

  it('prefers a non-late trip over a late one even when the late one is closer to the window', () => {
    const result = selectArrivalTrip([trip('late', '08:00', '08:16'), trip('very-early', '06:40', '07:10')], CLASS_START);
    expect(result.pattern?.id).toBe('very-early');
    expect(result.fit).toBe('early');
  });

  it('picks whichever of early and tight is closer to the window', () => {
    // 18 min early is 3 from the window; 8 min early is 2 from it.
    const result = selectArrivalTrip([trip('early', '07:27', '07:57'), trip('tight', '07:45', '08:07')], CLASS_START);
    expect(result.pattern?.id).toBe('tight');
    // Equal distance (17 early = 2, 8 early = 2): rather early than tight.
    const tie = selectArrivalTrip([trip('early', '07:28', '07:58'), trip('tight', '07:45', '08:07')], CLASS_START);
    expect(tie.pattern?.id).toBe('early');
  });

  it('every option late: picks the least late and says so', () => {
    const result = selectArrivalTrip([trip('a', '08:10', '08:30'), trip('b', '08:00', '08:20')], CLASS_START);
    expect(result.pattern?.id).toBe('b');
    expect(result.fit).toBe('late');
    expect(result.minutesEarly).toBe(-5);
    expect(result.warning).toMatch(/rekker ikke/);
    expect(result.warning).toMatch(/5 min etter/);
  });

  it('no patterns: fit none without a pattern', () => {
    const result = selectArrivalTrip([], CLASS_START);
    expect(result.pattern).toBeNull();
    expect(result.fit).toBe('none');
    expect(result.minutesEarly).toBeUndefined();
    expect(result.warning).toBeTruthy();
  });

  it('uses the real-time arrival: a delay can push a trip out of the window', () => {
    // Aimed 08:03 (12 min early), delayed 6 min → 08:09 (6 min early).
    const delayed = trip('delayed', '07:33', '08:03', 6);
    const onTime = trip('on-time', '07:25', '07:58');
    const result = selectArrivalTrip([delayed, onTime], CLASS_START);
    expect(result.pattern?.id).toBe('on-time');
    expect(result.fit).toBe('early');
    // Without the alternative, the delayed trip is now only tight.
    expect(selectArrivalTrip([delayed], CLASS_START)).toMatchObject({ fit: 'tight', minutesEarly: 6 });
  });

  it('a delay can also move a trip into the window', () => {
    const delayed = trip('delayed', '07:25', '07:55', 5); // 20 → 15 min early
    expect(selectArrivalTrip([delayed], CLASS_START)).toMatchObject({ fit: 'in_window', minutesEarly: 15 });
  });

  it('respects a custom window', () => {
    const result = selectArrivalTrip([trip('a', '07:40', '08:10')], CLASS_START, { min: 3, max: 6 });
    expect(result).toMatchObject({ fit: 'in_window', minutesEarly: 5 });
  });

  it('accepts a Date as target', () => {
    const result = selectArrivalTrip([trip('a', '07:33', '08:03')], new Date(2026, 10, 16, 8, 15));
    expect(result.minutesEarly).toBe(12);
  });
});

describe('selectDepartureTrip', () => {
  it('picks the first sensible departure after the earliest time', () => {
    const patterns = [trip('gone', '14:50', '15:20'), trip('first', '15:05', '15:35'), trip('next', '15:15', '15:45')];
    expect(selectDepartureTrip(patterns, `${DAY}T15:00`)?.id).toBe('first');
  });

  it('skips a trip that is beaten by a later one arriving earlier', () => {
    const patterns = [trip('slow', '15:02', '15:50'), trip('fast', '15:08', '15:36')];
    expect(selectDepartureTrip(patterns, `${DAY}T15:00`)?.id).toBe('fast');
  });

  it('returns null when nothing leaves after the earliest time', () => {
    expect(selectDepartureTrip([trip('gone', '14:50', '15:20')], `${DAY}T15:00`)).toBeNull();
    expect(selectDepartureTrip([])).toBeNull();
  });
});

describe('helpers', () => {
  it('sortByDeparture orders by departure and drops duplicate ids', () => {
    const sorted = sortByDeparture([trip('b', '07:40', '08:00'), trip('a', '07:30', '08:00'), trip('b', '07:40', '08:00')]);
    expect(sorted.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('minutesBefore is negative when late', () => {
    expect(minutesBefore(CLASS_START, localToInstant(`${DAY}T08:20`))).toBe(-5);
    expect(clockMinute(localToInstant(`${DAY}T08:20`)) - clockMinute(`${DAY}T08:15`)).toBe(5);
  });
});
