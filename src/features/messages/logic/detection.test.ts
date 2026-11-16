import { describe, expect, it } from 'vitest';
import type { AbsenceDetectResponse } from '@shared/api';
import {
  buildUpcomingClasses,
  detectionToAbsenceInput,
  isAbsenceRegistered,
  summariseAbsence,
} from './detection';
import { EVENTS, TODAY, absenceEvent, cls } from './testFixtures';

const response = (patch: Partial<AbsenceDetectResponse>): AbsenceDetectResponse => ({
  isAbsence: true,
  dates: [],
  classes: [],
  classEventIds: [],
  wholeDay: false,
  reason: 'sykdom',
  reasonText: 'Syk',
  mock: false,
  ...patch,
});

describe('buildUpcomingClasses', () => {
  it('sends the classes from today through ten days ahead in the request shape', () => {
    const classes = buildUpcomingClasses(EVENTS, TODAY);
    expect(classes.map((c) => c.eventId)).toEqual([
      'mon-norsk',
      'mon-matte',
      'tue-norsk',
      'tue-gym',
      'wed-pt',
      'fri-engelsk',
      'next-mon-norsk',
    ]);
    expect(classes[0]).toEqual({
      eventId: 'mon-norsk',
      date: '2026-11-16',
      subject: 'Norsk',
      start: '08:15',
      end: '09:45',
    });
  });

  it('leaves out absences and other event kinds', () => {
    const classes = buildUpcomingClasses([...EVENTS, absenceEvent('a', '2026-11-17')], TODAY);
    expect(classes.every((c) => c.eventId !== 'a')).toBe(true);
  });

  it('includes the last day of the window and nothing after it', () => {
    const events = [
      cls('d10', '2026-11-26', '08:15', '09:00', 'Norsk'),
      cls('d11', '2026-11-27', '08:15', '09:00', 'Norsk'),
    ];
    expect(buildUpcomingClasses(events, TODAY).map((c) => c.eventId)).toEqual(['d10']);
  });
});

describe('detectionToAbsenceInput', () => {
  it('returns null when the message is not an absence', () => {
    expect(detectionToAbsenceInput(response({ isAbsence: false }), EVENTS, TODAY)).toBeNull();
  });

  it('uses the dates for a whole day (classEventIds is empty then)', () => {
    const input = detectionToAbsenceInput(
      response({
        wholeDay: true,
        dates: ['2026-11-18', '2026-11-17', '2026-11-17'],
      }),
      EVENTS,
      TODAY,
    );
    expect(input).toEqual({
      dates: ['2026-11-17', '2026-11-18'],
      wholeDay: true,
      classEventIds: [],
      reason: 'sykdom',
      source: 'ai',
    });
  });

  it('drops days in the past and gives up when none are left', () => {
    expect(
      detectionToAbsenceInput(response({ wholeDay: true, dates: ['2026-11-13'] }), EVENTS, TODAY),
    ).toBeNull();
  });

  it('maps single classes to existing events and derives the dates from them', () => {
    const input = detectionToAbsenceInput(
      response({
        dates: ['2026-11-17'],
        classEventIds: ['tue-norsk', 'unknown', 'past-norsk'],
      }),
      EVENTS,
      TODAY,
    );
    expect(input).toMatchObject({
      dates: ['2026-11-17'],
      wholeDay: false,
      classEventIds: ['tue-norsk'],
      source: 'ai',
    });
  });

  it('returns null when none of the classes exist', () => {
    expect(
      detectionToAbsenceInput(
        response({ dates: ['2026-11-17'], classEventIds: ['nope'] }),
        EVENTS,
        TODAY,
      ),
    ).toBeNull();
  });

  it('keeps the reason phrase as a note only for "annet"', () => {
    const other = detectionToAbsenceInput(
      response({
        wholeDay: true,
        dates: ['2026-11-17'],
        reason: 'annet',
        reasonText: 'Bursdag til bestemor',
      }),
      EVENTS,
      TODAY,
    );
    expect(other?.text).toBe('Bursdag til bestemor');
    const sick = detectionToAbsenceInput(
      response({ wholeDay: true, dates: ['2026-11-17'] }),
      EVENTS,
      TODAY,
    );
    expect(sick?.text).toBeUndefined();
  });
});

describe('isAbsenceRegistered', () => {
  it('is false without absence events', () => {
    expect(
      isAbsenceRegistered({ dates: ['2026-11-17'], wholeDay: true, classEventIds: [] }, EVENTS),
    ).toBe(false);
  });

  it('recognises a whole day that is already reported', () => {
    const events = [...EVENTS, absenceEvent('a', '2026-11-17')];
    expect(
      isAbsenceRegistered({ dates: ['2026-11-17'], wholeDay: true, classEventIds: [] }, events),
    ).toBe(true);
    expect(
      isAbsenceRegistered(
        {
          dates: ['2026-11-17', '2026-11-18'],
          wholeDay: true,
          classEventIds: [],
        },
        events,
      ),
    ).toBe(false);
  });

  it('recognises a class covered by a whole-day or a class absence', () => {
    const wholeDay = [...EVENTS, absenceEvent('a', '2026-11-17')];
    expect(
      isAbsenceRegistered({ dates: [], wholeDay: false, classEventIds: ['tue-norsk'] }, wholeDay),
    ).toBe(true);
    const single = [...EVENTS, absenceEvent('b', '2026-11-17', '09:55', '11:25', false)];
    expect(
      isAbsenceRegistered({ dates: [], wholeDay: false, classEventIds: ['tue-norsk'] }, single),
    ).toBe(true);
    expect(
      isAbsenceRegistered(
        { dates: [], wholeDay: false, classEventIds: ['tue-norsk', 'tue-gym'] },
        single,
      ),
    ).toBe(false);
  });

  it('treats a day whose every class is reported as the whole day', () => {
    const events = [
      ...EVENTS,
      absenceEvent('n', '2026-11-17', '09:55', '11:25', false),
      absenceEvent('g', '2026-11-17', '12:15', '13:45', false),
    ];
    expect(
      isAbsenceRegistered({ dates: ['2026-11-17'], wholeDay: true, classEventIds: [] }, events),
    ).toBe(true);
  });
});

describe('summariseAbsence', () => {
  const now = new Date(2026, 10, 16, 9, 0);

  it('reads a whole day relative to today', () => {
    expect(
      summariseAbsence(
        {
          dates: ['2026-11-17'],
          wholeDay: true,
          classEventIds: [],
          reason: 'sykdom',
        },
        EVENTS,
        now,
      ),
    ).toEqual({ when: 'I morgen', scope: 'Hele dagen', reason: 'Sykdom' });
  });

  it('lists the classes with their times', () => {
    expect(
      summariseAbsence(
        {
          dates: ['2026-11-17'],
          wholeDay: false,
          classEventIds: ['tue-norsk'],
          reason: 'lege_tannlege',
        },
        EVENTS,
        now,
      ),
    ).toEqual({
      when: 'I morgen',
      scope: 'Norsk kl. 09:55–11:25',
      reason: 'Lege eller tannlege',
    });
  });

  it('adds the weekday when the classes span several days', () => {
    const summary = summariseAbsence(
      {
        dates: ['2026-11-17', '2026-11-20'],
        wholeDay: false,
        classEventIds: ['tue-norsk', 'fri-engelsk'],
        reason: 'familie',
      },
      EVENTS,
      now,
    );
    expect(summary.when).toBe('I morgen og på fredag');
    expect(summary.scope).toBe('Norsk tirsdag kl. 09:55–11:25 og Engelsk fredag kl. 08:15–09:45');
  });
});
