import { beforeEach, describe, expect, it } from 'vitest';
import {
  SEED_OVERDUE_ASSESSMENT_ID,
  SEED_SUBMITTED_ASSESSMENT_ID,
} from '@/data/seed/assessments';
import { startOfWeekISO } from '@/lib/date';
import { useAssessmentStore } from './assessments';
import { resetDemoData } from './reset';

// Runs in Node: the store falls back to in-memory storage (see ./persist.ts).
const store = () => useAssessmentStore.getState();
const find = (id: string) => store().assessments.find((a) => a.id === id);

beforeEach(() => {
  store().reset();
});

describe('assessment store', () => {
  it('starts with the seed around the current week', () => {
    expect(store().assessments.length).toBeGreaterThanOrEqual(16);
    expect(store().seedWeek).toBe(startOfWeekISO(new Date()));
    expect(find(SEED_SUBMITTED_ASSESSMENT_ID)?.submitted).toBe(true);
  });

  it('marks hand-ins as handed in and undoes it', () => {
    store().setSubmitted(SEED_OVERDUE_ASSESSMENT_ID, true);
    expect(find(SEED_OVERDUE_ASSESSMENT_ID)?.submitted).toBe(true);
    store().setSubmitted(SEED_OVERDUE_ASSESSMENT_ID, false);
    expect(find(SEED_OVERDUE_ASSESSMENT_ID)?.submitted).toBe(false);
  });

  it('only marks hand-ins', () => {
    const test = store().assessments.find((a) => a.kind === 'prove');
    store().setSubmitted(test?.id ?? '', true);
    expect(find(test?.id ?? '')?.submitted).toBeUndefined();
  });

  it('re-dates the seed in a later week and keeps the student’s marks', () => {
    expect(store().refreshSeedIfStale()).toBe(false);
    store().setSubmitted(SEED_OVERDUE_ASSESSMENT_ID, true);
    store().setSubmitted(SEED_SUBMITTED_ASSESSMENT_ID, false);
    const before = find(SEED_OVERDUE_ASSESSMENT_ID)?.date ?? '';

    const later = new Date();
    later.setDate(later.getDate() + 21);
    expect(store().refreshSeedIfStale(later)).toBe(true);
    expect(store().seedWeek).toBe(startOfWeekISO(later));
    expect((find(SEED_OVERDUE_ASSESSMENT_ID)?.date ?? '') > before).toBe(true);
    expect(find(SEED_OVERDUE_ASSESSMENT_ID)?.submitted).toBe(true);
    expect(find(SEED_SUBMITTED_ASSESSMENT_ID)?.submitted).toBe(false);
  });

  it('is restored by resetDemoData', async () => {
    store().setSubmitted(SEED_SUBMITTED_ASSESSMENT_ID, false);
    await resetDemoData();
    expect(find(SEED_SUBMITTED_ASSESSMENT_ID)?.submitted).toBe(true);
  });
});
