import type { ApiErrorCode } from '@shared/api';
import type { ISODate, PlannedTrip } from '@shared/types';

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

export function useDailyPlan(date: ISODate): DailyPlan {
  // Placeholder until workstream C lands.
  return {
    date,
    status: 'loading',
    toSchool: null,
    between: [],
    home: null,
    refreshing: false,
    refresh: () => {},
  };
}
