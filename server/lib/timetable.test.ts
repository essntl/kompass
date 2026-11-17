import { describe, expect, it } from 'vitest';
import { parseIcs } from '../../src/features/timetable/logic/parseIcs';
import { MOCK_TIMETABLE } from '../mock/timetable';
import type { TimetableOutput, TimetableOutputLesson } from '../prompts/timetable';
import { HttpError } from './errors';
import {
  buildTimetableResponse,
  decodePdf,
  isoWeekMonday,
  MAX_LESSONS,
  normaliseTime,
  repetitionEnd,
  resolveWeekStart,
  sanitizeLessons,
  schoolYearEnd,
} from './timetable';

const raw = (overrides: Partial<TimetableOutputLesson> = {}): TimetableOutputLesson => ({
  weekday: 'mandag',
  date: null,
  start: '08:15',
  end: '09:45',
  subject: 'Norsk',
  room: 'B214',
  teacher: 'Ingrid Solheim',
  address: null,
  ...overrides,
});

const pdfBase64 = (body = '%PDF-1.7\n%âãÏÓ\n1 0 obj\n') => Buffer.from(body, 'latin1').toString('base64');

describe('decodePdf', () => {
  it('accepts a PDF header, also after a little leading junk', () => {
    expect(decodePdf(pdfBase64()).length).toBeGreaterThan(5);
    expect(() => decodePdf(pdfBase64(`﻿  %PDF-1.4\n`))).not.toThrow();
  });

  it('rejects other files with a Norwegian BAD_REQUEST', () => {
    const error = (() => {
      try {
        decodePdf(Buffer.from('BEGIN:VCALENDAR').toString('base64'));
      } catch (err) {
        return err;
      }
    })();
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 400, code: 'BAD_REQUEST', message: expect.stringMatching(/ikke en PDF/) });
  });

  it('rejects PDFs over 5 MB', () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 32);
    big.write('%PDF-1.7');
    expect(() => decodePdf(big.toString('base64'))).toThrow(/for stor/);
  });
});

describe('normaliseTime', () => {
  it('normalises common ways of writing a time', () => {
    expect(normaliseTime('8:15')).toBe('08:15');
    expect(normaliseTime('08.15')).toBe('08:15');
    expect(normaliseTime('0815')).toBe('08:15');
    expect(normaliseTime(' 14:05 ')).toBe('14:05');
  });

  it('rejects invalid times', () => {
    for (const value of ['24:00', '12:60', 'kl. 8', '', '8']) expect(normaliseTime(value)).toBeNull();
  });
});

describe('sanitizeLessons', () => {
  it('drops invalid, reversed, overlong and break entries', () => {
    const lessons = sanitizeLessons([
      raw(),
      raw({ start: '10:00', end: '09:00', subject: 'Baklengs' }),
      raw({ start: '10:00', end: '10:00', subject: 'Null minutter' }),
      raw({ start: '07:00', end: '18:30', subject: 'Altfor lang' }),
      raw({ start: 'åtte', subject: 'Ugyldig' }),
      raw({ start: '11:30', end: '12:00', subject: 'Lunsj' }),
      raw({ start: '12:00', end: '13:00', subject: '   ' }),
    ]);
    expect(lessons.map((lesson) => lesson.subject)).toEqual(['Norsk']);
  });

  it('cleans text, uses the date for the weekday, dedupes and sorts', () => {
    const lessons = sanitizeLessons([
      raw({ weekday: 'fredag', subject: '  Matematikk   1P-Y ', room: ' ', teacher: null }),
      raw({ weekday: 'mandag', date: '2026-11-18' }), // the date says Wednesday
      raw(),
      raw(),
    ]);
    expect(lessons).toEqual([
      { weekday: 0, start: '08:15', end: '09:45', subject: 'Norsk', room: 'B214', teacher: 'Ingrid Solheim', address: null },
      { weekday: 2, start: '08:15', end: '09:45', subject: 'Norsk', room: 'B214', teacher: 'Ingrid Solheim', address: null },
      { weekday: 4, start: '08:15', end: '09:45', subject: 'Matematikk 1P-Y', room: null, teacher: null, address: null },
    ]);
  });

  it('merges touching blocks of the same lesson, but not lessons with a break between', () => {
    const lessons = sanitizeLessons([
      raw({ start: '08:15', end: '09:00', subject: 'Verksted' }),
      raw({ start: '09:00', end: '09:45', subject: 'Verksted' }),
      raw({ start: '09:55', end: '10:40', subject: 'Verksted' }),
    ]);
    expect(lessons.map((lesson) => `${lesson.start}-${lesson.end}`)).toEqual(['08:15-09:45', '09:55-10:40']);
  });

  it('caps the number of lessons', () => {
    const many = Array.from({ length: 200 }, (_, i) =>
      raw({ subject: `Fag ${i}`, start: `${String(8 + (i % 10)).padStart(2, '0')}:00`, end: `${String(8 + (i % 10)).padStart(2, '0')}:45` }),
    );
    expect(sanitizeLessons(many)).toHaveLength(MAX_LESSONS);
  });
});

