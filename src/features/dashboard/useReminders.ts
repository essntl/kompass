import { useMemo } from 'react';
import type { Reminder } from '@shared/types';
import { useNow } from '@/lib/timetable';
import { useApprenticeshipStore } from '@/stores/apprenticeships';
import { useAssessmentStore } from '@/stores/assessments';
import { useMessagesStore } from '@/stores/messages';
import { useTimetableStore } from '@/stores/timetable';
import { buildReminders } from './logic/reminders';

/**
 * The dashboard's reminders, derived from the stores. Pass `now` to share a clock with the
 * rest of the page; otherwise the hook keeps its own (once a minute).
 */
export function useReminders(now?: Date): Reminder[] {
  const ownNow = useNow(60_000);
  const clock = now ?? ownNow;
  // Recompute once a minute at most, not on every tick of a faster clock.
  const minute = Math.floor(clock.getTime() / 60_000);

  const listings = useApprenticeshipStore((s) => s.listings);
  const savedIds = useApprenticeshipStore((s) => s.savedIds);
  const applications = useApprenticeshipStore((s) => s.applications);
  const events = useTimetableStore((s) => s.events);
  const threads = useMessagesStore((s) => s.threads);
  const teachers = useMessagesStore((s) => s.teachers);
  const messages = useMessagesStore((s) => s.messages);
  const absences = useMessagesStore((s) => s.absences);
  const assessments = useAssessmentStore((s) => s.assessments);
  const subjects = useTimetableStore((s) => s.subjects);

  return useMemo(
    () =>
      buildReminders({
        listings,
        savedIds,
        applications,
        events,
        threads,
        teachers,
        messages,
        absences,
        assessments,
        subjects,
        now: new Date(minute * 60_000),
      }),
    [
      listings,
      savedIds,
      applications,
      events,
      threads,
      teachers,
      messages,
      absences,
      assessments,
      subjects,
      minute,
    ],
  );
}
