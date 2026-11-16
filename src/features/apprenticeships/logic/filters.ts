import type { Listing } from '@shared/types';
import { daysUntil } from '@/lib/date';

/**
 * Pure search, filter and sort for the listings page. Everything here is
 * deterministic given `now`, so it is unit tested in filters.test.ts.
 */

export type DeadlineBucket = 'week' | 'month' | 'all';
export type SortKey = 'deadline' | 'newest' | 'company';

export interface ListingFilters {
  query: string;
  programmes: string[];
  trades: string[];
  counties: string[];
  deadline: DeadlineBucket;
  savedOnly: boolean;
  sort: SortKey;
}

export const DEFAULT_FILTERS: ListingFilters = {
  query: '',
  programmes: [],
  trades: [],
  counties: [],
  deadline: 'all',
  savedOnly: false,
  sort: 'deadline',
};

export const DEADLINE_LABELS: Record<DeadlineBucket, string> = {
  week: 'Denne uken',
  month: 'Innen 30 dager',
  all: 'Alle',
};

export const SORT_LABELS: Record<SortKey, string> = {
  deadline: 'Frist først',
  newest: 'Nyeste',
  company: 'Bedrift A–Å',
};

const LOCALE = 'nb';
const MONTH_DAYS = 30;

// ---------------------------------------------------------------- search

/** Lower-cased search words; empty for a blank query. */
export function searchTokens(query: string): string[] {
  return query.toLocaleLowerCase(LOCALE).split(/\s+/).filter(Boolean);
}

/** Every word must appear in the company, title, trade, town or county. */
export function matchesQuery(listing: Listing, query: string): boolean {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return true;
  const haystack = [listing.company, listing.title, listing.trade, listing.location, listing.county]
    .join(' ')
    .toLocaleLowerCase(LOCALE);
  return tokens.every((token) => haystack.includes(token));
}

// ---------------------------------------------------------------- deadline buckets

/** Days left until Sunday of the current week (0 on a Sunday). */
function daysLeftInWeek(now: Date): number {
  const weekday = now.getDay(); // 0 = Sunday
  return weekday === 0 ? 0 : 7 - weekday;
}

/**
 * - `week`:  open and due by Sunday of the current week
 * - `month`: open and due within the next 30 days
 * - `all`:   everything, including listings whose deadline has passed
 */
export function inDeadlineBucket(listing: Listing, bucket: DeadlineBucket, now: Date): boolean {
  if (bucket === 'all') return true;
  const days = daysUntil(listing.deadline, now);
  if (days < 0) return false;
  return bucket === 'week' ? days <= daysLeftInWeek(now) : days <= MONTH_DAYS;
}

// ---------------------------------------------------------------- filter + sort

export interface FilterContext {
  savedIds: readonly string[];
  now: Date;
}

export function filterListings(
  listings: readonly Listing[],
  filters: ListingFilters,
  { savedIds, now }: FilterContext,
): Listing[] {
  return listings.filter(
    (listing) =>
      matchesQuery(listing, filters.query) &&
      (filters.programmes.length === 0 || filters.programmes.includes(listing.programme)) &&
      (filters.trades.length === 0 || filters.trades.includes(listing.trade)) &&
      (filters.counties.length === 0 || filters.counties.includes(listing.county)) &&
      inDeadlineBucket(listing, filters.deadline, now) &&
      (!filters.savedOnly || savedIds.includes(listing.id)),
  );
}

const byCompany = (a: Listing, b: Listing) => a.company.localeCompare(b.company, LOCALE);
const byDeadline = (a: Listing, b: Listing) => a.deadline.localeCompare(b.deadline);

/**
 * Sorts a copy. Listings whose deadline has passed always sink to the bottom, except in
 * A–Å order where the student is looking for a name.
 */
export function sortListings(listings: readonly Listing[], sort: SortKey, now: Date): Listing[] {
  const expired = (l: Listing) => (daysUntil(l.deadline, now) < 0 ? 1 : 0);
  return [...listings].sort((a, b) => {
    switch (sort) {
      case 'company':
        return byCompany(a, b) || byDeadline(a, b);
      case 'newest':
        return expired(a) - expired(b) || b.postedAt.localeCompare(a.postedAt) || byDeadline(a, b);
      case 'deadline':
      default:
        return expired(a) - expired(b) || byDeadline(a, b) || byCompany(a, b);
    }
  });
}

