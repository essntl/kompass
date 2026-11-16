import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { IcsParseError, parseIcs, resolveTzid, subjectNameFromSummary } from './parseIcs';

/** Monday 16 November 2026, 11:00 in Oslo. */
const NOW = new Date('2026-11-16T10:00:00Z');

/** Builds a VCALENDAR with CRLF line endings, like real exports. */
function ics(body: string, header = ''): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kompass//Test//NO',
    ...header.split('\n').filter(Boolean),
    ...body
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

function vevent(props: string): string {
  return ['BEGIN:VEVENT', props.trim(), 'END:VEVENT'].join('\n');
}

const OSLO_VTIMEZONE = `
BEGIN:VTIMEZONE
TZID:Europe/Oslo
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE`;

const NEW_YORK_VTIMEZONE = `
BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE`;

describe('parseIcs – single events and time zones', () => {
  it('keeps TZID=Europe/Oslo times as written', () => {
    const text = ics(
      vevent(`
        UID:a@test
        DTSTART;TZID=Europe/Oslo:20261117T081500
        DTEND;TZID=Europe/Oslo:20261117T094500
        SUMMARY:Norsk
        LOCATION:B214
        DESCRIPTION:Ta med boka.
      `),
      OSLO_VTIMEZONE,
    );
    const { events, skipped } = parseIcs(text, { now: NOW });
    expect(skipped).toEqual([]);
    expect(events).toEqual([
      {
        kind: 'class',
        title: 'Norsk',
        start: '2026-11-17T08:15',
        end: '2026-11-17T09:45',
        room: 'B214',
        note: 'Ta med boka.',
        source: 'ics',
      },
    ]);
  });

  it('keeps TZID=Europe/Oslo even without a VTIMEZONE block', () => {
    const text = ics(
      vevent(`
        UID:b@test
        DTSTART;TZID=Europe/Oslo:20261117T081500
        DTEND;TZID=Europe/Oslo:20261117T094500
        SUMMARY:Norsk
      `),
    );
    const [event] = parseIcs(text, { now: NOW }).events;
    expect(event?.start).toBe('2026-11-17T08:15');
    expect(event?.end).toBe('2026-11-17T09:45');
  });

  it('converts UTC times to Oslo wall time in winter (+1) and summer (+2)', () => {
    const text = ics(
      [
        vevent(`
          UID:winter@test
          DTSTART:20261117T071500Z
          DTEND:20261117T084500Z
          SUMMARY:Matematikk
        `),
        vevent(`
          UID:summer@test
          DTSTART:20270415T061500Z
          DTEND:20270415T074500Z
          SUMMARY:Engelsk
        `),
      ].join('\n'),
    );
    const { events } = parseIcs(text, { now: NOW });
    expect(events.map((e) => [e.title, e.start, e.end])).toEqual([
      ['Matematikk', '2026-11-17T08:15', '2026-11-17T09:45'],
      ['Engelsk', '2027-04-15T08:15', '2027-04-15T09:45'],
    ]);
  });

  it('keeps floating times (no Z, no TZID) as written', () => {
    const text = ics(
      vevent(`
        UID:float@test
        DTSTART:20261118T121000
        DTEND:20261118T125500
        SUMMARY:Naturfag
      `),
    );
    const [event] = parseIcs(text, { now: NOW }).events;
    expect(event?.start).toBe('2026-11-18T12:10');
    expect(event?.end).toBe('2026-11-18T12:55');
  });

  it('converts another zone defined by a VTIMEZONE', () => {
    // 09:00 New York (EST, -5) = 14:00 UTC = 15:00 Oslo (CET).
    const text = ics(
      vevent(`
        UID:ny@test
        DTSTART;TZID=America/New_York:20261119T090000
        DTEND;TZID=America/New_York:20261119T100000
        SUMMARY:Nettmøte
      `),
      NEW_YORK_VTIMEZONE,
    );
    const [event] = parseIcs(text, { now: NOW }).events;
    expect(event?.start).toBe('2026-11-19T15:00');
    expect(event?.end).toBe('2026-11-19T16:00');
  });

  it('converts a known IANA zone without a VTIMEZONE through Intl', () => {
    // 08:00 London (GMT) = 09:00 Oslo.
    const text = ics(
      vevent(`
        UID:ldn@test
        DTSTART;TZID=Europe/London:20261119T080000
        DTEND;TZID=Europe/London:20261119T090000
        SUMMARY:Engelsk
      `),
    );
    const [event] = parseIcs(text, { now: NOW }).events;
    expect(event?.start).toBe('2026-11-19T09:00');
    expect(event?.end).toBe('2026-11-19T10:00');
  });

  it('maps Outlook zone names and prefixed TZIDs', () => {
    expect(resolveTzid('W. Europe Standard Time')).toBe('Europe/Oslo');
    expect(resolveTzid('/mozilla.org/20050126_1/Europe/Oslo')).toBe('Europe/Oslo');
    expect(resolveTzid('"Europe/Berlin"')).toBe('Europe/Berlin');
    expect(resolveTzid('Not/AZone')).toBeNull();
    expect(resolveTzid(undefined)).toBeNull();
  });

  it('gives a timed event without an end a 45 minute length', () => {
    const text = ics(
      vevent(`
        UID:noend@test
        DTSTART;TZID=Europe/Oslo:20261120T104500
        SUMMARY:Norsk
      `),
    );
    const [event] = parseIcs(text, { now: NOW }).events;
    expect(event?.start).toBe('2026-11-20T10:45');
    expect(event?.end).toBe('2026-11-20T11:30');
  });
});

