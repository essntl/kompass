import type { ISODate, Message } from '@shared/types';
import {
  daysUntil,
  formatDate,
  formatDayLong,
  minutesBetween,
  toDate,
  toISODate,
  type DateInput,
} from '@/lib/date';
import { capitalise } from './detection';

/**
 * Turns a thread's messages into what the chat renders: day separators and messages that
 * know their place in a group of consecutive messages from the same sender.
 */

export interface DayItem {
  type: 'day';
  key: string;
  date: ISODate;
  /** "I dag", "I går", "Torsdag 12. november" */
  label: string;
}

export interface MessageItem {
  type: 'message';
  key: string;
  message: Message;
  /** First / last bubble in a run from the same sender: decides corners and spacing. */
  firstInGroup: boolean;
  /** The timestamp is shown under the last bubble of a group. */
  lastInGroup: boolean;
}

export type ChatItem = DayItem | MessageItem;

/** Messages from the same sender within this many minutes read as one group. */
export const GROUP_GAP_MINUTES = 5;

export function dayLabel(date: DateInput, now: DateInput = new Date()): string {
  const diff = daysUntil(date, now);
  if (diff === 0) return 'I dag';
  if (diff === -1) return 'I går';
  if (diff === 1) return 'I morgen';
  const sameYear = toDate(date).getFullYear() === toDate(now).getFullYear();
  return capitalise(sameYear ? formatDayLong(date) : formatDate(date));
}

function sameGroup(a: Message, b: Message): boolean {
  return (
    a.from === b.from &&
    // An absence notice is a card of its own and never merges with text bubbles.
    a.kind === 'text' &&
    b.kind === 'text' &&
    toISODate(a.sentAt) === toISODate(b.sentAt) &&
    Math.abs(minutesBetween(a.sentAt, b.sentAt)) <= GROUP_GAP_MINUTES
  );
}

/** `messages` must be sorted oldest first (as `useThreadMessages` returns them). */
export function buildChatItems(messages: Message[], now: DateInput = new Date()): ChatItem[] {
  const items: ChatItem[] = [];
  messages.forEach((message, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const date = toISODate(message.sentAt);

    if (!previous || toISODate(previous.sentAt) !== date) {
      items.push({
        type: 'day',
        key: `day-${date}`,
        date,
        label: dayLabel(date, now),
      });
    }
    items.push({
      type: 'message',
      key: message.id,
      message,
      firstInGroup: !previous || !sameGroup(previous, message),
      lastInGroup: !next || !sameGroup(message, next),
    });
  });
  return items;
}