describe('weeks', () => {
  it('finds the Monday of an ISO week', () => {
    expect(isoWeekMonday(2026, 47)).toBe('2026-11-16');
    expect(isoWeekMonday(2027, 1)).toBe('2027-01-04');
    expect(isoWeekMonday(2026, 53)).toBe('2026-12-28');
  });

  it('ends the school year on 20 June', () => {
    expect(schoolYearEnd('2026-11-16')).toBe('2027-06-20');
    expect(schoolYearEnd('2027-03-01')).toBe('2027-06-20');
    expect(schoolYearEnd('2026-08-17')).toBe('2027-06-20');
    expect(schoolYearEnd('2026-07-27')).toBe('2026-06-20');
  });

  it('repeats until 20 June, or not at all at the very end of the year', () => {
    expect(repetitionEnd('2026-11-16')).toBe('2027-06-20');
    expect(repetitionEnd('2027-06-14')).toBeNull();
    expect(repetitionEnd('2026-07-27')).toBeNull();
  });

  const none = { dates: [], weekNumber: null, year: null };

  it('uses the week of today when the PDF shows no dates', () => {
    expect(resolveWeekStart(none, '2026-11-18')).toEqual({ weekStart: '2026-11-16', source: 'today' });
    expect(resolveWeekStart(none, '2026-11-22')).toEqual({ weekStart: '2026-11-16', source: 'today' });
  });

  it('prefers dates, then a week number closest to today', () => {
    expect(resolveWeekStart({ ...none, dates: ['2026-11-26', '2026-11-24'] }, '2026-11-17')).toEqual({
      weekStart: '2026-11-23',
      source: 'dates',
    });
    expect(resolveWeekStart({ ...none, weekNumber: 48 }, '2026-11-17').weekStart).toBe('2026-11-23');
    // Week 2 seen in December means next January.
    expect(resolveWeekStart({ ...none, weekNumber: 2 }, '2026-12-15').weekStart).toBe('2027-01-11');
    expect(resolveWeekStart({ ...none, weekNumber: 2, year: 2027 }, '2026-12-15').weekStart).toBe('2027-01-11');
  });

  it('falls back to this week when the PDF is from an earlier school year', () => {
    expect(resolveWeekStart({ ...none, dates: ['2025-11-17'] }, '2026-11-17')).toEqual({
      weekStart: '2026-11-16',
      source: 'today',
    });
  });

  it('ignores invalid hints', () => {
    expect(resolveWeekStart({ dates: ['2026-02-30'], weekNumber: 60, year: null }, '2026-11-17').source).toBe('today');
  });
});

describe('buildTimetableResponse', () => {
  const NOW = new Date('2026-11-17T09:00:00Z');

  it('builds the mock sample week into an .ics the client can import', () => {
    const response = buildTimetableResponse(MOCK_TIMETABLE, { today: '2026-11-17' }, { mock: true, now: NOW });
    expect(response).toMatchObject({ lessonCount: 13, weekStart: '2026-11-16', repeatsUntil: '2027-06-20', mock: true });

    const parsed = parseIcs(response.ics, { now: NOW });
    const week = parsed.events.filter((event) => event.start < '2026-11-23');
    expect(week).toHaveLength(13);
    const yff = week.find((event) => event.title === 'Yrkesfaglig fordypning');
    expect(yff).toMatchObject({ start: '2026-11-19T10:30', end: '2026-11-19T15:00', room: 'Dronning Margretes vei 15, Oslo' });
  });

  it('is an error, not an empty calendar, when the PDF is not a timetable', () => {
    const notTimetable: TimetableOutput = { isTimetable: false, weekNumber: null, year: null, lessons: [] };
    expect(() => buildTimetableResponse(notTimetable, { today: '2026-11-17' }, { mock: false })).toThrow(
      /fant ingen timeplan/,
    );
    const unusable: TimetableOutput = { isTimetable: true, weekNumber: 47, year: null, lessons: [raw({ start: 'x' })] };
    expect(() => buildTimetableResponse(unusable, { today: '2026-11-17' }, { mock: false })).toThrow(HttpError);
  });
});
