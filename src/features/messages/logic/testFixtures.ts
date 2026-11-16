import type { CalendarEvent } from '@shared/types';

/** Small, hand-made timetable for the pure-logic tests. Monday 2026-11-16 is "today". */
export const TODAY = '2026-11-16';

export function cls(
  id: string,
  date: string,
  start: string,
  end: string,
  title: string,
  extra: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id,
    kind: 'class',
    title,
    start: `${date}T${start}`,
    end: `${date}T${end}`,
    source: 'seed',
    ...extra,
  };
}

export function absenceEvent(
  id: string,
  date: string,
  start = '00:00',
  end = '23:59',
  allDay = true,
): CalendarEvent {
  return {
    id,
    kind: 'absence',
    title: 'Fravær',
    start: `${date}T${start}`,
    end: `${date}T${end}`,
    allDay,
    source: 'absence',
    absenceId: `rec-${id}`,
  };
}

export const EVENTS: CalendarEvent[] = [
  cls('mon-norsk', '2026-11-16', '08:15', '09:45', 'Norsk', {
    subjectId: 'subj-norsk',
    teacherId: 't-ingrid',
  }),
  cls('mon-matte', '2026-11-16', '10:00', '11:30', 'Matematikk', {
    subjectId: 'subj-matematikk',
    teacherId: 't-amir',
  }),
  cls('tue-norsk', '2026-11-17', '09:55', '11:25', 'Norsk', {
    subjectId: 'subj-norsk',
    teacherId: 't-ingrid',
  }),
  cls('tue-gym', '2026-11-17', '12:15', '13:45', 'Kroppsøving', {
    subjectId: 'subj-kroppsoving',
    teacherId: 't-kristian',
  }),
  cls('wed-pt', '2026-11-18', '08:15', '11:30', 'Produksjon og tjenester', {
    subjectId: 'subj-pt',
    teacherId: 't-hilde',
  }),
  cls('fri-engelsk', '2026-11-20', '08:15', '09:45', 'Engelsk', {
    subjectId: 'subj-engelsk',
    teacherId: 't-ingrid',
  }),
  cls('next-mon-norsk', '2026-11-23', '08:15', '09:45', 'Norsk', {
    subjectId: 'subj-norsk',
    teacherId: 't-ingrid',
  }),
  cls('far-norsk', '2026-12-07', '08:15', '09:45', 'Norsk', {
    subjectId: 'subj-norsk',
    teacherId: 't-ingrid',
  }),
  cls('past-norsk', '2026-11-13', '08:15', '09:45', 'Norsk', {
    subjectId: 'subj-norsk',
    teacherId: 't-ingrid',
  }),
];
