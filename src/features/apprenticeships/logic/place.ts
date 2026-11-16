import type { Listing } from '@shared/types';

/** "Lillestrøm, Akershus", or just "Oslo" when the town and the county are the same. */
export function placeLabel(listing: Pick<Listing, 'location' | 'county'>): string {
  const town = listing.location.trim();
  const county = listing.county.trim();
  if (!county || town.toLowerCase() === county.toLowerCase()) return town;
  if (!town) return county;
  return `${town}, ${county}`;
}
