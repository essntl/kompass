import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PortfolioEntry } from '@shared/types';
import { buildSeedPortfolio } from '@/data/seed/portfolio';
import { newId } from '@/lib/id';
import { deletePhoto } from '@/lib/photos';
import { safeJSONStorage } from './persist';

export interface PortfolioState {
  entries: PortfolioEntry[];

  addEntry: (entry: Omit<PortfolioEntry, 'id' | 'createdAt'>) => PortfolioEntry;
  /** Replacing `photo` deletes the previous idb photo. */
  updateEntry: (id: string, patch: Partial<PortfolioEntry>) => void;
  /** Also deletes the entry's idb photo. */
  removeEntry: (id: string) => void;
  /** Back to the seed entries (used by "Tilbakestill demodata"). Does not touch IndexedDB. */
  reset: () => void;
}

/** Fire-and-forget: a failed delete only leaves an orphaned blob behind. */
const discardPhoto = (ref: string | undefined) => {
  void deletePhoto(ref).catch(() => undefined);
};

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      entries: buildSeedPortfolio(),

      addEntry: (entry) => {
        const created: PortfolioEntry = {
          ...entry,
          id: newId(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ entries: [created, ...s.entries] }));
        return created;
      },
      updateEntry: (id, patch) => {
        const current = get().entries.find((e) => e.id === id);
        if (!current) return;
        if ('photo' in patch && patch.photo !== current.photo) discardPhoto(current.photo);
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e)),
        }));
      },
      removeEntry: (id) => {
        const current = get().entries.find((e) => e.id === id);
        if (!current) return;
        discardPhoto(current.photo);
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      },
      reset: () => set({ entries: buildSeedPortfolio() }),
    }),
    { name: 'kompass:portfolio', version: 1, storage: safeJSONStorage<PortfolioState>() },
  ),
);

// ---------------------------------------------------------------- selectors

/** Newest work first; entries from the same day keep the order they were added in. */
export function sortEntries(entries: PortfolioEntry[]): PortfolioEntry[] {
  return [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}

export function useSortedEntries(): PortfolioEntry[] {
  const entries = usePortfolioStore((s) => s.entries);
  return useMemo(() => sortEntries(entries), [entries]);
}

export function usePortfolioEntry(id: string | undefined): PortfolioEntry | undefined {
  return usePortfolioStore((s) => (id ? s.entries.find((e) => e.id === id) : undefined));
}
