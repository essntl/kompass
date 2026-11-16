import type { ThemeSetting } from '@shared/types';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings';
import { SegmentedControl, type SegmentedOption } from './SegmentedControl';

const OPTIONS: ReadonlyArray<SegmentedOption<ThemeSetting>> = [
  { value: 'system', label: 'System', icon: <Monitor /> },
  { value: 'light', label: 'Lys', icon: <Sun /> },
  { value: 'dark', label: 'Mørk', icon: <Moon /> },
];

export interface ThemeSwitcherProps {
  /** Id of a visible label, when the switcher sits in a `Field as="group"`. */
  'aria-labelledby'?: string;
  className?: string;
}

/** System / Lys / Mørk, bound to the settings store. The shell applies the theme. */
export function ThemeSwitcher({ className, 'aria-labelledby': labelledBy }: ThemeSwitcherProps) {
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  return (
    <SegmentedControl
      options={OPTIONS}
      value={theme}
      onChange={setTheme}
      aria-label={labelledBy ? undefined : 'Utseende'}
      aria-labelledby={labelledBy}
      className={className}
    />
  );
}
