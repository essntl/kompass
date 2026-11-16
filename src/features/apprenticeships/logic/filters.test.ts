import { describe, expect, it } from 'vitest';
import type { Listing } from '@shared/types';
import { deadlineStatus } from './deadline';
import {
  activeFilterChips,
  activeFilterCount,
  applyListingFilters,
  DEFAULT_FILTERS,
  facetOptions,
  filterListings,
  formatResultCount,
  inDeadlineBucket,
  matchesQuery,
  pruneTrades,
  removeFilterChip,
  sortListings,
  toggleValue,
  tradeOptions,
  type ListingFilters,
} from './filters';

// Monday 16 November 2026, noon local time.
const NOW = new Date(2026, 10, 16, 12, 0);

function listing(overrides: Partial<Listing> & Pick<Listing, 'id' | 'company'>): Listing {
  return {
    trade: 'Industrimekaniker',
    programme: 'Teknologi- og industrifag',
    title: 'Lærling',
    location: 'Oslo',
    county: 'Oslo',
    deadline: '2026-12-01',
    positions: 1,
    startDate: '2027-08-10',
    postedAt: '2026-11-01',
    summary: '',
    description: '',
    tasks: [],
    requirements: [],
    offers: [],
    contactName: 'Kari',
    contactRole: 'Leder',
    logo: { initials: 'XX', color: 1 },
    ...overrides,
  };
}

const LISTINGS: Listing[] = [
  listing({ id: 'a', company: 'Øvre Sveis AS', trade: 'Sveiser', location: 'Drammen', county: 'Buskerud', deadline: '2026-11-19', postedAt: '2026-10-20' }),
  listing({ id: 'b', company: 'Ankerverk AS', deadline: '2026-11-22', postedAt: '2026-11-10' }),
  listing({ id: 'c', company: 'Åsen Elektro AS', trade: 'Elektriker', programme: 'Elektro og datateknologi', deadline: '2026-12-10', postedAt: '2026-11-14' }),
  listing({ id: 'd', company: 'Bakeriet Zeta', trade: 'Baker', programme: 'Restaurant- og matfag', location: 'Bergen', county: 'Vestland', deadline: '2027-01-30', postedAt: '2026-11-15' }),
  listing({ id: 'e', company: 'Æra Bygg AS', trade: 'Tømrer', programme: 'Bygg- og anleggsteknikk', deadline: '2026-11-10', postedAt: '2026-09-01' }),
];

const ctx = { savedIds: ['b', 'd'], now: NOW };
const ids = (list: Listing[]) => list.map((l) => l.id);
const withFilters = (patch: Partial<ListingFilters>): ListingFilters => ({ ...DEFAULT_FILTERS, ...patch });

describe('matchesQuery', () => {
  it('matches company, title, trade and town case-insensitively', () => {
    expect(matchesQuery(LISTINGS[0]!, 'øvre')).toBe(true);
    expect(matchesQuery(LISTINGS[0]!, 'SVEISER')).toBe(true);
    expect(matchesQuery(LISTINGS[0]!, 'drammen')).toBe(true);
    expect(matchesQuery(LISTINGS[0]!, 'bergen')).toBe(false);
  });

  it('requires every word to match somewhere', () => {
    expect(matchesQuery(LISTINGS[0]!, 'sveis drammen')).toBe(true);
    expect(matchesQuery(LISTINGS[0]!, 'sveis oslo')).toBe(false);
  });

  it('treats a blank query as a match', () => {
    expect(matchesQuery(LISTINGS[0]!, '   ')).toBe(true);
  });
});

describe('inDeadlineBucket', () => {
  it('"week" covers open deadlines up to Sunday of this week', () => {
    // Sunday 22 November is the last day of the week.
    expect(inDeadlineBucket(LISTINGS[0]!, 'week', NOW)).toBe(true); // 19 Nov
    expect(inDeadlineBucket(LISTINGS[1]!, 'week', NOW)).toBe(true); // 22 Nov
    expect(inDeadlineBucket(LISTINGS[2]!, 'week', NOW)).toBe(false); // 10 Dec
  });

  it('"week" on a Sunday only covers that day', () => {
    const sunday = new Date(2026, 10, 22, 9, 0);
    expect(inDeadlineBucket(LISTINGS[1]!, 'week', sunday)).toBe(true);
    expect(inDeadlineBucket(listing({ id: 'x', company: 'X', deadline: '2026-11-23' }), 'week', sunday)).toBe(false);
  });

  it('"month" covers the next 30 days', () => {
    expect(inDeadlineBucket(LISTINGS[2]!, 'month', NOW)).toBe(true); // 24 days
    expect(inDeadlineBucket(listing({ id: 'x', company: 'X', deadline: '2026-12-16' }), 'month', NOW)).toBe(true); // 30 days
    expect(inDeadlineBucket(listing({ id: 'x', company: 'X', deadline: '2026-12-17' }), 'month', NOW)).toBe(false);
  });

  it('excludes passed deadlines from the narrow buckets but not from "all"', () => {
    expect(inDeadlineBucket(LISTINGS[4]!, 'week', NOW)).toBe(false);
    expect(inDeadlineBucket(LISTINGS[4]!, 'month', NOW)).toBe(false);
    expect(inDeadlineBucket(LISTINGS[4]!, 'all', NOW)).toBe(true);
  });

  it('keeps a deadline that is today open', () => {
    const today = listing({ id: 'x', company: 'X', deadline: '2026-11-16' });
    expect(inDeadlineBucket(today, 'week', NOW)).toBe(true);
  });
});

