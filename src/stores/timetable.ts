import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CalendarEvent, ISODate, Subject, SubjectColor } from '@shared/types';
import { SEED_SUBJECTS } from '@/data/seed/subjects';
import { buildSeedClasses, buildSeedEvents } from '@/data/seed/timetable';
import { startOfWeekISO } from '@/lib/date';
import { newId } from '@/lib/id';
import { safeJSONStorage } from './persist';

export interface TimetableState {
  subjects: Subject[];
  /** Classes, absences and custom events. Listing deadlines are added by `useCalendarEvents`. */
  events: CalendarEvent[];
  /** Monday of the week the seed classes were generated around. Null when they are gone. */
  seedWeek: ISODate | null;

  addEvent: (event: Omit<CalendarEvent, 'id'>) => CalendarEvent;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;
  /** ICS import. Replaces earlier events with source 'ics' when `replace` is true. Returns count. */
  importEvents: (events: Array<Omit<CalendarEvent, 'id'>>, opts?: { replace?: boolean }) => number;
  /** "Last inn eksempeltimeplan": (re)creates the seed classes around the current week. */
  loadSampleTimetable: () => void;
  /** Removes every class, whatever its source. Absences and custom events stay. */
  clearClasses: () => void;
  /** Finds a subject by name (case-insensitive) or creates one with the next free colour. */
  ensureSubject: (name: string) => Subject;
  /**
   * Moves the seed classes to the current week when they were generated for another one.
   * Runs automatically after hydration. Returns true when it regenerated them.
   */
  refreshSeedIfStale: (now?: Date) => boolean;
  /** Back to the seed timetable (used by "Tilbakestill demodata"). */
  reset: () => void;
}

const isSeedClass = (event: CalendarEvent) => event.kind === 'class' && event.source === 'seed';

function seedState(now: Date = new Date()) {
  return {
    subjects: SEED_SUBJECTS,
    events: buildSeedEvents(now),
    seedWeek: startOfWeekISO(now) as ISODate | null,
  };
}

/** Keeps the user's subjects and adds any seed subject that is missing. */
function withSeedSubjects(subjects: Subject[]): Subject[] {
  const missing = SEED_SUBJECTS.filter((seed) => !subjects.some((s) => s.id === seed.id));
  return missing.length > 0 ? [...subjects, ...missing] : subjects;
}

function replaceSeedClasses(events: CalendarEvent[], now: Date): CalendarEvent[] {
  return [...events.filter((e) => !isSeedClass(e)), ...buildSeedClasses(now)];
}

const normalise = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/** First unused palette colour; cycles once all eight are taken. */
export function nextSubjectColor(subjects: Subject[]): SubjectColor {
  const used = new Set(subjects.map((s) => s.color));
  for (let color = 1; color <= 8; color += 1) {
    if (!used.has(color as SubjectColor)) return color as SubjectColor;
  }
  return ((subjects.length % 8) + 1) as SubjectColor;
}

/** Short label for tight spaces: "Samfunnskunnskap" → "Samf", "Norsk" → "Norsk". */
export function shortSubjectName(name: string): string {
  const clean = name.trim();
  if (clean.length <= 6) return clean;
  const first = clean.split(/[\s,]+/)[0] ?? clean;
  return first.length <= 6 ? first : first.slice(0, 4);
}

export const useTimetableStore = create<TimetableState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      addEvent: (event) => {
        const created: CalendarEvent = { ...event, id: newId() };
        set((s) => ({ events: [...s.events, created] }));
        return created;
      },
      updateEvent: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e)),
        })),
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      importEvents: (events, opts) => {
        const created: CalendarEvent[] = events.map((event) => ({ ...event, id: newId() }));
        set((s) => ({
          events: [
            ...(opts?.replace ? s.events.filter((e) => e.source !== 'ics') : s.events),
            ...created,
          ],
        }));
        return created.length;
      },
      loadSampleTimetable: () => {
        const now = new Date();
        set((s) => ({
          subjects: withSeedSubjects(s.subjects),
          events: replaceSeedClasses(s.events, now),
          seedWeek: startOfWeekISO(now),
        }));
      },
      clearClasses: () =>
        set((s) => ({ events: s.events.filter((e) => e.kind !== 'class'), seedWeek: null })),
      ensureSubject: (name) => {
        const wanted = normalise(name);
        const existing = get().subjects.find(
          (s) => normalise(s.name) === wanted || normalise(s.short) === wanted,
        );
        if (existing) return existing;
        const clean = name.trim().replace(/\s+/g, ' ');
        const subject: Subject = {
          id: newId('subj'),
          name: clean,
          short: shortSubjectName(clean),
          color: nextSubjectColor(get().subjects),
          vocational: false,
        };
        set((s) => ({ subjects: [...s.subjects, subject] }));
        return subject;
      },
      refreshSeedIfStale: (now = new Date()) => {
        const { seedWeek, events } = get();
        const currentWeek = startOfWeekISO(now);
        if (!seedWeek || seedWeek === currentWeek || !events.some(isSeedClass)) return false;
        set((s) => ({
          subjects: withSeedSubjects(s.subjects),
          events: replaceSeedClasses(s.events, now),
          seedWeek: currentWeek,
        }));
        return true;
      },
      reset: () => set(seedState()),
    }),
    {
      name: 'kompass:timetable',
      version: 1,
      storage: safeJSONStorage<TimetableState>(),
      // The seed is dated relative to first launch; keep it around the current week.
      onRehydrateStorage: () => (state) => {
        state?.refreshSeedIfStale();
      },
    },
  ),
);

// ---------------------------------------------------------------- selectors

export function useSubject(id: string | undefined): Subject | undefined {
  return useTimetableStore((s) => (id ? s.subjects.find((subject) => subject.id === id) : undefined));
}

/** Subjects by id, for lists that look up many at once. */
export function useSubjectMap(): Map<string, Subject> {
  const subjects = useTimetableStore((s) => s.subjects);
  return useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
}
