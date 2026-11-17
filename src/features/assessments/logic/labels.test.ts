import { describe, expect, it } from 'vitest';
import type { Assessment } from '@shared/types';
import {
  daysLeftLabel,
  formatAssessmentCount,
  GRADE_DESCRIPTIONS,
  gradeLabel,
  KIND_LABELS,
  pendingText,
  weekLabel,
  whenLabel,
} from './labels';

const now = new Date(2026, 10, 18, 10, 30); // Wednesday, week 47

const base: Assessment = {
  id: 'a',
  subjectId: 'subj-norsk',
  title: 'Prøve',
  kind: 'prove',
  date: '2026-11-23',
  time: '12:00',
};

describe('assessment labels', () => {
  it('names every kind and grade', () => {
    expect(Object.keys(KIND_LABELS)).toHaveLength(5);
    expect(Object.keys(GRADE_DESCRIPTIONS)).toHaveLength(6);
    expect(gradeLabel(5)).toBe('Karakter 5');
    expect(gradeLabel(undefined)).toBe('Uten karakter');
  });

  it('describes when it is held or due', () => {
    expect(whenLabel(base)).toBe('man. 23. nov. kl. 12:00');
    expect(whenLabel({ ...base, kind: 'innlevering', time: '23:59' })).toBe('Frist man. 23. nov. kl. 23:59');
    expect(whenLabel({ ...base, time: undefined })).toBe('man. 23. nov.');
  });

  it('counts the days left', () => {
    expect(daysLeftLabel(base, now)).toBe('om 5 dager');
    expect(daysLeftLabel({ ...base, date: '2026-11-19' }, now)).toBe('i morgen');
    expect(daysLeftLabel({ ...base, date: '2026-11-16' }, now)).toBe('for 2 dager siden');
  });

  it('labels weeks relative to now', () => {
    expect(weekLabel('2026-11-20', now)).toBe('Denne uken');
    expect(weekLabel('2026-11-23', now)).toBe('Neste uke');
    expect(weekLabel('2026-12-02', now)).toBe('Uke 49');
  });

  it('explains where an assessment without a result stands', () => {
    expect(pendingText(base, now)).toMatchObject({ heading: 'om 5 dager' });
    const handIn = { ...base, kind: 'innlevering' as const, time: '23:59' };
    expect(pendingText(handIn, now).body).toContain('Marker innleveringen som levert');
    expect(pendingText({ ...handIn, submitted: true }, now).body).toContain('markert innleveringen som levert');
    expect(pendingText({ ...handIn, date: '2026-11-13' }, now).heading).toBe('Fristen har gått ut');
    expect(pendingText({ ...handIn, date: '2026-11-13', submitted: true }, now).heading).toBe('Levert');
    expect(pendingText({ ...base, date: '2026-11-16' }, now).heading).toBe('Venter på vurdering');
  });

  it('counts in Norwegian', () => {
    expect(formatAssessmentCount(1)).toBe('1 vurdering');
    expect(formatAssessmentCount(0)).toBe('0 vurderinger');
    expect(formatAssessmentCount(3)).toBe('3 vurderinger');
  });
});
