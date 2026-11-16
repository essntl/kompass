import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@shared/types';
import { SEED_TEACHERS, TEACHER_IDS } from '@/data/seed/teachers';
import { buildSeedClasses, seedClassId } from '@/data/seed/timetable';
import {
  absenceNoticeText,
  describeAbsence,
  isContactTeacher,
  joinNorwegian,
  planAbsence,
  teacherForEvent,
  type AbsenceInput,
} from './absence';

// Seed week around Monday 16 November 2026.
const events = buildSeedClasses(new Date(2026, 10, 16, 7, 0));
const context = { events, teachers: SEED_TEACHERS };

const input = (patch: Partial<AbsenceInput>): AbsenceInput => ({
  dates: [],
  wholeDay: false,
  classEventIds: [],
  reason: 'sykdom',
  source: 'form',
  ...patch,
});

const noticeFor = (plan: ReturnType<typeof planAbsence>, teacherId: string) =>
  plan.notices.find((n) => n.teacherId === teacherId)?.text;

describe('planAbsence – whole day', () => {
  // Thursday: Engelsk (Ingrid) at school, then YFF (Morten) at the placement.
  const plan = planAbsence(input({ dates: ['2026-11-19'], wholeDay: true }), context);

  it('notifies the contact teacher and every teacher with a class that day', () => {
    expect(plan.teacherIds).toEqual([TEACHER_IDS.hilde, TEACHER_IDS.ingrid, TEACHER_IDS.morten]);
    expect(plan.notices.map((n) => n.teacherId)).toEqual(plan.teacherIds);
  });

  it('creates one all-day absence event per day', () => {
    expect(plan.events).toEqual([
      {
        kind: 'absence',
        title: 'Fravær',
        start: '2026-11-19T00:00',
        end: '2026-11-19T23:59',
        allDay: true,
        note: 'Sykdom',
        source: 'absence',
      },
    ]);
    expect(plan.coveredClassIds).toEqual([
      seedClassId('2026-11-19', '08:15'),
      seedClassId('2026-11-19', '10:30'),
    ]);
  });

  it('tells each teacher which of their classes it concerns', () => {
    expect(noticeFor(plan, TEACHER_IDS.ingrid)).toBe(
      'Hei. Jeg er borte hele dagen torsdag 19. november. Det gjelder Engelsk kl. 08:15–09:45. Årsak: Sykdom.',
    );
    expect(noticeFor(plan, TEACHER_IDS.morten)).toContain(
      'Det gjelder Yrkesfaglig fordypning kl. 10:30–15:00.',
    );
    // The contact teacher has no class on Thursdays.
    expect(noticeFor(plan, TEACHER_IDS.hilde)).toBe(
      'Hei. Jeg er borte hele dagen torsdag 19. november. Årsak: Sykdom.',
    );
  });

  it('lists the contact teacher once when she also teaches that day', () => {
    const monday = planAbsence(input({ dates: ['2026-11-16'], wholeDay: true }), context);
    expect(monday.teacherIds).toEqual([TEACHER_IDS.hilde, TEACHER_IDS.amir, TEACHER_IDS.ingrid]);
    expect(noticeFor(monday, TEACHER_IDS.hilde)).toContain(
      'Det gjelder Produksjon og tjenester kl. 08:15–11:15.',
    );
  });

  it('handles several days, sorted, with the weekday on each class', () => {
    const twoDays = planAbsence(
      input({ dates: ['2026-11-20', '2026-11-19'], wholeDay: true, reason: 'familie' }),
      context,
    );
    expect(twoDays.dates).toEqual(['2026-11-19', '2026-11-20']);
    expect(twoDays.events).toHaveLength(2);
    expect(noticeFor(twoDays, TEACHER_IDS.ingrid)).toBe(
      'Hei. Jeg er borte hele dagen torsdag 19. november og fredag 20. november. ' +
        'Det gjelder Engelsk torsdag kl. 08:15–09:45 og Norsk fredag kl. 10:45–11:30. Årsak: Familie.',
    );
  });

  it('still tells the contact teacher on a day without classes', () => {
    const saturday = planAbsence(input({ dates: ['2026-11-21'], wholeDay: true }), context);
    expect(saturday.teacherIds).toEqual([TEACHER_IDS.hilde]);
    expect(saturday.events).toHaveLength(1);
    expect(saturday.coveredClassIds).toEqual([]);
  });
});

