/**
 * Pure helpers for POST /api/ai/timetable/pdf: checking the PDF, cleaning up what the
 * model read, deciding which week the lessons go in and how long they repeat, and turning
 * it all into the response with a ready .ics.
 *
 * The model never does date arithmetic. It reports the weekday column, any dates and the
 * week number it sees; everything below is computed here.
 */
import type { TimetablePdfRequest, TimetablePdfResponse } from '../../shared/api';
import type { ISODate } from '../../shared/types';
import { addDays, diffDays, isValidISODate, WEEKDAYS_NB, weekdayIndex } from './dates';
import { HttpError, MESSAGES } from './errors';
import { buildTimetableIcs, type IcsLesson } from './timetableIcs';
import type { TimetableOutput } from '../prompts/timetable';

export const MAX_PDF_BYTES = 5 * 1024 * 1024;
/** More than a full week of single periods; anything beyond is noise. */
export const MAX_LESSONS = 80;
/** A lesson longer than this is a misread. */
const MAX_LESSON_MINUTES = 10 * 60;

// ---------------------------------------------------------------- the PDF itself

/**
 * Decodes the base64 PDF and checks size and the `%PDF` header (allowed anywhere in the
 * first kilobyte, as the spec permits). Throws a Norwegian BAD_REQUEST otherwise.
 */
export function decodePdf(base64: string): Buffer {
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > MAX_PDF_BYTES) throw new HttpError(413, 'BAD_REQUEST', MESSAGES.pdfTooLarge);
  if (!bytes.subarray(0, 1024).toString('latin1').includes('%PDF-')) {
    throw new HttpError(400, 'BAD_REQUEST', MESSAGES.notPdf);
  }
  return bytes;
}

// ---------------------------------------------------------------- lessons

/** "8:15", "08.15", "0815" → "08:15"; null when it is not a valid time of day. */
export function normaliseTime(value: string): string | null {
  const match = /^\s*(\d{1,2})[:.]?(\d{2})\s*$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

function cleanField(value: string | null | undefined, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim().slice(0, max).trim();
  return text || null;
}

/** Boxes that are breaks, not lessons, in case the model lists them anyway. */
const NOT_A_LESSON = /^(?:lunsj|lunch|spisepause|pause|friminutt|matpause|storefri)\b/i;

/**
 * Cleans the model's lessons: valid times only (start before end, at most ten hours),
 * a weekday from the date when one is given, no empty or break entries, trimmed text,
 * touching identical blocks merged, duplicates removed, sorted and capped.
 */
export function sanitizeLessons(raw: TimetableOutput['lessons']): IcsLesson[] {
  const lessons: IcsLesson[] = [];
  for (const item of raw) {
    const start = normaliseTime(item.start);
    const end = normaliseTime(item.end);
    if (!start || !end) continue;
    const minutes = toMinutes(end) - toMinutes(start);
    if (minutes <= 0 || minutes > MAX_LESSON_MINUTES) continue;

    const subject = cleanField(item.subject, 120);
    if (!subject || NOT_A_LESSON.test(subject)) continue;

    const date = item.date && isValidISODate(item.date) ? item.date : null;
    const named = WEEKDAYS_NB.indexOf(item.weekday);
    const weekday = date ? weekdayIndex(date) : Math.min(Math.max(named, 0), 6);

    lessons.push({
      weekday,
      start,
      end,
      subject,
      room: cleanField(item.room, 80),
      teacher: cleanField(item.teacher, 80),
      address: cleanField(item.address, 160),
    });
  }

  lessons.sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start) || a.end.localeCompare(b.end));

  const out: IcsLesson[] = [];
  const seen = new Set<string>();
  for (const lesson of lessons) {
    const previous = out.at(-1);
    const same =
      previous &&
      previous.weekday === lesson.weekday &&
      previous.subject.toLowerCase() === lesson.subject.toLowerCase() &&
      previous.room === lesson.room &&
      previous.address === lesson.address &&
      previous.teacher === lesson.teacher;
    // One lesson printed as two touching boxes (several periods).
    if (previous && same && previous.end === lesson.start) {
      if (toMinutes(lesson.end) - toMinutes(previous.start) <= MAX_LESSON_MINUTES) {
        previous.end = lesson.end;
        continue;
      }
    }
    const key = [lesson.weekday, lesson.start, lesson.end, lesson.subject.toLowerCase(), lesson.room ?? '', lesson.address ?? ''].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lesson);
  }
  return out.slice(0, MAX_LESSONS);
}

