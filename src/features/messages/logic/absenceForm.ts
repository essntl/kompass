import type { AbsenceReason, CalendarEvent, ISODate, Teacher } from '@shared/types';
import { joinNorwegian, planAbsence, type AbsenceInput } from '@/lib/absence';
import { addDaysISO, formatDayShort, isWeekend } from '@/lib/date';
import { classesOn } from '@/lib/timetable';
import { capitalise, isAbsenceRegistered } from './detection';

/**
 * Pure logic behind the "Meld fravær" sheet: which days are offered, how a deep link
 * preselects a day or a class, validation, and who is told.
 */

export type AbsenceScope = 'day' | 'classes';

export interface AbsenceFormState {
  dates: ISODate[];
  scope: AbsenceScope;
  classIds: string[];
  reason: AbsenceReason | null;
  text: string;
}

/** From `/meldinger?fravaer=<date>&time=<eventId>`. Both values are untrusted. */
export interface AbsencePreset {
  date?: string | null;
  eventId?: string | null;
}

export interface DateOption {
  date: ISODate;
  /** "I dag", "I morgen", "Ons. 18. nov." */
  label: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const dayOf = (event: CalendarEvent): ISODate => event.start.slice(0, 10);

/** How far ahead we look for school days to offer as chips. */
const LOOKAHEAD_DAYS = 21;
export const MAX_ABSENCE_TEXT_LENGTH = 500;

function isValidDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  // Rejects "2026-02-31", which the pattern alone lets through.
  return addDaysISO(value, 0) === value;
}

/**
 * The day chips: today, tomorrow and then the coming school days (days with a class; plain
 * weekdays when the timetable is empty). `extra` adds days that must be offered whatever
 * the timetable says, e.g. a day preselected through a link.
 */
export function absenceDateOptions(
  events: CalendarEvent[],
  today: ISODate,
  extra: ISODate[] = [],
  count = 7,
): DateOption[] {
  const tomorrow = addDaysISO(today, 1);
  const hasClasses = events.some((event) => event.kind === 'class' && dayOf(event) > tomorrow);
  const dates = new Set<ISODate>([today, tomorrow]);

  for (let offset = 2; offset <= LOOKAHEAD_DAYS && dates.size < count; offset += 1) {
    const date = addDaysISO(today, offset);
    const isSchoolDay = hasClasses ? classesOn(events, date).length > 0 : !isWeekend(date);
    if (isSchoolDay) dates.add(date);
  }
  for (const date of extra) {
    if (isValidDate(date) && date >= today) dates.add(date);
  }

  return [...dates].sort().map((date) => ({
    date,
    label:
      date === today ? 'I dag' : date === tomorrow ? 'I morgen' : capitalise(formatDayShort(date)),
  }));
}

/**
 * The form as it opens. A valid class id wins over the date (the class knows its own day)
 * and switches the form to "Velg timer"; a valid date alone preselects the whole day.
 * Days in the past are ignored.
 */
export function initialAbsenceForm(
  preset: AbsencePreset | null | undefined,
  events: CalendarEvent[],
  today: ISODate,
): AbsenceFormState {
  const empty: AbsenceFormState = {
    dates: [],
    scope: 'day',
    classIds: [],
    reason: null,
    text: '',
  };
  if (!preset) return empty;

  const cls = preset.eventId
    ? events.find((event) => event.kind === 'class' && event.id === preset.eventId)
    : undefined;
  if (cls && dayOf(cls) >= today) {
    return {
      ...empty,
      dates: [dayOf(cls)],
      scope: 'classes',
      classIds: [cls.id],
    };
  }
  if (preset.date && isValidDate(preset.date) && preset.date >= today) {
    return { ...empty, dates: [preset.date] };
  }
  return empty;
}

/** The classes on the chosen days, one group per day, in time order. */
export function classesForDates(
  events: CalendarEvent[],
  dates: ISODate[],
): Array<{ date: ISODate; classes: CalendarEvent[] }> {
  return [...dates].sort().map((date) => ({ date, classes: classesOn(events, date) }));
}

/** Drops chosen classes that are no longer on one of the chosen days. */
export function pruneClassIds(
  classIds: string[],
  dates: ISODate[],
  events: CalendarEvent[],
): string[] {
  const valid = new Set(
    events
      .filter((event) => event.kind === 'class' && dates.includes(dayOf(event)))
      .map((e) => e.id),
  );
  return classIds.filter((id) => valid.has(id));
}

export function toAbsenceInput(state: AbsenceFormState, events: CalendarEvent[]): AbsenceInput {
  const wholeDay = state.scope === 'day';
  const text = state.text.trim().slice(0, MAX_ABSENCE_TEXT_LENGTH);
  return {
    dates: [...state.dates].sort(),
    wholeDay,
    classEventIds: wholeDay ? [] : pruneClassIds(state.classIds, state.dates, events),
    reason: state.reason ?? 'annet',
    ...(text ? { text } : {}),
    source: 'form',
  };
}

export interface AbsenceFormErrors {
  dates?: string;
  classes?: string;
  reason?: string;
  /** Problems with the form as a whole, shown above the send button. */
  form?: string;
}

export function validateAbsenceForm(
  state: AbsenceFormState,
  events: CalendarEvent[],
): AbsenceFormErrors {
  const errors: AbsenceFormErrors = {};
  const input = toAbsenceInput(state, events);

  if (input.dates.length === 0) errors.dates = 'Velg minst én dag.';
  if (!input.wholeDay && input.dates.length > 0 && input.classEventIds.length === 0) {
    errors.classes = 'Velg minst én time, eller bytt til hele dagen.';
  }
  if (!state.reason) errors.reason = 'Velg en årsak.';

  if (Object.keys(errors).length === 0 && isAbsenceRegistered(input, events)) {
    errors.form = 'Du har allerede meldt dette fraværet. Du finner det under Mitt fravær.';
  }
  return errors;
}

export const hasErrors = (errors: AbsenceFormErrors): boolean => Object.keys(errors).length > 0;

/**
 * Who gets the notice, contact teacher first – straight from `planAbsence`, so the summary
 * line can never promise something `reportAbsence` does not do.
 */
export function absenceRecipients(
  input: AbsenceInput,
  context: { events: CalendarEvent[]; teachers: Teacher[] },
): Teacher[] {
  if (input.dates.length === 0 || (!input.wholeDay && input.classEventIds.length === 0)) return [];
  return planAbsence(input, context)
    .teacherIds.map((id) => context.teachers.find((teacher) => teacher.id === id))
    .filter((teacher): teacher is Teacher => !!teacher);
}

/** "Hilde Bakken og Ingrid Solheim får beskjed." */
export function recipientsSentence(teachers: Teacher[]): string {
  if (teachers.length === 0) return 'Ingen lærere er knyttet til dette fraværet.';
  return `${joinNorwegian(teachers.map((teacher) => teacher.name))} får beskjed.`;
}
