import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@shared/types';
import { buildSeedClasses } from '@/data/seed/timetable';
import {
  classProgress,
  dayIsOver,
  dayOverview,
  firstName,
  greetingFor,
  nextClassState,
  travelDayFor,
} from './schedule';

// Seed week around Monday 16 November 2026: Mon 08:15, Tue 09:55, Wed 08:15, Thu 08:15, Fri 08:15.
const classes = buildSeedClasses(new Date(2026, 10, 16, 7, 0));
const at = (day: number, hours: number, minutes = 0) => new Date(2026, 10, day, hours, minutes);

const wholeDayAbsence = (date: string): CalendarEvent => ({
  id: `abs-${date}`,
  kind: 'absence',
  title: 'Fravær',
  start: `${date}T00:00`,
  end: `${date}T23:59`,
  allDay: true,
  source: 'absence',
  absenceId: 'a1',
});

describe('greetingFor', () => {
  it('follows the time of day', () => {
    expect(greetingFor(at(16, 7))).toBe('God morgen');
    expect(greetingFor(at(16, 11))).toBe('God formiddag');
    expect(greetingFor(at(16, 14))).toBe('God ettermiddag');
    expect(greetingFor(at(16, 20))).toBe('God kveld');
    expect(greetingFor(at(16, 2))).toBe('God natt');
  });

  it('takes the first name', () => {
    expect(firstName('  Sara Nilsen ')).toBe('Sara');
    expect(firstName('')).toBe('');
  });
});

describe('nextClassState', () => {
  it('returns the next class before school', () => {
    const state = nextClassState(classes, at(16, 7, 30));
    expect(state.kind).toBe('upcoming');
    expect(state.kind === 'upcoming' && state.event.start).toBe('2026-11-16T08:15');
  });

  it('returns the ongoing class and what comes after the same day', () => {
    const state = nextClassState(classes, at(16, 9));
    expect(state.kind).toBe('ongoing');
    if (state.kind !== 'ongoing') return;
    expect(state.event.start).toBe('2026-11-16T08:15');
    expect(state.next?.start).toBe('2026-11-16T12:00');
  });

  it('does not offer a class on another day as "after this"', () => {
    const state = nextClassState(classes, at(16, 14));
    expect(state.kind === 'ongoing' && state.next).toBeNull();
  });

  it('moves to the next school day after the last class', () => {
    const state = nextClassState(classes, at(16, 16));
    expect(state.kind === 'upcoming' && state.event.start).toBe('2026-11-17T09:55');
  });

  it('skips classes covered by an absence', () => {
    const state = nextClassState([...classes, wholeDayAbsence('2026-11-17')], at(16, 16));
    expect(state.kind === 'upcoming' && state.event.start).toBe('2026-11-18T08:15');
  });

  it('is none for an empty timetable', () => {
    expect(nextClassState([], at(16, 8)).kind).toBe('none');
  });
});

describe('classProgress', () => {
  it('is clamped between 0 and 1', () => {
    const lesson = classes.find((c) => c.start === '2026-11-16T08:15')!;
    expect(classProgress(lesson, at(16, 7))).toBe(0);
    expect(classProgress(lesson, at(16, 9, 45))).toBeCloseTo(0.5);
    expect(classProgress(lesson, at(16, 12))).toBe(1);
  });
});

describe('travelDayFor', () => {
  it('plans today while the first class is still ahead', () => {
    expect(travelDayFor(classes, at(16, 7))).toEqual({ date: '2026-11-16', isToday: true });
  });

  it('plans the next school day once the first class has started', () => {
    expect(travelDayFor(classes, at(16, 8, 15))).toEqual({ date: '2026-11-17', isToday: false });
  });

  it('jumps over the weekend', () => {
    expect(travelDayFor(classes, at(20, 18))).toEqual({ date: '2026-11-23', isToday: false });
    expect(travelDayFor(classes, at(21, 10))).toEqual({ date: '2026-11-23', isToday: false });
  });

  it('skips a day the student is absent', () => {
    const events = [...classes, wholeDayAbsence('2026-11-16'), wholeDayAbsence('2026-11-17')];
    expect(travelDayFor(events, at(16, 6))).toEqual({ date: '2026-11-18', isToday: false });
  });

  it('falls back to today when there is nothing ahead', () => {
    expect(travelDayFor([], at(16, 6))).toEqual({ date: '2026-11-16', isToday: true });
  });
});

describe('dayOverview', () => {
  it('marks done, ongoing and upcoming classes', () => {
    const overview = dayOverview(classes, at(16, 12, 30))!;
    expect(overview.isToday).toBe(true);
    expect(overview.classes.map((c) => c.status)).toEqual(['done', 'ongoing', 'upcoming']);
    expect(dayIsOver(overview)).toBe(false);
  });

  it('flags absent classes and counts them as over', () => {
    const events = [...classes, wholeDayAbsence('2026-11-16')];
    const overview = dayOverview(events, at(16, 7))!;
    expect(overview.classes.every((c) => c.absent)).toBe(true);
    expect(dayIsOver(overview)).toBe(true);
  });

  it('shows the next school day on a weekend', () => {
    const overview = dayOverview(classes, at(21, 10))!;
    expect(overview).toMatchObject({ date: '2026-11-23', isToday: false });
    expect(overview.classes.every((c) => c.status === 'upcoming')).toBe(true);
  });

  it('is null without classes', () => {
    expect(dayOverview([], at(16, 8))).toBeNull();
  });
});