// ---------------------------------------------------------------- weeks

export function mondayOf(date: ISODate): ISODate {
  return addDays(date, -weekdayIndex(date));
}

/** Monday of ISO week `week` in ISO year `year`. */
export function isoWeekMonday(year: number, week: number): ISODate {
  // 4 January is always in week 1.
  const jan4 = `${String(year).padStart(4, '0')}-01-04`;
  return addDays(mondayOf(jan4), (week - 1) * 7);
}

/** 20 June of the school year that contains `date` (a school year starts 1 August). */
export function schoolYearEnd(date: ISODate): ISODate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return `${month >= 8 ? year + 1 : year}-06-20`;
}

export interface WeekHints {
  dates: ISODate[];
  weekNumber: number | null;
  year: number | null;
}

export type WeekSource = 'dates' | 'weekNumber' | 'today';

/**
 * The Monday the lessons are placed in:
 * 1. the Monday of the earliest valid date the PDF shows,
 * 2. else the Monday of the week number (in the stated year, or the year that puts it
 *    closest to today),
 * 3. else the Monday of the week containing `today`.
 * A week whose school year has already ended falls back to today's week: the student is
 * importing it now, so an old print most likely still describes the current timetable.
 */
export function resolveWeekStart(hints: WeekHints, today: ISODate): { weekStart: ISODate; source: WeekSource } {
  const thisWeek = mondayOf(today);
  let found: { weekStart: ISODate; source: WeekSource } | null = null;

  const dates = hints.dates.filter(isValidISODate).sort();
  if (dates[0]) {
    found = { weekStart: mondayOf(dates[0]), source: 'dates' };
  } else if (hints.weekNumber !== null && Number.isInteger(hints.weekNumber) && hints.weekNumber >= 1 && hints.weekNumber <= 53) {
    const week = hints.weekNumber;
    const todayYear = Number(today.slice(0, 4));
    const statedYear = hints.year !== null && hints.year >= 2000 && hints.year <= 2100 ? hints.year : null;
    const candidates = (statedYear ? [statedYear] : [todayYear - 1, todayYear, todayYear + 1])
      // Week 53 does not exist in every year; then its Thursday falls in the next year.
      .filter((year) => week < 53 || addDays(isoWeekMonday(year, week), 3).startsWith(String(year)))
      .map((year) => isoWeekMonday(year, week));
    candidates.sort((a, b) => Math.abs(diffDays(thisWeek, a)) - Math.abs(diffDays(thisWeek, b)));
    if (candidates[0]) found = { weekStart: candidates[0], source: 'weekNumber' };
  }

  if (!found || schoolYearEnd(found.weekStart) < today) return { weekStart: thisWeek, source: 'today' };
  return found;
}

/** Last day of the weekly repetition, or null when the school year ends that week. */
export function repetitionEnd(weekStart: ISODate): ISODate | null {
  const end = schoolYearEnd(weekStart);
  return diffDays(weekStart, end) >= 7 ? end : null;
}

// ---------------------------------------------------------------- response

/**
 * Turns the model's output into the response. A document that is not a timetable, or
 * one without a single usable lesson, is an error – never an empty calendar.
 */
export function buildTimetableResponse(
  output: TimetableOutput,
  request: Pick<TimetablePdfRequest, 'today'>,
  options: { mock: boolean; now?: Date },
): TimetablePdfResponse {
  const lessons = output.isTimetable ? sanitizeLessons(output.lessons) : [];
  if (lessons.length === 0) throw new HttpError(422, 'BAD_REQUEST', MESSAGES.notTimetable);

  const dates = output.lessons.map((lesson) => lesson.date).filter((date): date is string => !!date);
  const { weekStart } = resolveWeekStart({ dates, weekNumber: output.weekNumber, year: output.year }, request.today);
  const repeatsUntil = repetitionEnd(weekStart);

  const ics = buildTimetableIcs({
    lessons,
    weekStart,
    repeatsUntil,
    now: options.now ?? new Date(),
    calendarName: options.mock ? 'Eksempeltimeplan (demo)' : 'Timeplan fra PDF',
  });
  return { ics, lessonCount: lessons.length, weekStart, repeatsUntil, mock: options.mock };
}
