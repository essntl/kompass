import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Assessment, ISODate } from '@shared/types';
import { buildSeedAssessments } from '@/data/seed/assessments';
import { startOfWeekISO } from '@/lib/date';
import { safeJSONStorage } from './persist';

export interface AssessmentState {
  assessments: Assessment[];
  /** Monday of the week the seed was dated from. */
  seedWeek: ISODate;

  /** Marks a hand-in as handed in (or undoes it). Ignored for other kinds. */
  setSubmitted: (id: string, submitted: boolean) => void;
  /**
   * Re-dates the seed when the app is opened in a later week, so "Kommende" never goes
   * stale in a demo. Ids are stable, and the student's own "levert" marks are kept.
   * Runs automatically after hydration. Returns true when it refreshed.
   */
  refreshSeedIfStale: (now?: Date) => boolean;
  /** Back to the seed (used by "Tilbakestill demodata"). */
  reset: () => void;
}

function seedState(now: Date = new Date()) {
  return { assessments: buildSeedAssessments(now), seedWeek: startOfWeekISO(now) };
}

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      setSubmitted: (id, submitted) =>
        set((s) => ({
          assessments: s.assessments.map((a) =>
            a.id === id && a.kind === 'innlevering' ? { ...a, submitted } : a,
          ),
        })),
      refreshSeedIfStale: (now = new Date()) => {
        const week = startOfWeekISO(now);
        if (get().seedWeek === week) return false;
        const marks = new Map(get().assessments.map((a) => [a.id, a.submitted]));
        set({
          seedWeek: week,
          assessments: buildSeedAssessments(now).map((a) => {
            const submitted = marks.get(a.id);
            return submitted === undefined || a.result ? a : { ...a, submitted };
          }),
        });
        return true;
      },
      reset: () => set(seedState()),
    }),
    {
      name: 'kompass:assessments',
      version: 1,
      storage: safeJSONStorage<AssessmentState>(),
      onRehydrateStorage: () => (state) => {
        state?.refreshSeedIfStale();
      },
    },
  ),
);

// ---------------------------------------------------------------- selectors

export function useAssessment(id: string | undefined): Assessment | undefined {
  return useAssessmentStore((s) => (id ? s.assessments.find((a) => a.id === id) : undefined));
}
