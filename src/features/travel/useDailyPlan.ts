import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ApiErrorCode } from '@shared/api';
import type { ISODate, PlannedTrip } from '@shared/types';
import { useSettingsStore } from '@/stores/settings';
import { useTimetableStore } from '@/stores/timetable';
import { attendedClassesOn } from './lib/planDay';
import {
  ensurePlan,
  getPlanEntry,
  planKey,
  pollPlan,
  refreshPlan,
  subscribePlan,
  type PlanEntry,
} from './lib/planStore';

/**
 * CONTRACT (docs/contracts.md §7): the dashboard depends on this exact signature.
 * Workstream C replaces the body; the exported types and the hook signature must not change.
 */
export type DailyPlanStatus =
  /** Nothing to plan: no classes that day. */
  | 'no_classes'
  /** Home or school address is missing in settings. */
  | 'missing_address'
  | 'loading'
  | 'ready'
  | 'error';

export interface DailyPlan {
  date: ISODate;
  status: DailyPlanStatus;
  /** Home → first class of the day. */
  toSchool: PlannedTrip | null;
  /** Trips between locations when a class is somewhere else, in time order. */
  between: PlannedTrip[];
  /** Last class of the day → home. */
  home: PlannedTrip | null;
  /** Set when status is 'error'. `message` is Norwegian and safe to show. */
  error?: { code: ApiErrorCode | 'NO_TRIPS' | 'OFFLINE'; message: string };
  /** True while a background refresh is running and older data is still shown. */
  refreshing: boolean;
  refresh: () => void;
}

/** Extra details for the travel page; `useDailyPlan` is the public contract. */
export interface DailyPlanDetails {
  plan: DailyPlan;
  /** When the shown plan was fetched (ms since epoch), null before the first answer. */
  updatedAt: number | null;
  /** The last background refresh failed and older data is shown. */
  refreshFailed: boolean;
}

/** Walking speed changes are applied after the slider has been still this long. */
const WALK_SPEED_DEBOUNCE_MS = 450;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (Object.is(value, debounced)) return;
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, debounced, delayMs]);
  return debounced;
}

/**
 * The trips of one day: home → first class, between places, last class → home.
 * Results are shared between components (module-level store), refreshed in the
 * background (stale-while-revalidate) and every minute for today's coming trips.
 */
export function useDailyPlan(date: ISODate): DailyPlan {
  return useDailyPlanDetails(date).plan;
}

export function useDailyPlanDetails(date: ISODate): DailyPlanDetails {
  const home = useSettingsStore((s) => s.home);
  const school = useSettingsStore((s) => s.school);
  const walkSpeed = useDebouncedValue(
    useSettingsStore((s) => s.walkSpeed),
    WALK_SPEED_DEBOUNCE_MS,
  );
  const events = useTimetableStore((s) => s.events);
  const classes = useMemo(() => attendedClassesOn(events, date), [events, date]);

  const blocked: DailyPlanStatus | null =
    classes.length === 0 ? 'no_classes' : !home || !school ? 'missing_address' : null;
  const key = blocked || !home || !school ? null : planKey({ date, classes, home, school, walkSpeed });

  const subscribe = useCallback((listener: () => void) => subscribePlan(key, listener), [key]);
  const entry = useSyncExternalStore(subscribe, () => getPlanEntry(key));

  // The latest input, read by the effect without making `events` a dependency: the key
  // already changes whenever something that matters for this day changes.
  const inputRef = useRef({ date, events, home, school, walkSpeed });
  inputRef.current = { date, events, home, school, walkSpeed };

  useEffect(() => {
    if (!key) return;
    const { home: h, school: s, ...rest } = inputRef.current;
    if (!h || !s) return;
    const input = { ...rest, home: h, school: s };
    ensurePlan(key, input);
    const stopPolling = pollPlan(key);

    const revalidate = () => {
      if (document.visibilityState === 'visible') ensurePlan(key, input);
    };
    window.addEventListener('online', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      stopPolling();
      window.removeEventListener('online', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [key]);

  // Stale-while-revalidate across keys: while a changed input (walking speed, a moved
  // class) is planned, keep showing the last plan of the same day.
  const lastShown = useRef<PlanEntry | null>(null);
  let shown: PlanEntry | undefined = entry;
  let fromFallback = false;
  if (entry?.status === 'ready') {
    lastShown.current = entry;
  } else if (
    key &&
    (!entry || entry.status === 'loading') &&
    lastShown.current?.date === date &&
    lastShown.current.result
  ) {
    shown = lastShown.current;
    fromFallback = true;
  }

  const refresh = useCallback(() => {
    if (key) refreshPlan(key);
  }, [key]);

  const plan = useMemo<DailyPlan>(() => {
    const empty = { date, toSchool: null, between: [], home: null, refresh };
    if (blocked) return { ...empty, status: blocked, refreshing: false };
    if (!shown || (shown.status === 'loading' && !shown.result)) {
      return { ...empty, status: 'loading', refreshing: false };
    }
    if (shown.status === 'error' && !fromFallback) {
      return {
        ...empty,
        status: 'error',
        refreshing: shown.refreshing,
        ...(shown.error ? { error: shown.error } : {}),
      };
    }
    const result = shown.result!;
    return {
      date,
      status: 'ready',
      toSchool: result.toSchool,
      between: result.between,
      home: result.home,
      refreshing: fromFallback || shown.refreshing,
      refresh,
    };
  }, [blocked, date, fromFallback, refresh, shown]);

  return {
    plan,
    updatedAt: shown?.updatedAt ?? null,
    refreshFailed: shown?.refreshFailed ?? false,
  };
}
