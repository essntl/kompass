import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  atTime,
  daysUntil,
  formatCountdown,
  formatDate,
  formatDayLong,
  formatDayShort,
  formatDaysUntil,
  formatDuration,
  formatTime,
  formatTimeRange,
  formatTimestamp,
  isoWeek,
  isSameDay,
  isWeekend,
  localToInstant,
  minutesBetween,
  parseLocal,
  relativeDay,
  startOfWeekISO,
  toDate,
  toISODate,
  toLocalDateTime,
  weekDays,
} from './date';

// Monday 16 November 2026, 10:00 local time.
const NOW = new Date(2026, 10, 16, 10, 0);

describe('parsing and conversion', () => {
  it('parses a date-only string as local midnight', () => {
    const date = parseLocal('2026-11-16');
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 10, 16]);
    expect([date.getHours(), date.getMinutes()]).toEqual([0, 0]);
  });

  it('parses a LocalDateTime as local wall time', () => {
    const date = parseLocal('2026-11-16T08:15');
    expect(date.getTime()).toBe(new Date(2026, 10, 16, 8, 15).getTime());
    expect(parseLocal('2026-11-16T08:15:30').getSeconds()).toBe(30);
  });

  it('returns an invalid date for anything else', () => {
    expect(Number.isNaN(parseLocal('16.11.2026').getTime())).toBe(true);
  });

  it('round-trips through the string shapes', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toLocalDateTime(new Date(2026, 0, 5, 7, 5))).toBe('2026-01-05T07:05');
    expect(toLocalDateTime(parseLocal('2026-11-16T08:15'))).toBe('2026-11-16T08:15');
    expect(toISODate('2026-11-16T08:15')).toBe('2026-11-16');
    expect(atTime('2026-11-16', '08:15')).toBe('2026-11-16T08:15');
  });

  it('treats strings with an offset as instants', () => {
    const instant = new Date(2026, 10, 16, 8, 15).toISOString();
    expect(toDate(instant).getTime()).toBe(new Date(2026, 10, 16, 8, 15).getTime());
    expect(localToInstant('2026-11-16T08:15')).toBe(instant);
  });
});

describe('arithmetic', () => {
  it('counts minutes and days', () => {
    expect(minutesBetween('2026-11-16T08:15', '2026-11-16T09:45')).toBe(90);
    expect(minutesBetween('2026-11-16T09:45', '2026-11-16T08:15')).toBe(-90);
    expect(daysUntil('2026-11-19', NOW)).toBe(3);
    // Calendar days, not 24-hour periods.
    expect(daysUntil('2026-11-17T00:05', new Date(2026, 10, 16, 23, 55))).toBe(1);
  });

  it('adds days across month ends and the switch from summer time', () => {
    expect(addDaysISO('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysISO('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDaysISO('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('starts the week on Monday', () => {
    expect(startOfWeekISO('2026-11-16')).toBe('2026-11-16'); // Monday
    expect(startOfWeekISO('2026-11-18')).toBe('2026-11-16'); // Wednesday
    expect(startOfWeekISO('2026-11-22')).toBe('2026-11-16'); // Sunday
    expect(startOfWeekISO('2026-11-23')).toBe('2026-11-23');
  });

  it('lists the days of a week, also across New Year', () => {
    expect(weekDays('2026-11-22')).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ]);
    expect(weekDays('2026-11-18', 5)).toHaveLength(5);
    const newYear = weekDays('2026-12-31');
    expect(newYear[0]).toBe('2026-12-28');
    expect(newYear[6]).toBe('2027-01-03');
  });

  it('uses ISO week numbers', () => {
    expect(isoWeek('2026-11-16')).toBe(47);
    expect(isoWeek('2027-01-03')).toBe(53);
    expect(isoWeek('2027-01-04')).toBe(1);
  });

  it('compares days', () => {
    expect(isSameDay('2026-11-16T08:15', '2026-11-16')).toBe(true);
    expect(isSameDay('2026-11-16T23:59', '2026-11-17T00:00')).toBe(false);
    expect(isWeekend('2026-11-21')).toBe(true);
    expect(isWeekend('2026-11-20')).toBe(false);
  });
});

describe('formatting (nb)', () => {
  it('formats times and days', () => {
    expect(formatTime('2026-11-16T08:15')).toBe('08:15');
    expect(formatTimeRange('2026-11-16T08:15', '2026-11-16T09:45')).toBe('08:15–09:45');
    expect(formatDayLong('2026-11-16')).toBe('mandag 16. november');
    expect(formatDayShort('2026-11-20')).toBe('fre. 20. nov.');
    expect(formatDayShort('2026-05-03')).toBe('søn. 3. mai');
    expect(formatDate('2026-11-16')).toBe('16. november 2026');
  });

  it('describes a day relative to today', () => {
    expect(relativeDay('2026-11-16', NOW)).toBe('i dag');
    expect(relativeDay('2026-11-16T23:30', NOW)).toBe('i dag');
    expect(relativeDay('2026-11-17', NOW)).toBe('i morgen');
    expect(relativeDay('2026-11-15', NOW)).toBe('i går');
    expect(relativeDay('2026-11-20', NOW)).toBe('på fredag');
    expect(relativeDay('2026-11-22', NOW)).toBe('på søndag');
    expect(relativeDay('2026-11-23', NOW)).toBe('man. 23. nov.');
    expect(relativeDay('2026-11-14', NOW)).toBe('lør. 14. nov.');
  });

  it('uses calendar days around midnight', () => {
    const lateEvening = new Date(2026, 10, 16, 23, 59);
    expect(relativeDay('2026-11-17T00:01', lateEvening)).toBe('i morgen');
    expect(relativeDay(new Date(2026, 10, 16, 0, 1), lateEvening)).toBe('i dag');
  });

  it('counts down days for deadlines', () => {
    expect(formatDaysUntil('2026-11-16', NOW)).toBe('i dag');
    expect(formatDaysUntil('2026-11-17', NOW)).toBe('i morgen');
    expect(formatDaysUntil('2026-11-19', NOW)).toBe('om 3 dager');
    expect(formatDaysUntil('2026-11-15', NOW)).toBe('i går');
    expect(formatDaysUntil('2026-11-13', NOW)).toBe('for 3 dager siden');
  });

  it('formats countdowns', () => {
    const min = 60_000;
    expect(formatCountdown(12 * min)).toBe('om 12 min');
    expect(formatCountdown(65 * min)).toBe('om 1 t 5 min');
    expect(formatCountdown(120 * min)).toBe('om 2 t');
    expect(formatCountdown(20_000)).toBe('nå');
    expect(formatCountdown(-5 * min)).toBe('nå');
    expect(formatCountdown(24 * 60 * min)).toBe('om 1 dag');
    expect(formatCountdown(49 * 60 * min)).toBe('om 2 dager');
  });

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(90)).toBe('1 t 30 min');
    expect(formatDuration(180)).toBe('3 t');
  });

  it('formats message timestamps', () => {
    expect(formatTimestamp(new Date(2026, 10, 16, 9, 13), NOW)).toBe('09:13');
    expect(formatTimestamp(new Date(2026, 10, 15, 14, 32), NOW)).toBe('i går 14:32');
    expect(formatTimestamp(new Date(2026, 10, 12, 14, 32), NOW)).toBe('tor. 14:32');
    expect(formatTimestamp(new Date(2026, 10, 2, 14, 32), NOW)).toBe('2. nov.');
    expect(formatTimestamp(new Date(2025, 11, 2, 14, 32), NOW)).toBe('2. des. 2025');
  });
});
