import type { Assessment, LocalDateTime } from '@shared/types';
import { toLocalDateTime } from '@/lib/date';

/**
 * - upcoming:  in the future and not handed in
 * - submitted: a hand-in the student has marked as handed in, not assessed yet
 * - overdue:   a hand-in whose due time passed without being handed in or assessed
 * - awaiting:  held (prøve, muntlig …) but not assessed yet
 * - assessed:  the teacher has given a result
 */
export type AssessmentStatus = 'upcoming' | 'submitted' | 'overdue' | 'awaiting' | 'assessed';

/** Hand-ins without a time are due at the end of the day. */
export const DEFAULT_DUE_TIME = '23:59';

export function isHandIn(assessment: Pick<Assessment, 'kind'>): boolean {
  return assessment.kind === 'innlevering';
}

/** When it is held, or when the hand-in is due, as local wall time. */
export function dueAt(assessment: Pick<Assessment, 'date' | 'time' | 'kind'>): LocalDateTime {
  const fallback = isHandIn(assessment) ? DEFAULT_DUE_TIME : '00:00';
  return `${assessment.date}T${assessment.time ?? fallback}`;
}

/** True once the start (or the due time of a hand-in) has passed. */
export function isPast(assessment: Assessment, now: Date): boolean {
  return dueAt(assessment) < toLocalDateTime(now);
}

export function assessmentStatus(assessment: Assessment, now: Date): AssessmentStatus {
  if (assessment.result) return 'assessed';
  if (isHandIn(assessment) && assessment.submitted) return 'submitted';
  if (!isPast(assessment, now)) return 'upcoming';
  return isHandIn(assessment) ? 'overdue' : 'awaiting';
}
