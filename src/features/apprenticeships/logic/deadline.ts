import type { ISODate } from '@shared/types';
import { daysUntil, formatDaysUntil } from '@/lib/date';

/** Deadlines this close (in days, inclusive) get the urgent styling. */
export const URGENT_DAYS = 7;

export type DeadlineTone = 'expired' | 'urgent' | 'normal';

export interface DeadlineStatus {
  /** Calendar days from today; negative once the deadline has passed. */
  days: number;
  tone: DeadlineTone;
  /** "i dag", "i morgen", "om 3 dager" – or "Fristen har gått ut". */
  relative: string;
}

/** The deadline is the last day to apply, so it is still open on the day itself. */
export function deadlineStatus(deadline: ISODate, now: Date = new Date()): DeadlineStatus {
  const days = daysUntil(deadline, now);
  if (days < 0) return { days, tone: 'expired', relative: 'Fristen har gått ut' };
  return { days, tone: days <= URGENT_DAYS ? 'urgent' : 'normal', relative: formatDaysUntil(deadline, now) };
}

export function isExpired(deadline: ISODate, now: Date = new Date()): boolean {
  return daysUntil(deadline, now) < 0;
}
