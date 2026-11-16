import type { CalendarEvent } from '@shared/types';
import { describe, expect, it } from 'vitest';
import { emptyEventForm, NEW_SUBJECT, validateEventForm } from './eventForm';
import {
  absenceHref,
  agendaDays,
  eventAriaLabel,
  gridEventsOn,
  hourRangeFor,
  placeEvents,
  visibleWeekDays,
} from './layout';

let counter = 0;
function ev(start: string, end: string, extra: Partial<CalendarEvent> = {}): CalendarEvent {
  counter += 1;
  return { id: `e${counter}`, kind: 'class', title: 'Norsk', start, end, source: 'seed', ...extra };
}

describe('hourRangeFor', () => {
  it('defaults to 08–16 and widens to fit events', () => {
    expect(hourRangeFor([], ['2026-11-16'])).toEqual({ start: 8, end: 16 });
    const events = [ev('2026-11-16T07:30', '2026-11-16T08:15'), ev('2026-11-18T18:00', '2026-11-18T19:30')];
    expect(hourRangeFor(events, ['2026-11-16', '2026-11-18'])).toEqual({ start: 7, end: 20 });
  });

  it('ignores all-day events', () => {
    const events = [ev('2026-11-16T00:00', '2026-11-16T23:59', { allDay: true })];
    expect(hourRangeFor(events, ['2026-11-16'])).toEqual({ start: 8, end: 16 });
  });
});

describe('placeEvents', () => {
  it('positions events in minutes from the top of the grid', () => {
    const [placed] = placeEvents([ev('2026-11-16T08:15', '2026-11-16T09:45')], '2026-11-16', { start: 8, end: 16 });
    expect(placed).toMatchObject({ top: 15, height: 90, column: 0, columns: 1 });
  });

  it('splits overlapping events into columns', () => {
    const a = ev('2026-11-16T09:00', '2026-11-16T10:00');
    const b = ev('2026-11-16T09:30', '2026-11-16T11:00');
    const c = ev('2026-11-16T12:00', '2026-11-16T13:00');
    const placed = placeEvents([c, b, a], '2026-11-16', { start: 8, end: 16 });
    const byId = Object.fromEntries(placed.map((p) => [p.event.id, p]));
    expect(byId[a.id]).toMatchObject({ column: 0, columns: 2 });
    expect(byId[b.id]).toMatchObject({ column: 1, columns: 2 });
    expect(byId[c.id]).toMatchObject({ column: 0, columns: 1 });
  });

  it('gives very short events a minimum height', () => {
    const [placed] = placeEvents([ev('2026-11-16T10:00', '2026-11-16T10:05')], '2026-11-16', { start: 8, end: 16 });
    expect(placed?.height).toBe(20);
  });
});

describe('gridEventsOn and agendaDays', () => {
  const lesson = ev('2026-11-16T12:00', '2026-11-16T13:30');
  const absence = ev('2026-11-16T12:00', '2026-11-16T13:30', { kind: 'absence', title: 'Fravær: Norsk', source: 'absence' });
  const wholeDay = ev('2026-11-17T00:00', '2026-11-17T23:59', { kind: 'absence', allDay: true, source: 'absence' });

  it('hides per-class absence events that sit on top of the class', () => {
    expect(gridEventsOn([lesson, absence], '2026-11-16')).toEqual([lesson]);
  });

  it('groups the agenda by day and skips empty days', () => {
    const groups = agendaDays([lesson, absence, wholeDay], '2026-11-16', 14);
    expect(groups.map((g) => [g.day, g.events.map((e) => e.id)])).toEqual([
      ['2026-11-16', [lesson.id]],
      ['2026-11-17', [wholeDay.id]],
    ]);
  });
});

describe('visibleWeekDays', () => {
  it('shows Monday–Friday, and the weekend only when it has events', () => {
    expect(visibleWeekDays([], '2026-11-18')).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
    ]);
    const saturday = ev('2026-11-21T10:00', '2026-11-21T12:00');
    expect(visibleWeekDays([saturday], '2026-11-18')).toHaveLength(6);
    const sunday = ev('2026-11-22T10:00', '2026-11-22T12:00');
    expect(visibleWeekDays([sunday], '2026-11-18')).toHaveLength(7);
  });
});

describe('labels and links', () => {
  it('builds the accessible name', () => {
    const lesson = ev('2026-11-16T13:40', '2026-11-16T14:25', { room: 'B214' });
    expect(eventAriaLabel(lesson)).toBe('Norsk, 13:40 til 14:25, B214');
    expect(eventAriaLabel(lesson, { absent: true })).toBe('Norsk, 13:40 til 14:25, B214, fravær meldt');
  });

  it('links to the absence form with the date and class id', () => {
    const lesson = ev('2026-11-16T13:40', '2026-11-16T14:25', { id: 'seed-2026-11-16-1340' });
    expect(absenceHref(lesson)).toBe('/meldinger?fravaer=2026-11-16&time=seed-2026-11-16-1340');
  });
});

describe('validateEventForm', () => {
  it('requires a subject for classes and a title otherwise', () => {
    const form = emptyEventForm('2026-11-16');
    expect(validateEventForm(form)).toEqual({ subjectId: 'Velg et fag.' });
    expect(validateEventForm({ ...form, subjectId: NEW_SUBJECT })).toEqual({ newSubject: 'Skriv navnet på faget.' });
    expect(validateEventForm({ ...form, kind: 'custom' })).toEqual({ title: 'Skriv en tittel.' });
  });

  it('checks that the end is after the start and that another place is chosen', () => {
    const form = { ...emptyEventForm('2026-11-16'), subjectId: 'subj-norsk' };
    expect(validateEventForm(form)).toEqual({});
    expect(validateEventForm({ ...form, start: '10:00', end: '10:00' }).end).toBe('Sluttid må være etter starttid.');
    expect(validateEventForm({ ...form, otherPlace: true }).place).toMatch(/Velg en adresse/);
    expect(validateEventForm({ ...form, date: '' }).date).toBe('Velg en dato.');
  });
});
