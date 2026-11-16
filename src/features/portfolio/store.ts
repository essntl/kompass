import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApplicationTextRequest } from '@shared/api';
import type { ISOInstant } from '@shared/types';
import { isAbortError, isApiError, streamApplicationText } from '@/lib/api';
import { safeJSONStorage } from '@/stores/persist';
import { toggleSelection, type SubjectFilter } from './logic';

/**
 * Feature-local state for Portefølje.
 *  - view, filter and selection only live for the session, so "back" from an entry lands
 *    on the same view the student left;
 *  - the last application draft is persisted, so closing the sheet (or the app) never
 *    throws away a text the student has started editing.
 *
 * The stream runs here rather than in the sheet: closing the sheet mid-stream keeps it
 * going, and reopening shows the text where it has got to.
 */

export type PortfolioView = 'grid' | 'timeline';
export type DraftStatus = 'idle' | 'streaming' | 'done' | 'stopped' | 'error';

export interface ApplicationDraft {
  entryIds: string[];
  text: string;
  mock: boolean;
  createdAt: ISOInstant;
}

export interface PortfolioUiState {
  view: PortfolioView;
  filter: SubjectFilter;
  selecting: boolean;
  selectedIds: string[];

  draft: ApplicationDraft | null;
  status: DraftStatus;
  error: string | null;
  /** Last request, for "Lag på nytt" and "Prøv igjen". */
  lastRequest: ApplicationTextRequest | null;

  setView: (view: PortfolioView) => void;
  setFilter: (filter: SubjectFilter) => void;
  startSelecting: (preselect?: string[]) => void;
  stopSelecting: () => void;
  toggleSelected: (id: string) => void;
  setDraftText: (text: string) => void;
  generate: (request: ApplicationTextRequest, entryIds: string[]) => Promise<void>;
  regenerate: () => Promise<void>;
  stop: () => void;
}

let controller: AbortController | null = null;

const STREAM_FALLBACK_ERROR = 'Vi fikk ikke laget teksten. Prøv igjen om litt.';

export const usePortfolioUiStore = create<PortfolioUiState>()(
  persist(
    (set, get) => ({
      view: 'grid',
      filter: 'all',
      selecting: false,
      selectedIds: [],

      draft: null,
      status: 'idle',
      error: null,
      lastRequest: null,

      setView: (view) => set({ view }),
      setFilter: (filter) => set({ filter }),
      startSelecting: (preselect = []) => set({ selecting: true, selectedIds: preselect }),
      stopSelecting: () => set({ selecting: false, selectedIds: [] }),
      toggleSelected: (id) => set((s) => ({ selectedIds: toggleSelection(s.selectedIds, id) })),
      setDraftText: (text) =>
        set((s) => (s.draft ? { draft: { ...s.draft, text } } : s)),

      generate: async (request, entryIds) => {
        controller?.abort();
        const own = new AbortController();
        controller = own;
        set({
          status: 'streaming',
          error: null,
          lastRequest: request,
          draft: { entryIds, text: '', mock: false, createdAt: new Date().toISOString() },
        });
        try {
          const { mock } = await streamApplicationText(request, {
            signal: own.signal,
            onDelta: (delta) =>
              set((s) => (s.draft ? { draft: { ...s.draft, text: s.draft.text + delta } } : s)),
          });
          if (controller !== own) return;
          set((s) => ({
            status: 'done',
            draft: s.draft ? { ...s.draft, text: s.draft.text.trim(), mock } : s.draft,
          }));
        } catch (err) {
          if (controller !== own) return;
          if (isAbortError(err)) {
            set((s) => ({
              status: 'stopped',
              draft: s.draft ? { ...s.draft, text: s.draft.text.trim() } : s.draft,
            }));
            return;
          }
          set({ status: 'error', error: isApiError(err) ? err.message : STREAM_FALLBACK_ERROR });
        } finally {
          if (controller === own) controller = null;
        }
      },

      regenerate: async () => {
        const { lastRequest, draft } = get();
        if (!lastRequest) return;
        await get().generate(lastRequest, draft?.entryIds ?? []);
      },

      stop: () => controller?.abort(),
    }),
    {
      name: 'kompass:portfolio-draft',
      version: 1,
      storage: safeJSONStorage<PortfolioUiState>(),
      // Only the finished (or stopped) draft survives a reload; never a half-open stream.
      partialize: (s) =>
        ({
          draft: s.draft && s.draft.text ? s.draft : null,
          lastRequest: s.lastRequest,
        }) as PortfolioUiState,
      merge: (persisted, current) => {
        const saved = persisted as Partial<PortfolioUiState> | undefined;
        return {
          ...current,
          draft: saved?.draft ?? null,
          lastRequest: saved?.lastRequest ?? null,
          status: saved?.draft ? 'done' : 'idle',
        };
      },
    },
  ),
);
