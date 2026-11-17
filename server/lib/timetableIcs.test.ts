import { describe, expect, it } from 'vitest';
import { parseIcs } from '../../src/features/timetable/logic/parseIcs';
import { buildTimetableIcs, escapeText, foldLine, lessonUid, type IcsLesson } from './timetableIcs';

const NOW = new Date('2026-11-16T10:00:00Z');

const lesson = (overrides: Partial<IcsLesson> = {}): IcsLesson => ({
  weekday: 0,
  start: '08:15',
  end: '09:45',
  subject: 'Norsk',
  room: 'B214',
  teacher: 'Ingrid Solheim',
  address: null,
  ...overrides,
});

const LESSONS: IcsLesson[] = [
  lesson(),
  lesson({ weekday: 1, start: '09:55', end: '11:25', subject: 'Engelsk', room: 'B216' }),
  lesson({
    weekday: 3,
    start: '10:30',
    end: '15:00',
    subject: 'Yrkesfaglig fordypning',
    room: null,
    teacher: 'Morten Aasen',
    address: 'Dronning Margretes vei 15, Oslo',
  }),
  lesson({ weekday: 4, start: '12:10', end: '12:55', subject: 'Matematikk 1P-Y', teacher: null }),
];

/** Unfolds and splits into logical lines. */
const logicalLines = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n');

describe('escapeText', () => {
  it('escapes backslashes, semicolons, commas and newlines', () => {
    expect(escapeText('a\\b;c,d\ne\r\nf')).toBe('a\\\\b\\;c\\,d\\ne\\nf');
  });
});

describe('foldLine', () => {
  it('keeps short lines as they are', () => {
    expect(foldLine('SUMMARY:Norsk')).toBe('SUMMARY:Norsk');
  });

  it('folds at 75 octets without splitting multi-byte characters', () => {
    const line = `DESCRIPTION:${'æøå'.repeat(40)}`;
    const folded = foldLine(line);
    const physical = folded.split('\r\n');
    expect(physical.length).toBeGreaterThan(1);
    for (const part of physical) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(physical.slice(1).every((part) => part.startsWith(' '))).toBe(true);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });
});

describe('buildTimetableIcs', () => {
  const ics = buildTimetableIcs({ lessons: LESSONS, weekStart: '2026-11-16', repeatsUntil: '2027-06-20', now: NOW });
  const lines = logicalLines(ics);

  it('writes one VEVENT per lesson in a valid VCALENDAR with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(4);
    expect(lines).toContain('TZID:Europe/Oslo');
    expect(lines).toContain('DTSTAMP:20261116T100000Z');
  });

  it('uses Oslo wall time, weekly repetition, the address as LOCATION and the teacher in DESCRIPTION', () => {
    expect(lines).toContain('DTSTART;TZID=Europe/Oslo:20261119T103000');
    expect(lines).toContain('DTEND;TZID=Europe/Oslo:20261119T150000');
    expect(lines).toContain('RRULE:FREQ=WEEKLY;UNTIL=20270620T215959Z');
    expect(lines).toContain('LOCATION:Dronning Margretes vei 15\\, Oslo');
    expect(lines).toContain('DESCRIPTION:Lærer: Morten Aasen');
    // No teacher → no DESCRIPTION for that lesson.
    expect(lines.filter((line) => line.startsWith('DESCRIPTION:'))).toHaveLength(3);
  });

  it('writes no RRULE when the lessons do not repeat', () => {
    const single = buildTimetableIcs({ lessons: LESSONS, weekStart: '2026-11-16', repeatsUntil: null, now: NOW });
    expect(single).not.toContain('RRULE:FREQ=WEEKLY');
  });

  it('gives stable, distinct UIDs', () => {
    const again = buildTimetableIcs({ lessons: LESSONS, weekStart: '2026-11-16', repeatsUntil: '2027-06-20', now: NOW });
    expect(again).toBe(ics);
    const uids = lines.filter((line) => line.startsWith('UID:'));
    expect(new Set(uids).size).toBe(4);
    expect(lessonUid(LESSONS[0]!)).toBe(lessonUid({ ...LESSONS[0]! }));
  });

  it('round-trips through the client parser on the expected weekdays', () => {
    const parsed = parseIcs(ics, { now: NOW });
    expect(parsed.skipped).toEqual([]);
    expect(parsed.calendarName).toBe('Timeplan fra PDF');

    const firstWeek = parsed.events.filter((event) => event.start < '2026-11-23');
    expect(firstWeek.map((event) => [event.title, event.start, event.end, event.room])).toEqual([
      ['Norsk', '2026-11-16T08:15', '2026-11-16T09:45', 'B214'],
      ['Engelsk', '2026-11-17T09:55', '2026-11-17T11:25', 'B216'],
      ['Yrkesfaglig fordypning', '2026-11-19T10:30', '2026-11-19T15:00', 'Dronning Margretes vei 15, Oslo'],
      ['Matematikk 1P-Y', '2026-11-20T12:10', '2026-11-20T12:55', 'B214'],
    ]);
    expect(firstWeek.every((event) => event.kind === 'class' && event.source === 'ics')).toBe(true);
    expect(firstWeek[0]?.note).toBe('Lærer: Ingrid Solheim');

    // Weekly through the import window (26 weeks ahead of 16 Nov ends mid-May).
    const norsk = parsed.events.filter((event) => event.title === 'Norsk');
    expect(norsk.length).toBe(27);
    expect(norsk.every((event) => event.start.endsWith('T08:15'))).toBe(true);
    // Summer time does not shift the wall time.
    expect(norsk.some((event) => event.start.startsWith('2027-04-'))).toBe(true);
  });

  it('round-trips the last occurrence up to 20 June', () => {
    const parsed = parseIcs(ics, { now: new Date('2027-06-01T10:00:00Z') });
    const lastNorsk = parsed.events.filter((event) => event.title === 'Norsk').at(-1);
    expect(lastNorsk?.start).toBe('2027-06-14T08:15');
    const lastYff = parsed.events.filter((event) => event.title === 'Yrkesfaglig fordypning').at(-1);
    expect(lastYff?.start).toBe('2027-06-17T10:30');
  });

  it('survives special characters and long text', () => {
    const odd = buildTimetableIcs({
      lessons: [lesson({ subject: 'Norsk; muntlig', room: 'Verksted 2, hall B \\ 3', teacher: 'Ærlig Østby-Åsen '.repeat(6).trim() })],
      weekStart: '2026-11-16',
      repeatsUntil: null,
      now: NOW,
    });
    const [event] = parseIcs(odd, { now: NOW }).events;
    // (The client parser strips trailing commas from summary words, so the comma is tested in the room.)
    expect(event?.title).toBe('Norsk; muntlig');
    expect(event?.room).toBe('Verksted 2, hall B \\ 3');
    expect(event?.note).toBe(`Lærer: ${'Ærlig Østby-Åsen '.repeat(6).trim()}`);
  });
});
