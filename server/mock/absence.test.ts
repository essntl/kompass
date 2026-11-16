import { describe, expect, it } from 'vitest';
import type { AbsenceDetectRequest } from '../../shared/api';
import { finalizeDetection } from '../lib/absence';
import { detectAbsenceHeuristic, extractDates } from './absence';

// Monday 16 November 2026.
const TODAY = '2026-11-16';

const upcomingClasses: AbsenceDetectRequest['upcomingClasses'] = [
  { eventId: 'mon-1', date: '2026-11-16', subject: 'Norsk', start: '08:15', end: '09:45' },
  { eventId: 'mon-2', date: '2026-11-16', subject: 'Produksjon og tjenester', start: '10:00', end: '13:30' },
  { eventId: 'tue-1', date: '2026-11-17', subject: 'Matematikk', start: '08:15', end: '09:45' },
  { eventId: 'tue-2', date: '2026-11-17', subject: 'Norsk', start: '10:00', end: '11:30' },
  { eventId: 'tue-3', date: '2026-11-17', subject: 'Kroppsøving', start: '12:15', end: '13:45' },
  { eventId: 'wed-1', date: '2026-11-18', subject: 'Engelsk', start: '08:15', end: '09:45' },
  { eventId: 'thu-1', date: '2026-11-19', subject: 'Yrkesfaglig fordypning', start: '08:00', end: '14:00' },
  { eventId: 'fri-1', date: '2026-11-20', subject: 'Matematikk', start: '08:15', end: '09:45' },
  { eventId: 'fri-2', date: '2026-11-20', subject: 'Naturfag', start: '10:00', end: '11:30' },
];

function detect(message: string) {
  const request: AbsenceDetectRequest = { message, today: TODAY, upcomingClasses };
  return finalizeDetection(detectAbsenceHeuristic(request), request, true);
}

describe('mock absence heuristic – absence notices', () => {
  it('detects illness today as a whole-day absence', () => {
    expect(detect('Hei! Jeg er syk i dag og kommer ikke på skolen.')).toEqual({
      isAbsence: true,
      dates: ['2026-11-16'],
      classes: [],
      classEventIds: [],
      wholeDay: true,
      reason: 'sykdom',
      reasonText: 'Syk',
      mock: true,
    });
  });

  it('defaults to today when no day is mentioned', () => {
    const result = detect('Har fått omgangssyke, blir hjemme.');
    expect(result).toMatchObject({ isAbsence: true, dates: [TODAY], wholeDay: true, reason: 'sykdom' });
  });

  it('accepts a very short note', () => {
    expect(detect('Syk i dag')).toMatchObject({ isAbsence: true, dates: [TODAY], reason: 'sykdom' });
  });

  it('resolves "i morgen" and matches a named class', () => {
    const result = detect('Jeg har tannlegetime i morgen og rekker ikke norsktimen.');
    expect(result).toMatchObject({
      isAbsence: true,
      dates: ['2026-11-17'],
      classes: ['Norsk'],
      classEventIds: ['tue-2'],
      wholeDay: false,
      reason: 'lege_tannlege',
      reasonText: 'Tannlegetime',
    });
  });

  it('understands everyday subject names such as "matte" and "gym"', () => {
    expect(detect('Kommer ikke i matte i morgen, skal til legen.')).toMatchObject({
      classes: ['Matematikk'],
      classEventIds: ['tue-1'],
      reason: 'lege_tannlege',
      reasonText: 'Legetime',
    });
    expect(detect('Jeg kan ikke være med i gymmen i morgen.')).toMatchObject({
      isAbsence: true,
      classes: ['Kroppsøving'],
      classEventIds: ['tue-3'],
    });
  });

  it('resolves weekday names to the next such day', () => {
    expect(detect('Jeg kommer ikke på fredag, skal i begravelse.')).toMatchObject({
      isAbsence: true,
      dates: ['2026-11-20'],
      wholeDay: true,
      reason: 'familie',
      reasonText: 'Begravelse',
    });
    // Said on a Monday, "på mandag" means next Monday.
    expect(detect('Jeg kan ikke komme på mandag.').dates).toEqual(['2026-11-23']);
  });

  it('handles several days and ranges', () => {
    expect(detect('Jeg blir borte onsdag og torsdag.').dates).toEqual(['2026-11-18', '2026-11-19']);
    expect(detect('Er syk og blir hjemme i dag til og med onsdag.').dates).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
    ]);
    expect(detect('Jeg har influensa og blir hjemme resten av uka.').dates).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
    ]);
  });

  it('maps "første time" to the first class that day', () => {
    expect(detect('Forsov meg, rekker ikke første time.')).toMatchObject({
      isAbsence: true,
      dates: [TODAY],
      classes: ['Norsk'],
      classEventIds: ['mon-1'],
      wholeDay: false,
      reason: 'annet',
      reasonText: 'Forsovet',
    });
  });

  it('recognises transport problems', () => {
    expect(detect('Bussen er innstilt, så jeg kommer meg ikke til skolen i dag.')).toMatchObject({
      isAbsence: true,
      reason: 'transport',
      reasonText: 'Problemer med transport',
    });
  });

  it('copes with filler words and no reason', () => {
    expect(detect('Kommer nok dessverre ikke i morgen.')).toMatchObject({
      isAbsence: true,
      dates: ['2026-11-17'],
      wholeDay: true,
      reason: 'annet',
      reasonText: null,
    });
  });
});

