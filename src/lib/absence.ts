import type {
  AbsenceReason,
  AbsenceRecord,
  CalendarEvent,
  ISODate,
  Teacher,
} from '@shared/types';
import { atTime, formatDayLong, formatTimeRange, formatWeekday } from '@/lib/date';

/**
 * Pure absence logic: who is told, which calendar events are created and what the notice
 * says. The stores apply the result in `@/stores/actions`.
 */

export const ABSENCE_REASONS: AbsenceReason[] = [
  'sykdom',
  'lege_tannlege',
  'familie',
  'transport',
  'annet',
];

export const ABSENCE_REASON_LABELS: Record<AbsenceReason, string> = {
  sykdom: 'Sykdom',
  lege_tannlege: 'Lege eller tannlege',
  familie: 'Familie',
  transport: 'Transport',
  annet: 'Annet',
};

export interface AbsenceInput {
  dates: ISODate[];
  wholeDay: boolean;
  /** Class events covered when `wholeDay` is false. */
  classEventIds: string[];
  reason: AbsenceReason;
  text?: string;
  source: 'form' | 'ai';
}

export interface AbsenceNotice {
  teacherId: string;
  /** Norwegian message from the student to this teacher. */
  text: string;
}

export interface AbsencePlan {
  /** Days the absence touches, sorted. */
  dates: ISODate[];
  /** The class events the absence covers (for a whole day: every class on those days). */
  coveredClassIds: string[];
  /** Teachers to notify, contact teacher first. */
  teacherIds: string[];
  /** Calendar events to create (kind 'absence'); the store adds `id` and `absenceId`. */
  events: Array<Omit<CalendarEvent, 'id' | 'absenceId'>>;
  notices: AbsenceNotice[];
}

export function isContactTeacher(teacher: Teacher): boolean {
  return teacher.role.toLowerCase().includes('kontaktlærer');
}

/** The teacher of a class: the event's own teacher, else whoever teaches the subject. */
export function teacherForEvent(event: CalendarEvent, teachers: Teacher[]): Teacher | undefined {
  const direct = event.teacherId ? teachers.find((t) => t.id === event.teacherId) : undefined;
  if (direct) return direct;
  if (!event.subjectId) return undefined;
  return teachers.find((t) => t.subjectIds.includes(event.subjectId as string));
}

const uniq = <T,>(items: T[]): T[] => [...new Set(items)];
const byStart = (a: CalendarEvent, b: CalendarEvent) => a.start.localeCompare(b.start);
const dayOf = (event: CalendarEvent): ISODate => event.start.slice(0, 10);

