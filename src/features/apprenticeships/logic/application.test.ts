import { describe, expect, it } from 'vitest';
import type { Listing, PortfolioEntry } from '@shared/types';
import {
  buildApplicationTextRequest,
  hasEnoughText,
  MAX_ATTACHED_ENTRIES,
  splitParagraphs,
  toggleEntry,
} from './application';

const listing = {
  id: 'l-x',
  company: 'Granbru Maskinering AS',
  trade: 'CNC-operatør',
  title: 'Lærling i CNC',
  summary: 'Kort om oss.',
  requirements: ['Vg2'],
} as Listing;

const entries: PortfolioEntry[] = [
  {
    id: 'pe-1',
    title: 'Sveiset brakett',
    note: 'MIG-sveis',
    date: '2026-10-01',
    tags: [],
    createdAt: '2026-10-01T10:00:00Z',
    competence: {
      summary: 'Sveiset en brakett.',
      whatWasDone: '',
      skills: ['MIG-sveising'],
      suggestedGoals: [],
      generatedAt: '2026-10-01T10:00:00Z',
      mock: true,
    },
  },
  { id: 'pe-2', title: 'Dreid aksel', note: 'Dreiebenk', date: '2026-09-01', tags: [], createdAt: '2026-09-01T10:00:00Z' },
];

describe('buildApplicationTextRequest', () => {
  it('passes the competence summary and skills when present', () => {
    const request = buildApplicationTextRequest(
      { name: 'Sara Nilsen', year: 'VG1', programme: 'Teknologi- og industrifag' },
      listing,
      entries,
    );
    expect(request.listing).toEqual({
      company: 'Granbru Maskinering AS',
      trade: 'CNC-operatør',
      title: 'Lærling i CNC',
      summary: 'Kort om oss.',
      requirements: ['Vg2'],
    });
    expect(request.entries[0]).toEqual({
      title: 'Sveiset brakett',
      note: 'MIG-sveis',
      date: '2026-10-01',
      summary: 'Sveiset en brakett.',
      skills: ['MIG-sveising'],
    });
    expect(request.entries[1]).toEqual({ title: 'Dreid aksel', note: 'Dreiebenk', date: '2026-09-01' });
  });
});

describe('splitParagraphs', () => {
  it('splits on blank lines and trims', () => {
    expect(splitParagraphs('Hei.\n\nJeg heter Sara.\r\n \r\nHilsen')).toEqual(['Hei.', 'Jeg heter Sara.', 'Hilsen']);
    expect(splitParagraphs('  \n\n ')).toEqual([]);
  });
});

describe('toggleEntry', () => {
  it('adds and removes, capped at the maximum', () => {
    expect(toggleEntry([], 'a')).toEqual(['a']);
    expect(toggleEntry(['a'], 'a')).toEqual([]);
    const full = Array.from({ length: MAX_ATTACHED_ENTRIES }, (_, i) => `e${i}`);
    expect(toggleEntry(full, 'new')).toEqual(full);
  });
});

describe('hasEnoughText', () => {
  it('needs a sentence or so', () => {
    expect(hasEnoughText('   hei   ')).toBe(false);
    expect(hasEnoughText('Jeg vil gjerne bli lærling hos dere.')).toBe(true);
  });
});
