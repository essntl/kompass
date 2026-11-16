import { describe, expect, it } from 'vitest';
import type { AbsenceRecord } from '@shared/types';
import { SEED_TEACHERS } from '@/data/seed/teachers';
import { absenceRowText, groupAbsences, noticeDetails } from './myAbsences';
import { EVENTS, TODAY } from './testFixtures';

const record = (
  id: string,
  dates: string[],
  patch: Partial<AbsenceRecord> = {},
): AbsenceRecord => ({
  id,
  dates,
  wholeDay: true,
  classEventIds: [],
  reason: 'sykdom',
  teacherIds: [],
  createdAt: '2026-11-10T10:00:00.000Z',
  source: 'form',
  ...patch,
});

describe('groupAbsences', () => {
  it('lists upcoming absences soonest first and past ones latest first', () => {
    const groups = groupAbsences(
      [
        record('later', ['2026-11-20']),
        record('old', ['2026-11-02']),
        record('today', ['2026-11-16']),
        record('recent', ['2026-11-12', '2026-11-13']),
        record('spanning', ['2026-11-13', '2026-11-17']),
      ],
      TODAY,
    );
    expect(groups.upcoming.map((r) => r.id)).toEqual(['spanning', 'today', 'later']);
    expect(groups.past.map((r) => r.id)).toEqual(['recent', 'old']);
  });
});

describe('absenceRowText', () => {
  const now = new Date(2026, 10, 16, 9, 0);

  it('describes a whole day', () => {
    expect(absenceRowText(record('a', ['2026-11-17', '2026-11-18']), EVENTS, now)).toEqual({
      when: 'I morgen og på onsdag',
      scope: 'Hele dagen',
      reason: 'Sykdom',
    });
  });

  it('lists the classes, with the day when there are several days', () => {
    const one = absenceRowText(
      record('b', ['2026-11-17'], {
        wholeDay: false,
        classEventIds: ['tue-gym'],
        reason: 'transport',
      }),
      EVENTS,
      now,
    );
    expect(one).toEqual({
      when: 'I morgen',
      scope: 'Kroppsøving kl. 12:15–13:45',
      reason: 'Transport',
    });

    const several = absenceRowText(
      record('c', ['2026-11-17', '2026-11-20'], {
        wholeDay: false,
        classEventIds: ['fri-engelsk', 'tue-norsk'],
      }),
      EVENTS,
      now,
    );
    expect(several.scope).toBe(
      'Norsk tir. 17. nov. kl. 09:55–11:25 og Engelsk fre. 20. nov. kl. 08:15–09:45',
    );
  });

  it('counts classes that are gone from the timetable', () => {
    const row = absenceRowText(
      record('d', ['2026-11-17'], {
        wholeDay: false,
        classEventIds: ['x', 'y'],
      }),
      EVENTS,
      now,
    );
    expect(row.scope).toBe('2 timer');
  });
});

describe('noticeDetails', () => {
  it('uses absolute days and keeps the note', () => {
    const details = noticeDetails(
      record('a', ['2026-11-17'], { text: ' Hos legen ' }),
      EVENTS,
      't-hilde',
      SEED_TEACHERS,
    );
    expect(details).toEqual({
      when: 'Tirsdag 17. november',
      classes: [],
      reason: 'Sykdom',
      note: 'Hos legen',
    });
  });

  it('shows a subject teacher their own classes and the contact teacher all of them', () => {
    const rec = record('b', ['2026-11-17'], {
      wholeDay: false,
      classEventIds: ['tue-norsk', 'tue-gym'],
    });
    expect(noticeDetails(rec, EVENTS, 't-kristian', SEED_TEACHERS).classes).toEqual([
      'Kroppsøving kl. 12:15–13:45',
    ]);
    expect(noticeDetails(rec, EVENTS, 't-hilde', SEED_TEACHERS).classes).toEqual([
      'Norsk kl. 09:55–11:25',
      'Kroppsøving kl. 12:15–13:45',
    ]);
  });
});
