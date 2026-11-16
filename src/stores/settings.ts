import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Place,
  QuickLink,
  StudentProfile,
  ThemeSetting,
  WalkPreset,
} from '@shared/types';
import { SEED_HOME, SEED_SCHOOL, SEED_SCHOOL_NAME } from '@/data/seed/places';

/** Walking speeds in m/s, passed straight to Entur's `walkSpeed`. */
export const WALK_PRESETS: Record<Exclude<WalkPreset, 'custom'>, number> = {
  rolig: 1.0,
  normal: 1.3,
  rask: 1.7,
};
export const WALK_SPEED_MIN = 0.7;
export const WALK_SPEED_MAX = 2.2;

/** The student should arrive this many minutes before the first class. */
export const ARRIVAL_WINDOW = { min: 10, max: 15, target: 12 } as const;

export const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: 'ql-mail', label: 'Skole-e-post', url: 'https://outlook.office.com/mail/', icon: 'mail' },
  { id: 'ql-teams', label: 'Teams', url: 'https://teams.microsoft.com/', icon: 'users' },
  { id: 'ql-visma', label: 'Visma InSchool', url: 'https://kuben-vgs.inschool.visma.no/', icon: 'school' },
  { id: 'ql-vilbli', label: 'vilbli.no', url: 'https://www.vilbli.no/', icon: 'compass' },
];

export interface SettingsState {
  profile: StudentProfile;
  schoolName: string;
  school: Place | null;
  home: Place | null;
  walkPreset: WalkPreset;
  /** m/s */
  walkSpeed: number;
  theme: ThemeSetting;
  quickLinks: QuickLink[];

  setProfile: (patch: Partial<StudentProfile>) => void;
  setSchool: (place: Place | null, name?: string) => void;
  setHome: (place: Place | null) => void;
  /** Picking a preset also sets `walkSpeed`. */
  setWalkPreset: (preset: Exclude<WalkPreset, 'custom'>) => void;
  /** Moving the slider sets the speed and switches the preset to 'custom' unless it matches one. */
  setWalkSpeed: (speed: number) => void;
  setTheme: (theme: ThemeSetting) => void;
  addQuickLink: (link: Omit<QuickLink, 'id'>) => void;
  updateQuickLink: (id: string, patch: Partial<Omit<QuickLink, 'id'>>) => void;
  removeQuickLink: (id: string) => void;
  resetQuickLinks: () => void;
  /** Back to the demo defaults (used by "Tilbakestill demodata"). */
  reset: () => void;
}

const defaults = {
  profile: { name: 'Sara Nilsen', year: 'VG1', programme: 'Teknologi- og industrifag' },
  schoolName: SEED_SCHOOL_NAME,
  school: SEED_SCHOOL,
  home: SEED_HOME,
  walkPreset: 'normal' as WalkPreset,
  walkSpeed: WALK_PRESETS.normal,
  theme: 'system' as ThemeSetting,
  quickLinks: DEFAULT_QUICK_LINKS,
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,

      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      setSchool: (place, name) =>
        set((s) => ({ school: place, schoolName: name ?? s.schoolName })),
      setHome: (place) => set({ home: place }),
      setWalkPreset: (preset) => set({ walkPreset: preset, walkSpeed: WALK_PRESETS[preset] }),
      setWalkSpeed: (speed) => {
        const walkSpeed = Math.round(clamp(speed, WALK_SPEED_MIN, WALK_SPEED_MAX) * 10) / 10;
        const match = (Object.keys(WALK_PRESETS) as Array<keyof typeof WALK_PRESETS>).find(
          (key) => WALK_PRESETS[key] === walkSpeed,
        );
        set({ walkSpeed, walkPreset: match ?? 'custom' });
      },
      setTheme: (theme) => set({ theme }),
      addQuickLink: (link) =>
        set((s) => ({ quickLinks: [...s.quickLinks, { ...link, id: crypto.randomUUID() }] })),
      updateQuickLink: (id, patch) =>
        set((s) => ({
          quickLinks: s.quickLinks.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
      removeQuickLink: (id) =>
        set((s) => ({ quickLinks: s.quickLinks.filter((l) => l.id !== id) })),
      resetQuickLinks: () => set({ quickLinks: DEFAULT_QUICK_LINKS }),
      reset: () => set({ ...defaults }),
    }),
    // The inline script in index.html reads `state.theme` from this key.
    { name: 'kompass:settings', version: 1 },
  ),
);
