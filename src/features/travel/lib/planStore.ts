import type { ApiErrorCode } from '@shared/api';
import type { CalendarEvent, ISODate, Place } from '@shared/types';
import { isAbortError, isApiError, planTrips } from '@/lib/api';
import { todayISO } from '@/lib/date';
import { hasAnyRoute, planDay, type DayPlanResult } from './planDay';

/**
 * A small module-level store of planned days, shared by every component that calls
 * `useDailyPlan` (dashboard, travel page), so the same day is fetched once.
 *
 * Entries are keyed by everything the plan depends on (see `planKey`). Each update
 * replaces the entry object, so `useSyncExternalStore` snapshots stay stable.
 */

export type PlanErrorCode = ApiErrorCode | 'NO_TRIPS' | 'OFFLINE';

export interface PlanError {
  code: PlanErrorCode;
  message: string;
}

export interface PlanInput {
  date: ISODate;
  events: CalendarEvent[];
  home: Place;
  school: Place;
  walkSpeed: number;
}

export interface PlanEntry {
  key: string;
  date: ISODate;
  status: 'loading' | 'ready' | 'error';
  result: DayPlanResult | null;
  error: PlanError | null;
  /** A request is running while older data (or an error) is shown. */
  refreshing: boolean;
  /** When the last successful plan arrived (ms since epoch). */
  updatedAt: number | null;
  /** The last background refresh failed; `result` is older than it should be. */
  refreshFailed: boolean;
}

interface Internal {
  entry: PlanEntry;
  input: PlanInput;
  controller: AbortController | null;
  pollers: number;
  timer: number | null;
}

/** A plan younger than this is not fetched again when another component mounts. */
export const PLAN_MAX_AGE_MS = 60_000;
/** Today's plan is refreshed this often while a trip is still ahead (real-time delays). */
export const PLAN_POLL_MS = 60_000;
const MAX_ENTRIES = 24;

const store = new Map<string, Internal>();
/** Kept apart from the entries: components subscribe before the entry exists. */
const listeners = new Map<string, Set<() => void>>();

export const PLAN_MESSAGES = {
  offline: 'Du er ikke på nett. Koble til, så henter vi reisen.',
  unreachable: 'Fikk ikke kontakt med reiseplanleggeren. Sjekk nettet og prøv igjen.',
  noTrips: 'Vi fant ingen kollektivreiser som passer denne dagen. Sjekk at adressene stemmer.',
  unexpected: 'Noe gikk galt da vi skulle finne reisen. Prøv igjen om litt.',
} as const;

const coord = (place: Place) => `${place.lat.toFixed(5)},${place.lon.toFixed(5)}`;

/** Everything the plan depends on. `classes` are the attended classes of the day. */
export function planKey(input: {
  date: ISODate;
  classes: CalendarEvent[];
  home: Place;
  school: Place;
  walkSpeed: number;
}): string {
  const signature = input.classes
    .map((c) => `${c.id}@${c.start}-${c.end}${c.location ? `@${coord(c.location)}` : ''}`)
    .join(';');
  return [input.date, coord(input.home), coord(input.school), input.walkSpeed.toFixed(2), signature].join('|');
}

export function toPlanError(err: unknown): PlanError {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offline) return { code: 'OFFLINE', message: PLAN_MESSAGES.offline };
  if (isApiError(err)) {
    if (err.code === 'NETWORK') return { code: 'OFFLINE', message: PLAN_MESSAGES.unreachable };
    return { code: err.code, message: err.message };
  }
  return { code: 'INTERNAL', message: PLAN_MESSAGES.unexpected };
}

function emit(item: Internal) {
  listeners.get(item.entry.key)?.forEach((listener) => listener());
}

function update(item: Internal, patch: Partial<PlanEntry>) {
  item.entry = { ...item.entry, ...patch };
  emit(item);
}

function evict() {
  if (store.size <= MAX_ENTRIES) return;
  const idle = [...store.values()]
    .filter((item) => !listeners.get(item.entry.key)?.size && !item.controller && item.timer === null)
    .sort((a, b) => (a.entry.updatedAt ?? 0) - (b.entry.updatedAt ?? 0));
  for (const item of idle) {
    if (store.size <= MAX_ENTRIES) break;
    store.delete(item.entry.key);
  }
}