/** "a", "a og b", "a, b og c" */
export function joinNorwegian(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} og ${parts[parts.length - 1]}`;
}

/**
 * Decides everything about an absence report without touching any store.
 *
 * - Whole day: every teacher with a class on one of the days, plus the contact teacher.
 *   One all-day absence event per day.
 * - Single classes: the teachers of those classes (the contact teacher steps in when none
 *   of the classes has a known teacher). One absence event per class, at the class time.
 */
export function planAbsence(
  input: AbsenceInput,
  context: { events: CalendarEvent[]; teachers: Teacher[] },
): AbsencePlan {
  const classes = context.events.filter((e) => e.kind === 'class');
  const contact = context.teachers.find(isContactTeacher);

  const covered = (
    input.wholeDay
      ? classes.filter((e) => input.dates.includes(dayOf(e)))
      : classes.filter((e) => input.classEventIds.includes(e.id))
  ).sort(byStart);

  const dates = uniq(input.wholeDay ? input.dates : covered.map(dayOf)).sort();

  const classTeacherIds = uniq(
    covered.map((e) => teacherForEvent(e, context.teachers)?.id).filter((id): id is string => !!id),
  );
  const needsContact = input.wholeDay || classTeacherIds.length === 0;
  const teacherIds = uniq([
    ...(needsContact && contact ? [contact.id] : []),
    ...classTeacherIds,
  ]);

  const note = ABSENCE_REASON_LABELS[input.reason];
  const events: AbsencePlan['events'] = input.wholeDay
    ? dates.map((date) => ({
        kind: 'absence',
        title: 'Fravær',
        start: atTime(date, '00:00'),
        end: atTime(date, '23:59'),
        allDay: true,
        note,
        source: 'absence',
      }))
    : covered.map((cls) => ({
        kind: 'absence',
        title: `Fravær: ${cls.title}`,
        start: cls.start,
        end: cls.end,
        ...(cls.subjectId ? { subjectId: cls.subjectId } : {}),
        ...(cls.teacherId ? { teacherId: cls.teacherId } : {}),
        note,
        source: 'absence',
      }));

  const notices = teacherIds.map((teacherId) => {
    const own = covered.filter((e) => teacherForEvent(e, context.teachers)?.id === teacherId);
    return {
      teacherId,
      text: absenceNoticeText({
        dates,
        wholeDay: input.wholeDay,
        reason: input.reason,
        text: input.text,
        // A teacher without own classes (the contact teacher) is told about all of them.
        classes: own.length > 0 || input.wholeDay ? own : covered,
      }),
    };
  });

  return { dates, coveredClassIds: covered.map((e) => e.id), teacherIds, events, notices };
}

/** "Engelsk kl. 08:15–09:45", with the day in front of the time when asked. */
function classPhrase(cls: CalendarEvent, day: 'none' | 'weekday' | 'long'): string {
  const time = `kl. ${formatTimeRange(cls.start, cls.end)}`;
  if (day === 'none') return `${cls.title} ${time}`;
  const when = day === 'long' ? formatDayLong(cls.start) : formatWeekday(cls.start);
  return `${cls.title} ${when} ${time}`;
}

/** The notice one teacher gets. `classes` are the covered classes that concern this teacher. */
export function absenceNoticeText(args: {
  dates: ISODate[];
  wholeDay: boolean;
  reason: AbsenceReason;
  text?: string;
  classes: CalendarEvent[];
}): string {
  const sentences: string[] = ['Hei.'];
  const classes = [...args.classes].sort(byStart);

  if (args.wholeDay) {
    sentences.push(`Jeg er borte hele dagen ${joinNorwegian(args.dates.map(formatDayLong))}.`);
    if (classes.length > 0) {
      const several = args.dates.length > 1;
      const list = joinNorwegian(classes.map((c) => classPhrase(c, several ? 'weekday' : 'none')));
      sentences.push(`Det gjelder ${list}.`);
    }
  } else if (classes.length === 1) {
    sentences.push(`Jeg kommer ikke i ${classPhrase(classes[0] as CalendarEvent, 'long')}.`);
  } else if (classes.length > 1) {
    const list = joinNorwegian(classes.map((c) => classPhrase(c, 'long')));
    sentences.push(`Jeg kommer ikke i disse timene: ${list}.`);
  } else {
    sentences.push(`Jeg melder fravær ${joinNorwegian(args.dates.map(formatDayLong))}.`);
  }

  sentences.push(`Årsak: ${ABSENCE_REASON_LABELS[args.reason]}.`);
  const extra = args.text?.trim();
  return extra ? `${sentences.join(' ')}\n\n${extra}` : sentences.join(' ');
}

/** One-line summary of a stored absence, e.g. for lists: "Hele dagen torsdag 19. november". */
export function describeAbsence(record: AbsenceRecord, events: CalendarEvent[] = []): string {
  const days = joinNorwegian(record.dates.map(formatDayLong));
  if (record.wholeDay) return `Hele dagen ${days}`;
  const classes = events
    .filter((e) => record.classEventIds.includes(e.id))
    .sort(byStart)
    .map((e) => e.title);
  return classes.length > 0 ? `${joinNorwegian(uniq(classes))}, ${days}` : days;
}