describe('parseIcs – all-day events', () => {
  it('maps a one-day DATE event to 00:00–23:59 and treats DTEND as exclusive', () => {
    const text = ics(
      vevent(`
        UID:allday@test
        DTSTART;VALUE=DATE:20261120
        DTEND;VALUE=DATE:20261121
        SUMMARY:Planleggingsdag
      `),
    );
    const [event] = parseIcs(text, { now: NOW }).events;
    expect(event).toMatchObject({
      kind: 'custom',
      allDay: true,
      title: 'Planleggingsdag',
      start: '2026-11-20T00:00',
      end: '2026-11-20T23:59',
      source: 'ics',
    });
  });

  it('spans several days and handles a missing DTEND', () => {
    const text = ics(
      [
        vevent(`
          UID:trip@test
          DTSTART;VALUE=DATE:20261202
          DTEND;VALUE=DATE:20261205
          SUMMARY:Ekskursjon
        `),
        vevent(`
          UID:single@test
          DTSTART;VALUE=DATE:20261210
          SUMMARY:Heldagsprøve
        `),
      ].join('\n'),
    );
    const { events } = parseIcs(text, { now: NOW });
    expect(events.map((e) => [e.title, e.start, e.end])).toEqual([
      ['Ekskursjon', '2026-12-02T00:00', '2026-12-04T23:59'],
      ['Heldagsprøve', '2026-12-10T00:00', '2026-12-10T23:59'],
    ]);
  });
});

