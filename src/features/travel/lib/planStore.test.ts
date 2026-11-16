import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripsRequest, TripsResponse } from '@shared/api';
import type { CalendarEvent } from '@shared/types';
import { SEED_HOME, SEED_SCHOOL } from '@/data/seed/places';
import { ApiError } from '@/lib/api';
import { localToInstant } from '@/lib/date';

const planTrips = vi.fn<(request: TripsRequest) => Promise<TripsResponse>>();
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, planTrips: (request: TripsRequest) => planTrips(request) };
});

const { clearPlanStore, ensurePlan, getPlanEntry, planKey, refreshPlan, toPlanError } = await import('./planStore');

const DAY = '2099-03-02';
const events: CalendarEvent[] = [
  { id: 'c1', kind: 'class', title: 'Norsk', start: `${DAY}T08:15`, end: `${DAY}T09:00`, source: 'manual' },
];
const input = { date: DAY, events, home: SEED_HOME, school: SEED_SCHOOL, walkSpeed: 1.3 };
const key = planKey({ date: DAY, classes: events, home: SEED_HOME, school: SEED_SCHOOL, walkSpeed: 1.3 });

const answer = (): TripsResponse => ({
  fetchedAt: new Date().toISOString(),
  patterns: [
    {
      id: 'p1',
      startTime: localToInstant(`${DAY}T07:35`),
      endTime: localToInstant(`${DAY}T08:03`),
      duration: 1680,
      walkDistance: 300,
      legs: [],
    },
  ],
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  clearPlanStore();
  planTrips.mockReset();
});
afterEach(() => clearPlanStore());

describe('plan store', () => {
  it('fetches once for several callers and shares the result', async () => {
    planTrips.mockImplementation(async () => answer());
    ensurePlan(key, input);
    ensurePlan(key, input);
    expect(getPlanEntry(key)?.status).toBe('loading');
    await settle();
    const entry = getPlanEntry(key)!;
    expect(entry.status).toBe('ready');
    expect(entry.result?.toSchool?.pattern?.id).toBe('p1');
    const callsAfterFirst = planTrips.mock.calls.length;

    ensurePlan(key, input); // fresh: no new request
    await settle();
    expect(planTrips.mock.calls.length).toBe(callsAfterFirst);
  });

  it('keeps the data and flags the failure when a refresh fails', async () => {
    planTrips.mockImplementation(async () => answer());
    ensurePlan(key, input);
    await settle();
    planTrips.mockImplementation(async () => {
      throw new ApiError('UPSTREAM_ERROR', 'Entur svarer ikke.', 502);
    });
    refreshPlan(key);
    expect(getPlanEntry(key)?.refreshing).toBe(true);
    await settle();
    const entry = getPlanEntry(key)!;
    expect(entry.status).toBe('ready');
    expect(entry.refreshFailed).toBe(true);
    expect(entry.result?.toSchool?.pattern?.id).toBe('p1');
  });

  it('reports NO_TRIPS when nothing is found', async () => {
    planTrips.mockImplementation(async () => ({ patterns: [], fetchedAt: new Date().toISOString() }));
    ensurePlan(key, input);
    await settle();
    expect(getPlanEntry(key)).toMatchObject({ status: 'error', error: { code: 'NO_TRIPS' } });
  });

  it('maps errors to Norwegian messages', async () => {
    planTrips.mockImplementation(async () => {
      throw new ApiError('NETWORK', 'x');
    });
    ensurePlan(key, input);
    await settle();
    expect(getPlanEntry(key)?.error?.code).toBe('OFFLINE');
    expect(toPlanError(new ApiError('UPSTREAM_ERROR', 'Entur svarer ikke.'))).toEqual({
      code: 'UPSTREAM_ERROR',
      message: 'Entur svarer ikke.',
    });
    expect(toPlanError(new Error('boom')).code).toBe('INTERNAL');
  });

  it('keys change with walking speed and with the classes of the day', () => {
    const faster = planKey({ date: DAY, classes: events, home: SEED_HOME, school: SEED_SCHOOL, walkSpeed: 1.7 });
    const moved = planKey({
      date: DAY,
      classes: [{ ...events[0]!, start: `${DAY}T09:00` }],
      home: SEED_HOME,
      school: SEED_SCHOOL,
      walkSpeed: 1.3,
    });
    expect(new Set([key, faster, moved]).size).toBe(3);
  });
});