describe('filterListings', () => {
  it('returns everything with the default filters', () => {
    expect(filterListings(LISTINGS, DEFAULT_FILTERS, ctx)).toHaveLength(LISTINGS.length);
  });

  it('combines programme, county, deadline and search with AND', () => {
    const result = filterListings(
      LISTINGS,
      withFilters({ programmes: ['Teknologi- og industrifag'], counties: ['Oslo'], deadline: 'week' }),
      ctx,
    );
    expect(ids(result)).toEqual(['b']);
  });

  it('treats several values within one filter as OR', () => {
    const result = filterListings(LISTINGS, withFilters({ counties: ['Buskerud', 'Vestland'] }), ctx);
    expect(ids(result).sort()).toEqual(['a', 'd']);
  });

  it('filters on trade', () => {
    expect(ids(filterListings(LISTINGS, withFilters({ trades: ['Elektriker', 'Baker'] }), ctx)).sort()).toEqual(['c', 'd']);
  });

  it('shows only saved listings when asked', () => {
    expect(ids(filterListings(LISTINGS, withFilters({ savedOnly: true }), ctx)).sort()).toEqual(['b', 'd']);
  });

  it('can end up empty', () => {
    expect(filterListings(LISTINGS, withFilters({ query: 'sveis', savedOnly: true }), ctx)).toEqual([]);
  });
});

describe('sortListings', () => {
  it('"deadline" puts the nearest open deadline first and passed ones last', () => {
    expect(ids(sortListings(LISTINGS, 'deadline', NOW))).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('"newest" sorts by posting date, newest first, with passed deadlines last', () => {
    expect(ids(sortListings(LISTINGS, 'newest', NOW))).toEqual(['d', 'c', 'b', 'a', 'e']);
  });

  it('"company" uses Norwegian alphabetical order (Æ, Ø, Å after Z)', () => {
    expect(sortListings(LISTINGS, 'company', NOW).map((l) => l.company)).toEqual([
      'Ankerverk AS',
      'Bakeriet Zeta',
      'Æra Bygg AS',
      'Øvre Sveis AS',
      'Åsen Elektro AS',
    ]);
  });

  it('does not mutate the input', () => {
    const copy = [...LISTINGS];
    sortListings(LISTINGS, 'company', NOW);
    expect(LISTINGS).toEqual(copy);
  });
});

describe('applyListingFilters', () => {
  it('filters and sorts in one go', () => {
    const result = applyListingFilters(LISTINGS, withFilters({ counties: ['Oslo'], sort: 'company' }), ctx);
    expect(ids(result)).toEqual(['b', 'e', 'c']);
  });
});

describe('facets', () => {
  it('counts values and sorts them in Norwegian order', () => {
    expect(facetOptions(LISTINGS, 'county')).toEqual([
      { value: 'Buskerud', count: 1 },
      { value: 'Oslo', count: 3 },
      { value: 'Vestland', count: 1 },
    ]);
  });

  it('limits trades to the chosen programmes', () => {
    expect(tradeOptions(LISTINGS, ['Teknologi- og industrifag']).map((o) => o.value)).toEqual([
      'Industrimekaniker',
      'Sveiser',
    ]);
  });

  it('drops trades that no longer belong to a chosen programme', () => {
    expect(pruneTrades(['Sveiser', 'Baker'], ['Restaurant- og matfag'], LISTINGS)).toEqual(['Baker']);
    expect(pruneTrades(['Sveiser', 'Baker'], [], LISTINGS)).toEqual(['Sveiser', 'Baker']);
  });
});

describe('active filters', () => {
  const filters = withFilters({
    query: 'oslo',
    programmes: ['Teknologi- og industrifag'],
    trades: ['Sveiser'],
    counties: ['Oslo'],
    deadline: 'month',
    savedOnly: true,
    sort: 'company',
  });

  it('counts every narrowing filter but not search or sort', () => {
    expect(activeFilterCount(filters)).toBe(5);
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
  });

  it('builds one chip per filter', () => {
    expect(activeFilterChips(filters).map((c) => c.label)).toEqual([
      'Teknologi- og industrifag',
      'Sveiser',
      'Oslo',
      'Frist: innen 30 dager',
      'Kun lagrede',
    ]);
  });

  it('removes a chip, and a programme takes its trades with it', () => {
    const [programme, , , deadline, saved] = activeFilterChips(filters);
    const withoutProgramme = removeFilterChip(
      withFilters({ programmes: ['Teknologi- og industrifag', 'Restaurant- og matfag'], trades: ['Sveiser', 'Baker'] }),
      programme!,
      LISTINGS,
    );
    expect(withoutProgramme.programmes).toEqual(['Restaurant- og matfag']);
    expect(withoutProgramme.trades).toEqual(['Baker']);
    expect(removeFilterChip(filters, deadline!).deadline).toBe('all');
    expect(removeFilterChip(filters, saved!).savedOnly).toBe(false);
  });

  it('toggles values in a multi-select', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('labels', () => {
  it('pluralises the result count', () => {
    expect(formatResultCount(1)).toBe('1 lærlingplass');
    expect(formatResultCount(14)).toBe('14 lærlingplasser');
    expect(formatResultCount(0)).toBe('0 lærlingplasser');
  });

  it('describes deadline urgency', () => {
    expect(deadlineStatus('2026-11-19', NOW)).toEqual({ days: 3, tone: 'urgent', relative: 'om 3 dager' });
    expect(deadlineStatus('2026-11-23', NOW).tone).toBe('urgent');
    expect(deadlineStatus('2026-11-24', NOW).tone).toBe('normal');
    expect(deadlineStatus('2026-11-16', NOW).relative).toBe('i dag');
    expect(deadlineStatus('2026-11-15', NOW)).toMatchObject({ tone: 'expired', relative: 'Fristen har gått ut' });
  });
});