describe('planAbsence – single classes', () => {
  const english = seedClassId('2026-11-17', '09:55');
  const workshop = seedClassId('2026-11-17', '12:05');

  it('notifies only the teacher of the class', () => {
    const plan = planAbsence(
      input({ dates: ['2026-11-17'], classEventIds: [english], reason: 'lege_tannlege' }),
      context,
    );
    expect(plan.teacherIds).toEqual([TEACHER_IDS.ingrid]);
    expect(plan.dates).toEqual(['2026-11-17']);
    expect(plan.events).toEqual([
      {
        kind: 'absence',
        title: 'Fravær: Engelsk',
        start: '2026-11-17T09:55',
        end: '2026-11-17T11:25',
        subjectId: 'subj-engelsk',
        teacherId: TEACHER_IDS.ingrid,
        note: 'Lege eller tannlege',
        source: 'absence',
      },
    ]);
    expect(plan.notices[0]?.text).toBe(
      'Hei. Jeg kommer ikke i Engelsk tirsdag 17. november kl. 09:55–11:25. Årsak: Lege eller tannlege.',
    );
  });

  it('derives the dates from the classes and ignores unknown ids', () => {
    const plan = planAbsence(input({ classEventIds: [workshop, 'missing', english] }), context);
    expect(plan.dates).toEqual(['2026-11-17']);
    expect(plan.coveredClassIds).toEqual([english, workshop]);
    expect(plan.teacherIds).toEqual([TEACHER_IDS.ingrid, TEACHER_IDS.morten]);
    expect(plan.events).toHaveLength(2);
  });

  it('lists several classes for the same teacher', () => {
    const friday = seedClassId('2026-11-20', '10:45');
    const plan = planAbsence(input({ classEventIds: [friday, english] }), context);
    expect(plan.teacherIds).toEqual([TEACHER_IDS.ingrid]);
    expect(plan.notices[0]?.text).toBe(
      'Hei. Jeg kommer ikke i disse timene: Engelsk tirsdag 17. november kl. 09:55–11:25 og ' +
        'Norsk fredag 20. november kl. 10:45–11:30. Årsak: Sykdom.',
    );
  });

  it('falls back to the contact teacher when the class has no known teacher', () => {
    const imported: CalendarEvent = {
      id: 'ics-1',
      kind: 'class',
      title: 'Samfunnskunnskap',
      start: '2026-11-17T08:15',
      end: '2026-11-17T09:00',
      source: 'ics',
    };
    const plan = planAbsence(input({ classEventIds: ['ics-1'] }), {
      events: [...events, imported],
      teachers: SEED_TEACHERS,
    });
    expect(plan.teacherIds).toEqual([TEACHER_IDS.hilde]);
    expect(plan.notices[0]?.text).toBe(
      'Hei. Jeg kommer ikke i Samfunnskunnskap tirsdag 17. november kl. 08:15–09:00. Årsak: Sykdom.',
    );
  });

  it('appends the free text on its own paragraph', () => {
    const plan = planAbsence(
      input({ classEventIds: [english], reason: 'transport', text: '  T-banen står.  ' }),
      context,
    );
    expect(plan.notices[0]?.text.endsWith('Årsak: Transport.\n\nT-banen står.')).toBe(true);
  });
});

describe('helpers', () => {
  it('finds the contact teacher by role', () => {
    expect(SEED_TEACHERS.filter(isContactTeacher).map((t) => t.id)).toEqual([TEACHER_IDS.hilde]);
  });

  it('resolves a teacher from the subject when the event has none', () => {
    const cls: CalendarEvent = {
      id: 'x',
      kind: 'class',
      title: 'Naturfag',
      start: '2026-11-18T08:15',
      end: '2026-11-18T09:45',
      subjectId: 'subj-naturfag',
      source: 'manual',
    };
    expect(teacherForEvent(cls, SEED_TEACHERS)?.id).toBe(TEACHER_IDS.amir);
    expect(teacherForEvent({ ...cls, subjectId: undefined }, SEED_TEACHERS)).toBeUndefined();
  });

  it('joins lists the Norwegian way', () => {
    expect(joinNorwegian([])).toBe('');
    expect(joinNorwegian(['a'])).toBe('a');
    expect(joinNorwegian(['a', 'b'])).toBe('a og b');
    expect(joinNorwegian(['a', 'b', 'c'])).toBe('a, b og c');
  });

  it('writes a notice without classes', () => {
    expect(
      absenceNoticeText({ dates: ['2026-11-19'], wholeDay: false, reason: 'annet', classes: [] }),
    ).toBe('Hei. Jeg melder fravær torsdag 19. november. Årsak: Annet.');
  });

  it('summarises a stored absence', () => {
    const base = {
      id: 'a1',
      reason: 'sykdom' as const,
      teacherIds: [],
      createdAt: '2026-11-16T07:00:00.000Z',
      source: 'form' as const,
    };
    expect(
      describeAbsence({ ...base, dates: ['2026-11-19'], wholeDay: true, classEventIds: [] }),
    ).toBe('Hele dagen torsdag 19. november');
    expect(
      describeAbsence(
        {
          ...base,
          dates: ['2026-11-17'],
          wholeDay: false,
          classEventIds: [seedClassId('2026-11-17', '09:55')],
        },
        events,
      ),
    ).toBe('Engelsk, tirsdag 17. november');
  });
});
