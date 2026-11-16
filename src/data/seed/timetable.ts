import type { CalendarEvent, ISODate, Place } from '@shared/types';
import { addDaysISO, atTime, startOfWeekISO } from '@/lib/date';
import { SEED_PLACEMENT } from './places';
import { SEED_SUBJECTS, SUBJECT_IDS } from './subjects';
import { TEACHER_IDS } from './teachers';

/** The seeded timetable runs from this many weeks before the current week … */
export const SEED_WEEKS_BEFORE = 1;
/** … through this many weeks after it, so week navigation always has data. */
export const SEED_WEEKS_AHEAD = 4;

/** Fictional company where the student has YFF every Thursday. */
export const SEED_PLACEMENT_NAME = 'Tellverk Mekaniske';

interface WeekSlot {
  /** 0 = Monday … 4 = Friday. */
  day: 0 | 1 | 2 | 3 | 4;
  start: string;
  end: string;
  subjectId: string;
  teacherId: string;
  room?: string;
  location?: Place;
  note?: string;
}

/**
 * One school week for 1TIA. Workshop blocks are long, common core is 45–90 minutes,
 * Tuesday starts late, Friday is short, and YFF on Thursday is at the work placement.
 */
export const SEED_WEEK: WeekSlot[] = [
  // Monday
  { day: 0, start: '08:15', end: '11:15', subjectId: SUBJECT_IDS.pt, teacherId: TEACHER_IDS.hilde, room: 'Verksted 2' },
  { day: 0, start: '12:00', end: '13:30', subjectId: SUBJECT_IDS.matematikk, teacherId: TEACHER_IDS.amir, room: 'B214' },
  { day: 0, start: '13:40', end: '14:25', subjectId: SUBJECT_IDS.norsk, teacherId: TEACHER_IDS.ingrid, room: 'B214' },
  // Tuesday – late start
  { day: 1, start: '09:55', end: '11:25', subjectId: SUBJECT_IDS.engelsk, teacherId: TEACHER_IDS.ingrid, room: 'B216' },
  { day: 1, start: '12:05', end: '14:35', subjectId: SUBJECT_IDS.kst, teacherId: TEACHER_IDS.morten, room: 'Verksted 1' },
  // Wednesday
  { day: 2, start: '08:15', end: '09:45', subjectId: SUBJECT_IDS.naturfag, teacherId: TEACHER_IDS.amir, room: 'Naturfagrom C108' },
  { day: 2, start: '09:55', end: '11:25', subjectId: SUBJECT_IDS.kroppsoving, teacherId: TEACHER_IDS.kristian, room: 'Gymsal' },
  { day: 2, start: '12:05', end: '15:05', subjectId: SUBJECT_IDS.pt, teacherId: TEACHER_IDS.hilde, room: 'Verksted 2', note: 'Ta med vernesko og arbeidstøy.' },
  // Thursday – one class at school, then YFF at the placement
  { day: 3, start: '08:15', end: '09:45', subjectId: SUBJECT_IDS.engelsk, teacherId: TEACHER_IDS.ingrid, room: 'B216' },
  {
    day: 3,
    start: '10:30',
    end: '15:00',
    subjectId: SUBJECT_IDS.yff,
    teacherId: TEACHER_IDS.morten,
    location: SEED_PLACEMENT,
    note: `Utplassering hos ${SEED_PLACEMENT_NAME}. Møt opp i resepsjonen og ta med vernesko.`,
  },
  // Friday – short day
  { day: 4, start: '08:15', end: '10:30', subjectId: SUBJECT_IDS.kst, teacherId: TEACHER_IDS.morten, room: 'Elektrolab A105' },
  { day: 4, start: '10:45', end: '11:30', subjectId: SUBJECT_IDS.norsk, teacherId: TEACHER_IDS.ingrid, room: 'B214' },
  { day: 4, start: '12:10', end: '12:55', subjectId: SUBJECT_IDS.matematikk, teacherId: TEACHER_IDS.amir, room: 'B214' },
];