describe('parseIcs – recurrence', () => {
  const weekly = (extra = '') =>
    ics(
      vevent(`
        UID:weekly-norsk@test
        DTSTART;TZID=Europe/Oslo:20261102T134000
        DTEND;TZID=Europe/Oslo:20261102T142500
        RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=6
        EXDATE;TZID=Europe/Oslo:20261116T134000
        SUMMARY:Norsk
        LOCATION:B214
        ${extra}
      `),
      OSLO_VTIMEZONE,
    );

  it('expands a weekly RRULE and leaves out EXDATE', () => {
    const { events } = parseIcs(weekly(), { now: NOW });
    expect(events.map((e) => e.start)).toEqual([
      '2026-11-02T13:40',
      '2026-11-09T13:40',
      // 16 November is excluded
      '2026-11-23T13:40',
      '2026-11-30T13:40',
      '2026-12-07T13:40',
    ]);
    expect(events.every((e) => e.end.endsWith('14:25') && e.room === 'B214')).toBe(true);
  });

  it('applies RECURRENCE-ID overrides and cancelled occurrences', () => {
    const text = ics(
      [
        vevent(`
          UID:weekly-mat@test
          DTSTART;TZID=Europe/Oslo:20261116T120000
          DTEND;TZID=Europe/Oslo:20261116T133000
          RRULE:FREQ=WEEKLY;COUNT=3
          SUMMARY:Matematikk
          LOCATION:B214
        `),
        vevent(`
          UID:weekly-mat@test
          RECURRENCE-ID;TZID=Europe/Oslo:20261123T120000
          DTSTART;TZID=Europe/Oslo:20261123T100000
          DTEND;TZID=Europe/Oslo:20261123T113000
          SUMMARY:Matematikk
          LOCATION:Auditoriet
        `),
        vevent(`
          UID:weekly-mat@test
          RECURRENCE-ID;TZID=Europe/Oslo:20261130T120000
          DTSTART;TZID=Europe/Oslo:20261130T120000
          DTEND;TZID=Europe/Oslo:20261130T133000
          STATUS:CANCELLED
          SUMMARY:Matematikk
        `),
      ].join('\n'),
      OSLO_VTIMEZONE,
    );
    const { events } = parseIcs(text, { now: NOW });
    expect(events.map((e) => [e.start, e.room])).toEqual([
      ['2026-11-16T12:00', 'B214'],
      ['2026-11-23T10:00', 'Auditoriet'],
    ]);
  });

  it('keeps Oslo wall time across the DST change', () => {
    const text = ics(
      vevent(`
        UID:dst@test
        DTSTART;TZID=Europe/Oslo:20270322T081500
        DTEND;TZID=Europe/Oslo:20270322T091500
        RRULE:FREQ=WEEKLY;COUNT=2
        SUMMARY:Engelsk
      `),
      OSLO_VTIMEZONE,
    );
    const { events } = parseIcs(text, { now: NOW });
    expect(events.map((e) => e.start)).toEqual(['2027-03-22T08:15', '2027-03-29T08:15']);
  });

  it('clips an endless series to the window (4 weeks back, 26 weeks ahead)', () => {
    const text = ics(
      vevent(`
        UID:endless@test
        DTSTART;TZID=Europe/Oslo:20250901T081500
        DTEND;TZID=Europe/Oslo:20250901T111500
        RRULE:FREQ=WEEKLY;BYDAY=MO
        SUMMARY:Produksjon og tjenester
      `),
    );
    const result = parseIcs(text, { now: NOW });
    expect(result.window).toEqual({ from: '2026-10-19', to: '2027-05-17' });
    expect(result.events[0]?.start).toBe('2026-10-19T08:15');
    expect(result.events.at(-1)?.start).toBe('2027-05-17T08:15');
    expect(result.events).toHaveLength(31);
    expect(result.outsideWindow).toBeGreaterThan(0);
  });

  it('honours custom window options', () => {
    const result = parseIcs(weekly(), { now: NOW, weeksBack: 0, weeksAhead: 1 });
    expect(result.events.map((e) => e.start)).toEqual(['2026-11-23T13:40']);
  });

  it('expands a UTC series to the right Oslo times on both sides of DST', () => {
    const text = ics(
      vevent(`
        UID:utc-series@test
        DTSTART:20270322T071500Z
        DTEND:20270322T081500Z
        RRULE:FREQ=WEEKLY;COUNT=2
        SUMMARY:Naturfag
      `),
    );
    const { events } = parseIcs(text, { now: NOW });
    // A fixed UTC time moves one hour on the Oslo clock after the change.
    expect(events.map((e) => e.start)).toEqual(['2027-03-22T08:15', '2027-03-29T09:15']);
  });
});

