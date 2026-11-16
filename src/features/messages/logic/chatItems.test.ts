import { describe, expect, it } from 'vitest';
import type { Message } from '@shared/types';
import { buildChatItems, dayLabel, type MessageItem } from './chatItems';

let counter = 0;
function msg(from: Message['from'], sentAt: Date, patch: Partial<Message> = {}): Message {
  counter += 1;
  return {
    id: `m${counter}`,
    threadId: 'th',
    from,
    text: 'Hei',
    sentAt: sentAt.toISOString(),
    read: true,
    kind: 'text',
    ...patch,
  };
}

const now = new Date(2026, 10, 16, 15, 0);
const at = (day: number, hours: number, minutes: number) => new Date(2026, 10, day, hours, minutes);

describe('dayLabel', () => {
  it('names today and yesterday, otherwise the long date', () => {
    expect(dayLabel('2026-11-16', now)).toBe('I dag');
    expect(dayLabel('2026-11-15', now)).toBe('I går');
    expect(dayLabel('2026-11-12', now)).toBe('Torsdag 12. november');
    expect(dayLabel('2025-11-12', now)).toBe('12. november 2025');
  });
});

describe('buildChatItems', () => {
  it('puts a separator before the first message of each day', () => {
    const items = buildChatItems(
      [msg('teacher', at(12, 10, 0)), msg('student', at(12, 11, 0)), msg('teacher', at(16, 9, 0))],
      now,
    );
    expect(items.map((item) => item.type)).toEqual(['day', 'message', 'message', 'day', 'message']);
    expect(items[0]).toMatchObject({ label: 'Torsdag 12. november' });
    expect(items[3]).toMatchObject({ label: 'I dag' });
  });

  it('groups consecutive messages from the same sender within five minutes', () => {
    const items = buildChatItems(
      [
        msg('student', at(16, 10, 0)),
        msg('student', at(16, 10, 2)),
        msg('student', at(16, 10, 20)),
        msg('teacher', at(16, 10, 21)),
      ],
      now,
    ).filter((item): item is MessageItem => item.type === 'message');
    expect(items.map((i) => [i.firstInGroup, i.lastInGroup])).toEqual([
      [true, false],
      [false, true],
      [true, true],
      [true, true],
    ]);
  });

  it('never merges an absence notice with text bubbles', () => {
    const items = buildChatItems(
      [
        msg('student', at(16, 10, 0)),
        msg('student', at(16, 10, 0), { kind: 'absence', absenceId: 'a' }),
      ],
      now,
    ).filter((item): item is MessageItem => item.type === 'message');
    expect(items.every((i) => i.firstInGroup && i.lastInGroup)).toBe(true);
  });

  it('handles an empty thread', () => {
    expect(buildChatItems([], now)).toEqual([]);
  });
});