/** Extra notes on single lessons, keyed by week offset (0 = current week) and slot. */
const LESSON_NOTES: Array<{ week: number; day: number; start: string; note: string }> = [
  { week: 1, day: 0, start: '12:00', note: 'Prøve i likninger og formler. Ett A4-ark med egne notater er lov.' },
  { week: 0, day: 4, start: '10:45', note: 'Ta med boka du leser i.' },
  { week: 2, day: 1, start: '09:55', note: 'Muntlig presentasjon om et yrke du er nysgjerrig på.' },
];

const subjectName = (id: string) => SEED_SUBJECTS.find((s) => s.id === id)?.name ?? id;

/** Stable id, so regenerating the seed keeps ids that absences may point to. */
export function seedClassId(date: ISODate, start: string): string {
  return `seed-${date}-${start.replace(':', '')}`;
}

/** Monday of the first seeded week for a given "now". */
export function seedRangeStart(now: Date): ISODate {
  return addDaysISO(startOfWeekISO(now), -7 * SEED_WEEKS_BEFORE);
}

/** Friday of the last seeded week for a given "now". */
export function seedRangeEnd(now: Date): ISODate {
  return addDaysISO(startOfWeekISO(now), 7 * SEED_WEEKS_AHEAD + 4);
}

/** Class events for the previous week through four weeks ahead, in time order. */
export function buildSeedClasses(now: Date = new Date()): CalendarEvent[] {
  const thisMonday = startOfWeekISO(now);
  const events: CalendarEvent[] = [];
  for (let week = -SEED_WEEKS_BEFORE; week <= SEED_WEEKS_AHEAD; week += 1) {
    const monday = addDaysISO(thisMonday, week * 7);
    for (const slot of SEED_WEEK) {
      const date = addDaysISO(monday, slot.day);
      const extra = LESSON_NOTES.find(
        (n) => n.week === week && n.day === slot.day && n.start === slot.start,
      );
      const note = extra?.note ?? slot.note;
      events.push({
        id: seedClassId(date, slot.start),
        kind: 'class',
        title: subjectName(slot.subjectId),
        start: atTime(date, slot.start),
        end: atTime(date, slot.end),
        subjectId: slot.subjectId,
        teacherId: slot.teacherId,
        ...(slot.room ? { room: slot.room } : {}),
        ...(slot.location ? { location: slot.location } : {}),
        ...(note ? { note } : {}),
        source: 'seed',
      });
    }
  }
  return events;
}

/** A couple of non-class events in the coming weeks. */
export function buildSeedCustomEvents(now: Date = new Date()): CalendarEvent[] {
  const thisMonday = startOfWeekISO(now);
  const parentsEvening = addDaysISO(thisMonday, 7 + 2); // Wednesday next week
  const companyVisit = addDaysISO(thisMonday, 14 + 4); // Friday in two weeks
  return [
    {
      id: 'seed-custom-foreldremote',
      kind: 'custom',
      title: 'Foreldremøte',
      start: atTime(parentsEvening, '18:00'),
      end: atTime(parentsEvening, '19:30'),
      room: 'Auditoriet',
      note: 'For elever og foresatte i 1TIA. Kontaktlærer forteller om YFF og veien mot læreplass.',
      source: 'seed',
    },
    {
      id: 'seed-custom-bedriftsbesok',
      kind: 'custom',
      title: 'Bedriftsbesøk',
      start: atTime(companyVisit, '13:15'),
      end: atTime(companyVisit, '15:00'),
      note: 'Felles avreise fra hovedinngangen kl. 13:15. Vi besøker et mekanisk verksted på Alnabru. Ta med vernesko.',
      source: 'seed',
    },
  ];
}

export function buildSeedEvents(now: Date = new Date()): CalendarEvent[] {
  return [...buildSeedClasses(now), ...buildSeedCustomEvents(now)];
}
