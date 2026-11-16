import type { AbsenceRecord, CalendarEvent, ISODate, Teacher } from '@shared/types';
import { ABSENCE_REASON_LABELS, joinNorwegian, teacherForEvent } from '@/lib/absence';
import {
  formatDayLong,
  formatDayShort,
  formatTimeRange,
  relativeDay,
  type DateInput,
} from '@/lib/date';
import { capitalise } from './detection';

/** Pure helpers for "Mitt fravær". */

export interface AbsenceGroups {
  /** Absences with a day from today on, the soonest first. */
  upcoming: AbsenceRecord[];
  /** Absences that are over, the most recent first. */
  past: AbsenceRecord[];
}

const lastDay = (record: AbsenceRecord): ISODate => [...record.dates].sort().at(-1) ?? '';
const firstDay = (record: AbsenceRecord): ISODate => [...record.dates].sort()[0] ?? '';

export function groupAbsences(records: AbsenceRecord[], today: ISODate): AbsenceGroups {
  const upcoming = records
    .filter((record) => lastDay(record) >= today)
    .sort(
      (a, b) => firstDay(a).localeCompare(firstDay(b)) || a.createdAt.localeCompare(b.createdAt),
    );
  const past = records
    .filter((record) => lastDay(record) < today)
    .sort((a, b) => lastDay(b).localeCompare(lastDay(a)) || b.createdAt.localeCompare(a.createdAt));
  return { upcoming, past };
}

export interface AbsenceRowText {
  /** "I morgen", "På torsdag og på fredag", "Man. 9. nov." */
  when: string;
  /** "Hele dagen" or "Norsk kl. 13:40–14:25 og Engelsk kl. 08:15–09:00". */
  scope: string;
  reason: string;
}

/** The three lines of one row. Days within the coming week read relative to today. */
export function absenceRowText(
  record: AbsenceRecord,
  events: CalendarEvent[],
  now: DateInput = new Date(),
): AbsenceRowText {
  const dates = [...record.dates].sort();
  // `relativeDay` falls back to "man. 9. nov." outside the coming week.
  const when = capitalise(joinNorwegian(dates.map((date) => relativeDay(date, now))));
  const reason = ABSENCE_REASON_LABELS[record.reason];
  if (record.wholeDay) return { when, scope: 'Hele dagen', reason };

  const classes = events
    .filter((event) => event.kind === 'class' && record.classEventIds.includes(event.id))
    .sort((a, b) => a.start.localeCompare(b.start));
  if (classes.length === 0) {
    const count = record.classEventIds.length;
    return { when, scope: count === 1 ? '1 time' : `${count} timer`, reason };
  }
  const several = dates.length > 1;
  const scope = joinNorwegian(
    classes.map((cls) => {
      const time = `kl. ${formatTimeRange(cls.start, cls.end)}`;
      return several ? `${cls.title} ${formatDayShort(cls.start)} ${time}` : `${cls.title} ${time}`;
    }),
  );
  return { when, scope, reason };
}

export interface NoticeDetails {
  /** "Tirsdag 17. november og onsdag 18. november" – absolute, the card stays in the history. */
  when: string;
  /** "Hele dagen" or the classes that concern this teacher, one per line. */
  classes: string[];
  reason: string;
  note?: string;
}

/**
 * What the absence-notice bubble in one teacher's thread shows. A subject teacher sees
 * their own classes; the contact teacher (no own classes in it) sees all of them.
 */
export function noticeDetails(
  record: AbsenceRecord,
  events: CalendarEvent[],
  teacherId: string | undefined,
  teachers: Teacher[],
): NoticeDetails {
  const dates = [...record.dates].sort();
  const when = capitalise(joinNorwegian(dates.map(formatDayLong)));
  const reason = ABSENCE_REASON_LABELS[record.reason];
  const note = record.text?.trim() || undefined;
  if (record.wholeDay) return { when, classes: [], reason, note };

  const covered = events
    .filter((event) => event.kind === 'class' && record.classEventIds.includes(event.id))
    .sort((a, b) => a.start.localeCompare(b.start));
  const own = covered.filter((event) => teacherForEvent(event, teachers)?.id === teacherId);
  const several = dates.length > 1;
  const classes = (own.length > 0 ? own : covered).map((cls) => {
    const time = `kl. ${formatTimeRange(cls.start, cls.end)}`;
    return several ? `${cls.title}, ${formatDayShort(cls.start)} ${time}` : `${cls.title} ${time}`;
  });
  return { when, classes, reason, note };
}
