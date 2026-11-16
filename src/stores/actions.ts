import type { AbsenceRecord, CalendarEvent, Message, Thread } from '@shared/types';
import { planAbsence, type AbsenceInput } from '@/lib/absence';
import { newId } from '@/lib/id';
import { useMessagesStore } from './messages';
import { useTimetableStore } from './timetable';

/**
 * Cross-store actions. The decisions (who is told, which events, the wording) are made by
 * the pure `planAbsence` in `@/lib/absence`; this file only applies the result.
 */

/**
 * Creates the AbsenceRecord, the calendar events (kind 'absence') and an absence-notice
 * message in the thread of every affected teacher. Whole day → all teachers with a class
 * that day plus the contact teacher.
 */
export function reportAbsence(input: AbsenceInput): AbsenceRecord {
  const { events } = useTimetableStore.getState();
  const { teachers } = useMessagesStore.getState();
  const plan = planAbsence(input, { events, teachers });

  const text = input.text?.trim();
  const record: AbsenceRecord = {
    id: newId(),
    dates: plan.dates,
    wholeDay: input.wholeDay,
    classEventIds: input.wholeDay ? [] : plan.coveredClassIds,
    reason: input.reason,
    ...(text ? { text } : {}),
    teacherIds: plan.teacherIds,
    createdAt: new Date().toISOString(),
    source: input.source,
  };

  const absenceEvents: CalendarEvent[] = plan.events.map((event) => ({
    ...event,
    id: newId(),
    absenceId: record.id,
  }));
  useTimetableStore.setState((s) => ({ events: [...s.events, ...absenceEvents] }));

  useMessagesStore.setState((s) => {
    const threads: Thread[] = [...s.threads];
    const notices: Message[] = plan.notices.map((notice) => {
      let thread = threads.find((t) => t.teacherId === notice.teacherId);
      if (!thread) {
        thread = { id: newId('th'), teacherId: notice.teacherId };
        threads.push(thread);
      }
      return {
        id: newId(),
        threadId: thread.id,
        from: 'student',
        text: notice.text,
        sentAt: record.createdAt,
        read: true,
        kind: 'absence',
        absenceId: record.id,
      };
    });
    return {
      threads,
      messages: [...s.messages, ...notices],
      absences: [...s.absences, record],
    };
  });

  return record;
}

/** Undoes `reportAbsence`: removes the record, its calendar events and its notices. */
export function removeAbsence(id: string): void {
  useTimetableStore.setState((s) => ({ events: s.events.filter((e) => e.absenceId !== id) }));
  useMessagesStore.setState((s) => ({
    messages: s.messages.filter((m) => m.absenceId !== id),
    absences: s.absences.filter((a) => a.id !== id),
  }));
}
