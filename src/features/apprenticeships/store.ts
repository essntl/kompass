import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/stores/persist';
import { DEFAULT_FILTERS, type ListingFilters } from './logic/filters';

/**
 * Feature-local UI state for Lærlingplass.
 *  - `filters` live in memory only, so they survive opening a listing and coming back.
 *  - `drafts` (one unfinished application per listing) and `saveHintShown` are persisted,
 *    so closing the apply sheet – or the app – never throws away a half-written text.
 */

export type ApplyStep = 'entries' | 'text' | 'review';

export interface ApplyDraft {
  entryIds: string[];
  text: string;
  step: ApplyStep;
  /** True when the current text started as an AI draft that came from mock mode. */
  mock?: boolean;
}

export const EMPTY_DRAFT: ApplyDraft = { entryIds: [], text: '', step: 'entries' };

export interface ApprenticeshipUiState {
  filters: ListingFilters;
  drafts: Record<string, ApplyDraft>;
  /** The first save shows a toast explaining where the deadline shows up. */
  saveHintShown: boolean;

  setFilters: (patch: Partial<ListingFilters>) => void;
  /** Clears every narrowing filter and the search; keeps the sort order. */
  resetFilters: () => void;
  updateDraft: (listingId: string, patch: Partial<ApplyDraft>) => void;
  clearDraft: (listingId: string) => void;
  markSaveHintShown: () => void;
}

export const useApprenticeshipUi = create<ApprenticeshipUiState>()(
  persist(
    (set) => ({
      filters: DEFAULT_FILTERS,
      drafts: {},
      saveHintShown: false,

      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set((s) => ({ filters: { ...DEFAULT_FILTERS, sort: s.filters.sort } })),
      updateDraft: (listingId, patch) =>
        set((s) => ({
          drafts: { ...s.drafts, [listingId]: { ...EMPTY_DRAFT, ...s.drafts[listingId], ...patch } },
        })),
      clearDraft: (listingId) =>
        set((s) => {
          if (!(listingId in s.drafts)) return s;
          const drafts = { ...s.drafts };
          delete drafts[listingId];
          return { drafts };
        }),
      markSaveHintShown: () => set({ saveHintShown: true }),
    }),
    {
      name: 'kompass:apprenticeships-ui',
      version: 1,
      storage: safeJSONStorage<Pick<ApprenticeshipUiState, 'drafts' | 'saveHintShown'>>(),
      partialize: (s) => ({ drafts: s.drafts, saveHintShown: s.saveHintShown }),
    },
  ),
);

export function useDraft(listingId: string | undefined): ApplyDraft {
  return useApprenticeshipUi((s) => (listingId ? s.drafts[listingId] : undefined) ?? EMPTY_DRAFT);
}
