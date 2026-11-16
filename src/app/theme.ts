import type { ThemeSetting } from '@shared/types';
import { useSyncExternalStore } from 'react';
import { useSettingsStore } from '@/stores/settings';

export type ResolvedTheme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function resolveTheme(setting: ThemeSetting): ResolvedTheme {
  if (setting === 'light' || setting === 'dark') return setting;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/**
 * Sets `<html data-theme>` and the `theme-color` meta. The inline script in
 * index.html does the same before first paint; this keeps them in sync afterwards.
 */
export function applyTheme(setting: ThemeSetting): void {
  const root = document.documentElement;
  const next = resolveTheme(setting);
  if (root.dataset.theme !== next) {
    // Flip every colour in the same frame instead of letting each element
    // cross-fade at its own transition speed.
    root.classList.add('theme-switching');
    root.dataset.theme = next;
    // Force a style flush so the no-transition rule is applied to this change.
    void window.getComputedStyle(root).opacity;
    requestAnimationFrame(() => root.classList.remove('theme-switching'));
  }

  // The browser chrome / status bar takes the colour at the top of the page: the page ground.
  const ground = window.getComputedStyle(root).getPropertyValue('--bg').trim();
  if (ground) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ground);
  }
}

/**
 * Applies the stored theme now and keeps following the settings store and, while
 * the setting is "system", the OS. Call once at startup. Returns a cleanup function.
 */
export function startThemeSync(): () => void {
  applyTheme(useSettingsStore.getState().theme);

  const unsubscribe = useSettingsStore.subscribe((state, previous) => {
    if (state.theme !== previous.theme) applyTheme(state.theme);
  });

  const media = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    const { theme } = useSettingsStore.getState();
    if (theme === 'system') applyTheme(theme);
  };
  media.addEventListener('change', onSystemChange);

  return () => {
    unsubscribe();
    media.removeEventListener('change', onSystemChange);
  };
}

function subscribeToSystem(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** The theme that is actually showing, for the rare component that needs to know. */
export function useResolvedTheme(): ResolvedTheme {
  const setting = useSettingsStore((state) => state.theme);
  const systemDark = useSyncExternalStore(
    subscribeToSystem,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  if (setting === 'system') return systemDark ? 'dark' : 'light';
  return setting;
}
