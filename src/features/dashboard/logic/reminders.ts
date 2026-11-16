import type {
  AbsenceRecord,
  Application,
  CalendarEvent,
  Listing,
  Message,
  Reminder,
  Teacher,
  Thread,
} from '@shared/types';
import { describeAbsence } from '@/lib/absence';
import {
  daysUntil,
  formatDaysUntil,
  formatTime,
  formatTimestamp,
  relativeDay,
  toISODate,
  toLocalDateTime,
} from '@/lib/date';

/** Saved listings show up this many days before their deadline. */
export const DEADLINE_HORIZON_DAYS = 30;
/** Deadlines this close are styled as urgent. */
export const URGENT_DEADLINE_DAYS = 7;
/** Custom calendar events show up this many days ahead. */
export const EVENT_HORIZON_DAYS = 14;

export interface ReminderSources {
  listings: Listing[];
  savedIds: string[];
  /** Listings the student already applied to are left out. */
  applications: Application[];
  /** Timetable events (classes, absences, custom). */
  events: CalendarEvent[];
  threads: Thread[];
  teachers: Teacher[];
  messages: Message[];
  absences: AbsenceRecord[];
  now: Date;
}

/** Kind order for reminders that are due at the same moment. */
const KIND_ORDER: Record<Reminder['kind'], number> = { message: 0, absence: 1, deadline: 2, event: 3 };

function deadlineReminders({ listings, savedIds, applications, now }: ReminderSources): Reminder[] {
  const applied = new Set(applications.map((a) => a.listingId));
  return listings
    .filter((listing) => savedIds.includes(listing.id) && !applied.has(listing.id))
    .filter((listing) => {
      const days = daysUntil(listing.deadline, now);
      return days >= 0 && days <= DEADLINE_HORIZON_DAYS;
    })
    .map((listing) => ({
      id: `deadline-${listing.id}`,
      kind: 'deadline' as const,
      title: `Søknadsfrist: ${listing.company}`,
      detail: `${listing.trade} · ${listing.location}`,
      due: listing.deadline,
      href: `/laerlingplass/${listing.id}`,
    }));
}

function eventReminders({ events, now }: ReminderSources): Reminder[] {
  const nowLocal = toLocalDateTime(now);
  return events
    .filter((e) => e.kind === 'custom' && e.start > nowLocal)
    .filter((e) => daysUntil(e.start, now) <= EVENT_HORIZON_DAYS)
    .map((e) => ({
      id: `event-${e.id}`,
      kind: 'event' as const,
      title: e.title,
      ...(e.room || e.location ? { detail: e.room ?? e.location?.label } : {}),
      due: e.start,
      href: '/timeplan',
    }));
}

function messageReminders({ threads, teachers, messages }: ReminderSources): Reminder[] {
  const unreadByThread = new Map<string, Message[]>();
  for (const message of messages) {
    if (message.from !== 'teacher' || message.read) continue;
    const list = unreadByThread.get(message.threadId) ?? [];
    list.push(message);
    unreadByThread.set(message.threadId, list);
  }

  const reminders: Reminder[] = [];
  for (const [threadId, unread] of unreadByThread) {
    const thread = threads.find((t) => t.id === threadId);
    const teacher = thread ? teachers.find((t) => t.id === thread.teacherId) : undefined;
    const latest = unread.reduce((a, b) => (b.sentAt > a.sentAt ? b : a));
    const from = teacher?.name ?? 'læreren din';
    reminders.push({
      id: `message-${threadId}`,
      kind: 'message',
      title: unread.length === 1 ? `Ny melding fra ${from}` : `${unread.length} nye meldinger fra ${from}`,
      detail: latest.text.replace(/\s+/g, ' ').trim(),
      due: toLocalDateTime(latest.sentAt),
      href: `/meldinger/${threadId}`,
    });
  }
  return reminders;
}

function absenceReminders({ absences, events, now }: ReminderSources): Reminder[] {
  const today = toISODate(now);
  return absences.flatMap((record) => {
    const upcoming = [...record.dates].sort().filter((date) => date >= today);
    const first = upcoming[0];
    if (!first) return [];
    return [
      {
        id: `absence-${record.id}`,
        kind: 'absence' as const,
        title: 'Fravær meldt',
        detail: describeAbsence({ ...record, dates: upcoming }, events),
        due: first,
        href: '/meldinger',
      },
    ];
  });
}

/**
 * Everything the student should keep an eye on, derived from the stores:
 * unread messages (one per teacher), upcoming absences, saved listings with a deadline
 * within 30 days and custom calendar events within 14 days. Sorted by due time; unread
 * messages are in the past, so they come first.
 */
export function buildReminders(sources: ReminderSources): Reminder[] {
  return [
    ...messageReminders(sources),
    ...absenceReminders(sources),
    ...deadlineReminders(sources),
    ...eventReminders(sources),
  ].sort(
    (a, b) =>
      (a.due ?? '￿').localeCompare(b.due ?? '￿') ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.title.localeCompare(b.title, 'nb'),
  );
}

/** A deadline within `URGENT_DEADLINE_DAYS`. */
export function isUrgent(reminder: Reminder, now: Date): boolean {
  return (
    reminder.kind === 'deadline' &&
    !!reminder.due &&
    daysUntil(reminder.due, now) <= URGENT_DEADLINE_DAYS
  );
}

/** The short "when" label next to a reminder: "om 3 dager", "på onsdag kl. 18:00", "14:32". */
export function reminderWhen(reminder: Reminder, now: Date): string | null {
  const due = reminder.due;
  if (!due) return null;
  switch (reminder.kind) {
    case 'deadline':
      return formatDaysUntil(due, now);
    case 'event':
      return `${relativeDay(due, now)} kl. ${formatTime(due)}`;
    case 'message':
      return formatTimestamp(due, now);
    case 'absence':
      return relativeDay(due, now);
  }
}