export function applyListingFilters(
  listings: readonly Listing[],
  filters: ListingFilters,
  context: FilterContext,
): Listing[] {
  return sortListings(filterListings(listings, filters, context), filters.sort, context.now);
}

// ---------------------------------------------------------------- facets and counts

export interface FacetOption {
  value: string;
  count: number;
}

/** Distinct values of one field with their counts, A–Å in Norwegian order. */
export function facetOptions(
  listings: readonly Listing[],
  field: 'programme' | 'trade' | 'county',
): FacetOption[] {
  const counts = new Map<string, number>();
  for (const listing of listings) counts.set(listing[field], (counts.get(listing[field]) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, LOCALE));
}

/** Trades to offer: all of them, or only those in the chosen programmes. */
export function tradeOptions(listings: readonly Listing[], programmes: readonly string[]): FacetOption[] {
  const scoped = programmes.length ? listings.filter((l) => programmes.includes(l.programme)) : listings;
  return facetOptions(scoped, 'trade');
}

/** Filters that narrow the list (search and sort are not counted). */
export function activeFilterCount(filters: ListingFilters): number {
  return (
    filters.programmes.length +
    filters.trades.length +
    filters.counties.length +
    (filters.deadline === 'all' ? 0 : 1) +
    (filters.savedOnly ? 1 : 0)
  );
}

export function hasActiveFilters(filters: ListingFilters): boolean {
  return activeFilterCount(filters) > 0 || searchTokens(filters.query).length > 0;
}

export type ActiveFilterChip =
  | { kind: 'programme' | 'trade' | 'county'; value: string; label: string }
  | { kind: 'deadline'; value: DeadlineBucket; label: string }
  | { kind: 'savedOnly'; value: 'true'; label: string };

/** One removable chip per active filter, in the order the filter panel shows them. */
export function activeFilterChips(filters: ListingFilters): ActiveFilterChip[] {
  return [
    ...filters.programmes.map((value) => ({ kind: 'programme' as const, value, label: value })),
    ...filters.trades.map((value) => ({ kind: 'trade' as const, value, label: value })),
    ...filters.counties.map((value) => ({ kind: 'county' as const, value, label: value })),
    ...(filters.deadline === 'all'
      ? []
      : [{ kind: 'deadline' as const, value: filters.deadline, label: `Frist: ${DEADLINE_LABELS[filters.deadline].toLocaleLowerCase(LOCALE)}` }]),
    ...(filters.savedOnly ? [{ kind: 'savedOnly' as const, value: 'true' as const, label: 'Kun lagrede' }] : []),
  ];
}

/** The filters with one chip removed. Removing a programme also drops its trades. */
export function removeFilterChip(
  filters: ListingFilters,
  chip: ActiveFilterChip,
  listings: readonly Listing[] = [],
): ListingFilters {
  switch (chip.kind) {
    case 'programme': {
      const programmes = filters.programmes.filter((p) => p !== chip.value);
      return { ...filters, programmes, trades: pruneTrades(filters.trades, programmes, listings) };
    }
    case 'trade':
      return { ...filters, trades: filters.trades.filter((t) => t !== chip.value) };
    case 'county':
      return { ...filters, counties: filters.counties.filter((c) => c !== chip.value) };
    case 'deadline':
      return { ...filters, deadline: 'all' };
    case 'savedOnly':
      return { ...filters, savedOnly: false };
  }
}

/** Keeps only trades that still belong to one of the chosen programmes. */
export function pruneTrades(
  trades: readonly string[],
  programmes: readonly string[],
  listings: readonly Listing[],
): string[] {
  if (programmes.length === 0 || listings.length === 0) return [...trades];
  const allowed = new Set(tradeOptions(listings, programmes).map((o) => o.value));
  return trades.filter((t) => allowed.has(t));
}

/** Adds or removes `value` from a multi-select list. */
export function toggleValue(values: readonly string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

/** "1 lærlingplass", "14 lærlingplasser" */
export function formatResultCount(count: number): string {
  return `${count} ${count === 1 ? 'lærlingplass' : 'lærlingplasser'}`;
}

/** "1 plass", "3 plasser" */
export function formatPositions(count: number): string {
  return `${count} ${count === 1 ? 'plass' : 'plasser'}`;
}
