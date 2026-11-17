import type { Assessment, Subject } from '@shared/types';
import { daysUntil } from '@/lib/date';
import { averageGrade, gradeHistory, type GradePoint } from './averages';
import { weekLabel } from './labels';
import { assessmentStatus, dueAt, isPast } from './status';

/** Earliest first by when it is held or due. */
export function compareByDue(a: Assessment, b: Assessment): number {
  return dueAt(a).localeCompare(dueAt(b)) || a.id.localeCompare(b.id);
}

/** Most recently assessed first (falls back to the date it was held). */
export function compareByAssessed(a: Assessment, b: Assessment): number {
  const at = a.result?.assessedAt ?? a.date;
  const bt = b.result?.assessedAt ?? b.date;
  return bt.localeCompare(at) || b.date.localeCompare(a.date) || a.id.localeCompare(b.id);
}

export interface AssessmentGroups {
  /** Hand-ins past their due time that are neither handed in nor assessed, oldest first. */
  overdue: Assessment[];
  /** Still ahead, including hand-ins already marked as handed in, nearest first. */
  upcoming: Assessment[];
  /** Held or handed in, waiting for the teacher, newest first. */
  awaiting: Assessment[];
  /** With a result, the latest result first. */
  assessed: Assessment[];
}

export function groupAssessments(assessments: Assessment[], now: Date): AssessmentGroups {
  const groups: AssessmentGroups = { overdue: [], upcoming: [], awaiting: [], assessed: [] };
  for (const a of assessments) {
    const status = assessmentStatus(a, now);
    if (status === 'assessed') groups.assessed.push(a);
    else if (status === 'overdue') groups.overdue.push(a);
    else if (status === 'awaiting' || (status === 'submitted' && isPast(a, now))) groups.awaiting.push(a);
    else groups.upcoming.push(a);
  }
  groups.overdue.sort(compareByDue);
  groups.upcoming.sort(compareByDue);
  groups.awaiting.sort((a, b) => compareByDue(b, a));
  groups.assessed.sort(compareByAssessed);
  return groups;
}

export interface WeekGroup {
  label: string;
  items: Assessment[];
}

/** Splits a list that is already sorted by due date into week headings. */
export function groupByWeek(sorted: Assessment[], now: Date): WeekGroup[] {
  const groups: WeekGroup[] = [];
  for (const a of sorted) {
    const label = weekLabel(a.date, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(a);
    else groups.push({ label, items: [a] });
  }
  return groups;
}

/** Horizon for "kommer de neste to ukene" in the summary. */
export const SUMMARY_HORIZON_DAYS = 14;

export interface AssessmentSummary {
  /** The next thing the student has to do or sit (handed-in hand-ins are skipped). */
  next: Assessment | undefined;
  /** How many of those fall within `SUMMARY_HORIZON_DAYS`. */
  comingSoon: number;
  /** Plain mean of every graded assessment, or null. */
  average: number | null;
  gradedCount: number;
  overdueCount: number;
}

export function summarise(assessments: Assessment[], now: Date): AssessmentSummary {
  const { upcoming, overdue } = groupAssessments(assessments, now);
  const todo = upcoming.filter((a) => assessmentStatus(a, now) === 'upcoming');
  return {
    next: todo[0],
    comingSoon: todo.filter((a) => daysUntil(a.date, now) <= SUMMARY_HORIZON_DAYS).length,
    average: averageGrade(assessments),
    gradedCount: gradeHistory(assessments).length,
    overdueCount: overdue.length,
  };
}

export interface SubjectSummary {
  subject: Subject;
  /** All of the subject's assessments, by date. */
  assessments: Assessment[];
  history: GradePoint[];
  average: number | null;
  /** Upcoming ones that are not handed in yet. */
  upcomingCount: number;
}

/** Placeholder for an assessment whose subject is missing from the timetable store. */
export function unknownSubject(id: string): Subject {
  return { id, name: 'Ukjent fag', short: 'Ukjent', color: 7, vocational: false };
}

/** The subject from a lookup map, or the placeholder. */
export function subjectOrUnknown(subjects: Map<string, Subject>, id: string): Subject {
  return subjects.get(id) ?? unknownSubject(id);
}

/**
 * One entry per subject that has at least one assessment, in the order of `subjects`
 * (programme subjects first in the seed). Subjects without assessments are left out.
 */
export function summariseSubjects(
  assessments: Assessment[],
  subjects: Subject[],
  now: Date,
): SubjectSummary[] {
  const bySubject = new Map<string, Assessment[]>();
  for (const a of assessments) {
    const list = bySubject.get(a.subjectId) ?? [];
    list.push(a);
    bySubject.set(a.subjectId, list);
  }

  const known = subjects.filter((s) => bySubject.has(s.id));
  const unknown = [...bySubject.keys()]
    .filter((id) => !subjects.some((s) => s.id === id))
    .map(unknownSubject);

  return [...known, ...unknown].map((subject) => {
    const own = [...(bySubject.get(subject.id) ?? [])].sort(compareByDue);
    return {
      subject,
      assessments: own,
      history: gradeHistory(own),
      average: averageGrade(own),
      upcomingCount: own.filter((a) => assessmentStatus(a, now) === 'upcoming').length,
    };
  });
}