describe('parseIcs – skipped entries and errors', () => {
  it('reports cancelled, end-before-start and broken entries without failing the file', () => {
    const text = ics(
      [
        vevent(`
          UID:ok@test
          DTSTART;TZID=Europe/Oslo:20261117T081500
          DTEND;TZID=Europe/Oslo:20261117T094500
          SUMMARY:Norsk
        `),
        vevent(`
          UID:cancelled@test
          DTSTART;TZID=Europe/Oslo:20261118T081500
          DTEND;TZID=Europe/Oslo:20261118T094500
          STATUS:CANCELLED
          SUMMARY:Kroppsøving
        `),
        vevent(`
          UID:backwards@test
          DTSTART;TZID=Europe/Oslo:20261119T100000
          DTEND;TZID=Europe/Oslo:20261119T090000
          SUMMARY:Engelsk
        `),
        vevent(`
          UID:nostart@test
          SUMMARY:Matematikk
        `),
      ].join('\n'),
    );
    const { events, skipped } = parseIcs(text, { now: NOW });
    expect(events.map((e) => e.title)).toEqual(['Norsk']);
    expect(skipped).toEqual([
      { title: 'Matematikk', reason: 'Mangler gyldig starttid' },
      { title: 'Kroppsøving', reason: 'Avlyst' },
      { title: 'Engelsk', reason: 'Slutter før den starter' },
    ]);
  });

  it('counts events outside the window instead of importing them', () => {
    const text = ics(
      vevent(`
        UID:old@test
        DTSTART;TZID=Europe/Oslo:20250115T081500
        DTEND;TZID=Europe/Oslo:20250115T094500
        SUMMARY:Norsk
      `),
    );
    const result = parseIcs(text, { now: NOW });
    expect(result.events).toEqual([]);
    expect(result.outsideWindow).toBe(1);
  });

  it('drops exact duplicates', () => {
    const one = vevent(`
      UID:dup-1@test
      DTSTART;TZID=Europe/Oslo:20261117T081500
      DTEND;TZID=Europe/Oslo:20261117T094500
      SUMMARY:Norsk
    `);
    const two = one.replace('dup-1', 'dup-2');
    expect(parseIcs(ics(`${one}\n${two}`), { now: NOW }).events).toHaveLength(1);
  });

  it('returns no events for an empty calendar', () => {
    const result = parseIcs(ics(''), { now: NOW });
    expect(result.events).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it('throws a Norwegian IcsParseError for empty, non-calendar and broken input', () => {
    expect(() => parseIcs('')).toThrow(IcsParseError);
    expect(() => parseIcs('   ')).toThrow('Filen er tom.');
    expect(() => parseIcs('Hei, dette er en tekstfil.')).toThrow(/ikke ut som en kalenderfil/);
    expect(() => parseIcs('BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;;;:\r\n')).toThrow(IcsParseError);
    expect(() => parseIcs('<html><body>BEGIN:VCALENDAR</body></html>')).toThrow(IcsParseError);
  });

  it('tolerates a BOM and LF line endings', () => {
    const text =
      '﻿' +
      ics(
        vevent(`
          UID:bom@test
          DTSTART;TZID=Europe/Oslo:20261117T081500
          DTEND;TZID=Europe/Oslo:20261117T094500
          SUMMARY:Norsk
        `),
      ).replace(/\r\n/g, '\n');
    expect(parseIcs(text, { now: NOW }).events).toHaveLength(1);
  });
});

describe('parseIcs – Visma-like export', () => {
  const VISMA = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Visma//InSchool Timetable Export//NO',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Timeplan 1TIA',
    'X-WR-TIMEZONE:Europe/Oslo',
    ...OSLO_VTIMEZONE.trim().split('\n'),
    'BEGIN:VEVENT',
    'UID:inschool-123456@visma.no',
    'DTSTAMP:20261110T120000Z',
    'DTSTART;TZID=Europe/Oslo:20261116T081500',
    'DTEND;TZID=Europe/Oslo:20261116T111500',
    'SUMMARY:TIF1001 Produksjon og tjenester 1TIA',
    'LOCATION:Verksted 2',
    'DESCRIPTION:Lærer: Hilde Bakken\\nGruppe: 1TIA',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:inschool-123457@visma.no',
    'DTSTAMP:20261110T120000Z',
    'DTSTART:20261116T110000Z',
    'DTEND:20261116T123000Z',
    'SUMMARY:MAT1019 Matematikk - 1TIA',
    'LOCATION:B214',
    'DESCRIPTION:Lærer: Amir Haddad',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:inschool-123458@visma.no',
    'DTSTAMP:20261110T120000Z',
    'DTSTART;TZID=Europe/Oslo:20261116T134000',
    'DTEND;TZID=Europe/Oslo:20261116T142500',
    'RRULE:FREQ=WEEKLY;UNTIL=20261207T225959Z',
    'SUMMARY:Norsk (NOR1206) 1TIA',
    'LOCATION:B214',
    // folded line, as Visma wraps long descriptions
    'DESCRIPTION:Lærer: Ingrid Solberg. Husk lesebok og notatblokk til hver ',
    ' time.',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const teachers = [
    { id: 't-hilde', name: 'Hilde Bakken' },
    { id: 't-amir', name: 'Amir Haddad' },
    { id: 't-ingrid', name: 'Ingrid Solberg' },
  ];
  const matchTeacher = (text: string) => teachers.find((t) => text.includes(t.name))?.id;

  it('maps summaries, rooms, descriptions and teachers', () => {
    const result = parseIcs(VISMA, { now: NOW, matchTeacher });
    expect(result.calendarName).toBe('Timeplan 1TIA');
    expect(result.skipped).toEqual([]);
    expect(result.events.map((e) => [e.title, e.start, e.end, e.room, e.teacherId])).toEqual([
      ['Produksjon og tjenester', '2026-11-16T08:15', '2026-11-16T11:15', 'Verksted 2', 't-hilde'],
      ['Matematikk', '2026-11-16T12:00', '2026-11-16T13:30', 'B214', 't-amir'],
      ['Norsk', '2026-11-16T13:40', '2026-11-16T14:25', 'B214', 't-ingrid'],
      ['Norsk', '2026-11-23T13:40', '2026-11-23T14:25', 'B214', 't-ingrid'],
      ['Norsk', '2026-11-30T13:40', '2026-11-30T14:25', 'B214', 't-ingrid'],
      ['Norsk', '2026-12-07T13:40', '2026-12-07T14:25', 'B214', 't-ingrid'],
    ]);
    expect(result.events[0]?.note).toBe('Lærer: Hilde Bakken\nGruppe: 1TIA');
    expect(result.events[2]?.note).toBe('Lærer: Ingrid Solberg. Husk lesebok og notatblokk til hver time.');
    expect(result.events.every((e) => e.source === 'ics' && e.kind === 'class')).toBe(true);
  });
});

describe('parseIcs – bundled sample file', () => {
  it('parses public/sample/eksempel-timeplan.ics into a full school week', () => {
    const text = readFileSync(
      fileURLToPath(new URL('../../../../public/sample/eksempel-timeplan.ics', import.meta.url)),
      'utf8',
    );
    const result = parseIcs(text, { now: NOW });
    expect(result.skipped).toEqual([]);
    const thisWeek = result.events.filter((e) => e.start >= '2026-11-16' && e.start < '2026-11-21');
    expect(thisWeek).toHaveLength(13);
    expect(new Set(thisWeek.map((e) => e.title))).toEqual(
      new Set([
        'Produksjon og tjenester',
        'Matematikk 1P-Y',
        'Norsk',
        'Engelsk',
        'Konstruksjons- og styringsteknikk',
        'Naturfag',
        'Kroppsøving',
        'Yrkesfaglig fordypning',
      ]),
    );
    // Christmas break is excluded.
    expect(result.events.some((e) => e.start.startsWith('2026-12-2'))).toBe(false);
    expect(result.events.find((e) => e.allDay)?.title).toBe('Planleggingsdag – ingen undervisning');
  });
});

describe('subjectNameFromSummary', () => {
  it.each([
    ['Norsk', 'Norsk'],
    ['NOR1206 Norsk 1TIA', 'Norsk'],
    ['Matematikk - 1TIA', 'Matematikk'],
    ['Norsk (NOR1206) 1TIA', 'Norsk'],
    ['  Produksjon   og tjenester ', 'Produksjon og tjenester'],
    ['TIF1001 - Produksjon og tjenester - 1TIA', 'Produksjon og tjenester'],
    ['Planleggingsdag – ingen undervisning', 'Planleggingsdag – ingen undervisning'],
    ['1TIA', '1TIA'],
    ['', ''],
  ])('%j → %j', (input, expected) => {
    expect(subjectNameFromSummary(input)).toBe(expected);
  });
});