function getOrCreate(key: string, input: PlanInput): Internal {
  let item = store.get(key);
  if (!item) {
    item = {
      entry: {
        key,
        date: input.date,
        status: 'loading',
        result: null,
        error: null,
        refreshing: false,
        updatedAt: null,
        refreshFailed: false,
      },
      input,
      controller: null,
      pollers: 0,
      timer: null,
    };
    store.set(key, item);
    evict();
  } else {
    item.input = input;
  }
  return item;
}

async function run(item: Internal): Promise<void> {
  item.controller?.abort();
  const controller = new AbortController();
  item.controller = controller;
  const { signal } = controller;

  if (item.entry.result || item.entry.status === 'error') update(item, { refreshing: true });
  else update(item, { status: 'loading' });

  try {
    const result = await planDay({
      ...item.input,
      now: new Date(),
      fetchTrips: async (request) => (await planTrips(request, { signal })).patterns,
    });
    if (signal.aborted) return;
    item.controller = null;
    if (!hasAnyRoute(result)) {
      update(item, {
        status: 'error',
        result: null,
        error: { code: 'NO_TRIPS', message: PLAN_MESSAGES.noTrips },
        refreshing: false,
        refreshFailed: false,
        updatedAt: Date.now(),
      });
      return;
    }
    update(item, {
      status: 'ready',
      result,
      error: null,
      refreshing: false,
      refreshFailed: false,
      updatedAt: Date.now(),
    });
  } catch (err) {
    if (signal.aborted || isAbortError(err)) return;
    item.controller = null;
    if (item.entry.result) {
      // Keep showing the plan we have; the page says the refresh failed.
      update(item, { refreshing: false, refreshFailed: true });
    } else {
      update(item, { status: 'error', error: toPlanError(err), refreshing: false });
    }
  }
}

export function getPlanEntry(key: string | null): PlanEntry | undefined {
  return key ? store.get(key)?.entry : undefined;
}

export function subscribePlan(key: string | null, listener: () => void): () => void {
  if (!key) return () => {};
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(key);
  };
}

/** Creates the entry if needed and fetches when there is nothing fresh enough. */
export function ensurePlan(key: string, input: PlanInput, maxAgeMs = PLAN_MAX_AGE_MS): void {
  const existed = store.has(key);
  const item = getOrCreate(key, input);
  if (item.controller) return;
  const age = item.entry.updatedAt === null ? Number.POSITIVE_INFINITY : Date.now() - item.entry.updatedAt;
  const stale = item.entry.status === 'error' ? item.entry.error?.code !== 'NO_TRIPS' || age > maxAgeMs : age > maxAgeMs;
  if (!existed || stale || item.entry.refreshFailed) void run(item);
}

/** Fetches again now, keeping the current data on screen while it runs. */
export function refreshPlan(key: string): void {
  const item = store.get(key);
  if (item) void run(item);
}

/** True when the plan has a trip that has not left yet (or left less than 5 minutes ago). */
function hasTripAhead(result: DayPlanResult | null, now: number): boolean {
  if (!result) return false;
  return [result.toSchool, ...result.between, result.home].some(
    (trip) => trip?.pattern && Date.parse(trip.pattern.endTime) > now - 5 * 60_000,
  );
}

/**
 * Keeps today's plan fresh while someone is looking at it: one timer per key, however
 * many components poll. Skips while the tab is hidden. Returns the stop function.
 */
export function pollPlan(key: string): () => void {
  const item = store.get(key);
  if (!item) return () => {};
  item.pollers += 1;
  if (item.timer === null) {
    item.timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || item.controller) return;
      if (item.entry.date !== todayISO()) return;
      if (item.entry.status === 'ready' && !hasTripAhead(item.entry.result, Date.now())) return;
      void run(item);
    }, PLAN_POLL_MS);
  }
  return () => {
    item.pollers -= 1;
    if (item.pollers <= 0 && item.timer !== null) {
      window.clearInterval(item.timer);
      item.timer = null;
      item.pollers = 0;
    }
  };
}

/** Test hook. */
export function clearPlanStore(): void {
  store.forEach((item) => {
    item.controller?.abort();
    if (item.timer !== null) window.clearInterval(item.timer);
  });
  store.clear();
  listeners.clear();
}
