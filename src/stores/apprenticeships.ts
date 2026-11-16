import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Application, Listing } from '@shared/types';
import { SEED_SAVED_LISTING_IDS, buildSeedListings } from '@/data/seed/listings';
import { toISODate } from '@/lib/date';
import { newId } from '@/lib/id';
import { safeJSONStorage } from './persist';

export interface ApprenticeshipState {
  listings: Listing[];
  savedIds: string[];
  applications: Application[];

  toggleSaved: (id: string) => void;
  submitApplication: (application: Omit<Application, 'id' | 'submittedAt'>) => Application;
  /**
   * Re-dates the listings when every deadline has passed, so a demo opened months later
   * still has open listings. Ids are kept, so saved listings and applications stay valid.
   * Runs automatically after hydration. Returns true when it refreshed them.
   */
  refreshListingsIfExpired: (now?: Date) => boolean;
  /** Back to the seed listings (used by "Tilbakestill demodata"). */
  reset: () => void;
}

function seedState(now: Date = new Date()) {
  return {
    listings: buildSeedListings(now),
    savedIds: [...SEED_SAVED_LISTING_IDS],
    applications: [] as Application[],
  };
}

export const useApprenticeshipStore = create<ApprenticeshipState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      toggleSaved: (id) =>
        set((s) => ({
          savedIds: s.savedIds.includes(id)
            ? s.savedIds.filter((saved) => saved !== id)
            : [...s.savedIds, id],
        })),
      submitApplication: (application) => {
        const created: Application = {
          ...application,
          id: newId(),
          submittedAt: new Date().toISOString(),
        };
        set((s) => ({ applications: [...s.applications, created] }));
        return created;
      },
      refreshListingsIfExpired: (now = new Date()) => {
        const today = toISODate(now);
        const { listings } = get();
        if (listings.length === 0 || listings.some((l) => l.deadline >= today)) return false;
        set({ listings: buildSeedListings(now) });
        return true;
      },
      reset: () => set(seedState()),
    }),
    {
      name: 'kompass:apprenticeships',
      version: 1,
      storage: safeJSONStorage<ApprenticeshipState>(),
      onRehydrateStorage: () => (state) => {
        state?.refreshListingsIfExpired();
      },
    },
  ),
);

// ---------------------------------------------------------------- selectors

const byDeadline = (a: Listing, b: Listing) => a.deadline.localeCompare(b.deadline);

/** Saved listings, the nearest deadline first. */
export function savedListings(listings: Listing[], savedIds: string[]): Listing[] {
  return listings.filter((l) => savedIds.includes(l.id)).sort(byDeadline);
}

export function useSavedListings(): Listing[] {
  const listings = useApprenticeshipStore((s) => s.listings);
  const savedIds = useApprenticeshipStore((s) => s.savedIds);
  return useMemo(() => savedListings(listings, savedIds), [listings, savedIds]);
}

export function useListing(id: string | undefined): Listing | undefined {
  return useApprenticeshipStore((s) => (id ? s.listings.find((l) => l.id === id) : undefined));
}

export function useIsSaved(id: string | undefined): boolean {
  return useApprenticeshipStore((s) => (id ? s.savedIds.includes(id) : false));
}

/** The latest application sent for a listing, if any. */
export function useApplicationFor(listingId: string | undefined): Application | undefined {
  return useApprenticeshipStore((s) =>
    listingId ? s.applications.findLast((a) => a.listingId === listingId) : undefined,
  );
}