describe('mock absence heuristic – ordinary messages', () => {
  const ordinary = [
    'Hei! Når er fristen for å levere norskoppgaven?',
    'Kan du sende meg oppgaven vi fikk i matte i dag?',
    'Jeg kommer litt før timen i morgen for å spørre om noe.',
    'Jeg var syk forrige uke, hva gikk jeg glipp av?',
    'Hva skjer hvis jeg blir syk på prøvedagen?',
    'Hvor mye fravær kan jeg ha før jeg mister karakteren?',
    'Jeg er frisk igjen og kommer i morgen.',
    'Takk for hjelpen i dag!',
    'Jeg kommer ikke til å bli ferdig med rapporten til fredag. Kan jeg få utsatt frist?',
    'Boka mi er borte, har du en ekstra?',
    'Fikk dårlig karakter på prøven, kan vi snakke om det?',
    'Vi lærte om influensa i naturfag, veldig spennende.',
    'Er det prøve i engelsk på onsdag?',
  ];

  for (const message of ordinary) {
    it(`does not flag: ${message}`, () => {
      expect(detect(message)).toEqual({
        isAbsence: false,
        dates: [],
        classes: [],
        classEventIds: [],
        wholeDay: false,
        reason: null,
        reasonText: null,
        mock: true,
      });
    });
  }
});

describe('extractDates', () => {
  it('reads explicit dates', () => {
    expect(extractDates('jeg er borte 19. november', TODAY)).toEqual(['2026-11-19']);
    expect(extractDates('borte 20.11 og 23/11', TODAY)).toEqual(['2026-11-20', '2026-11-23']);
  });

  it('does not mistake a clock time for a date', () => {
    expect(extractDates('har time kl. 10.15 i morgen', TODAY)).toEqual(['2026-11-17']);
  });
});

describe('finalizeDetection', () => {
  const request: AbsenceDetectRequest = { message: 'x', today: TODAY, upcomingClasses };

  it('clamps what the model returns', () => {
    const result = finalizeDetection(
      {
        isAbsence: true,
        dates: ['2026-11-17', 'i morgen', '2026-13-45', '2031-01-01', '2026-11-17'],
        classes: ['norsk', 'Historie'],
        wholeDay: false,
        reason: 'ferie',
        reasonText: '  Skal til tannlegen  ',
      },
      request,
      false,
    );
    expect(result).toEqual({
      isAbsence: true,
      dates: ['2026-11-17'],
      classes: ['Norsk', 'Historie'],
      classEventIds: ['tue-2'],
      wholeDay: false,
      reason: 'annet',
      reasonText: 'Skal til tannlegen',
      mock: false,
    });
  });

  it('falls back to today and whole day when the model gives no usable details', () => {
    const result = finalizeDetection(
      { isAbsence: true, dates: [], classes: [], wholeDay: false, reason: 'sykdom', reasonText: null },
      request,
      false,
    );
    expect(result).toMatchObject({ dates: [TODAY], wholeDay: true, classes: [], classEventIds: [], reason: 'sykdom' });
  });

  it('empties every field when it is not an absence', () => {
    const result = finalizeDetection(
      { isAbsence: false, dates: ['2026-11-17'], classes: ['Norsk'], wholeDay: true, reason: 'sykdom', reasonText: 'Syk' },
      request,
      false,
    );
    expect(result).toEqual({
      isAbsence: false,
      dates: [],
      classes: [],
      classEventIds: [],
      wholeDay: false,
      reason: null,
      reasonText: null,
      mock: false,
    });
  });
});
