import { useCallback, useSyncExternalStore } from 'react';

/** Subscribes to a CSS media query. Safe to call with a changing query. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Matches `--breakpoint-desktop` (64rem) in tokens.css. */
export const DESKTOP_QUERY = '(min-width: 64rem)';

/** True at ≥1024px, where the sidebar replaces the bottom navigation. */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}
