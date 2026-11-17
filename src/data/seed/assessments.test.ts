import { describe, expect, it } from 'vitest';
import { assessmentStatus } from '@/features/assessments/logic/status';
import { averageGrade } from '@/features/assessments/logic/averages';
import { groupAssessments } from '@/features/assessments/logic/groups';
import { addDaysISO, daysUntil, isWeekend, startOfWeekISO } from '@/lib/date';
import {
  buildSeedAssessments,
  SEED_OVERDUE_ASSESSMENT_ID,
  SEED_SUBMITTED_ASSESSMENT_ID,
} from './assessments';
import { SEED_SUBJECTS } from './subjects';
import { SEED_TEACHERS } from './teachers';

// Wednesday 18 November 2026, 10:30.
const NOW = new Date(2026, 10, 18, 10, 30);

describe('seed assessments', () => {
  const assessments = buildSeedAssessments(NOW);
  const statuses = assessments.map((a) => assessmentStatus(a, NOW));
  const { upcoming } = groupAssessments(assessments, NOW);
  const assessed = assessments.filter((a) => a.result);

  it('has 16–20 assessments with unique ids, for every seeded subject', () => {
    expect(assessments.length).toBeGreaterThanOrEqual(16);
    expect(assessments.length).toBeLessThanOrEqual(20);
    expect(new Set(assessments.map((a) => a.id)).size).toBe(assessments.length);
    expect(new Set(assessments.map((a) => a.subjectId))).toEqual(new Set(SEED_SUBJECTS.map((s) => s.id)));
  });

  it('is taught by the teacher of the subject', () => {
    for (const a of assessments) {
      const teacher = SEED_TEACHERS.find((t) => t.id === a.teacherId);
      expect(teacher?.subjectIds, a.id).toContain(a.subjectId);
      expect(a.description?.length ?? 0).toBeGreaterThan(40);
      expect(a.goals?.length ?? 0).toBeGreaterThanOrEqual(1);
    }
  });

  it('fits the kind to the subject', () => {
    for (const a of assessments) {
      const vocational = SEED_SUBJECTS.find((s) => s.id === a.subjectId)?.vocational;
      // Tests are for common core subjects; programme subjects are assessed in practice.
      if (vocational) expect(a.kind, a.id).not.toBe('prove');
    }
  });

  it('has 5–6 upcoming over the next four weeks on school days, one within a week', () => {
    expect(upcoming.length).toBeGreaterThanOrEqual(5);
    expect(upcoming.length).toBeLessThanOrEqual(6);
    for (const a of upcoming) {
      expect(isWeekend(a.date), a.id).toBe(false);
      expect(daysUntil(a.date, NOW)).toBeGreaterThan(0);
      expect(daysUntil(a.date, NOW)).toBeLessThanOrEqual(28);
    }
    expect(
      upcoming.some((a) => daysUntil(a.date, NOW) <= 7 && assessmentStatus(a, NOW) === 'upcoming'),
    ).toBe(true);
  });

  it('has at least two upcoming hand-ins, one already handed in', () => {
    const handIns = upcoming.filter((a) => a.kind === 'innlevering');
    expect(handIns.length).toBeGreaterThanOrEqual(2);
    expect(handIns.filter((a) => a.submitted).map((a) => a.id)).toEqual([SEED_SUBMITTED_ASSESSMENT_ID]);
  });

  it('has exactly one overdue hand-in', () => {
    expect(assessments.filter((_, i) => statuses[i] === 'overdue').map((a) => a.id)).toEqual([
      SEED_OVERDUE_ASSESSMENT_ID,
    ]);
  });

  it('has realistic results from the past ten weeks', () => {
    expect(assessed.length).toBeGreaterThanOrEqual(10);
    const grades = assessed.flatMap((a) => (a.result?.grade ? [a.result.grade] : []));
    expect(grades.filter((g) => g === 6)).toHaveLength(1);
    expect(grades.filter((g) => g === 2)).toHaveLength(1);
    expect(grades.filter((g) => g === 1)).toHaveLength(0);
    expect(grades.filter((g) => g >= 3 && g <= 5).length).toBe(grades.length - 2);
    expect(assessed.filter((a) => !a.result?.grade)).toHaveLength(1);

    const thisMonday = startOfWeekISO(NOW);
    for (const a of assessed) {
      expect(daysUntil(a.date, NOW)).toBeGreaterThanOrEqual(-70);
      expect(isWeekend(a.date)).toBe(false);
      expect(a.result?.assessedAt && a.result.assessedAt >= a.date).toBe(true);
      // Results are all in before this week, whatever weekday it is today.
      expect((a.result?.assessedAt ?? '') < thisMonday).toBe(true);
      expect(isWeekend(a.result?.assessedAt ?? '')).toBe(false);
      expect(a.result?.feedback.length ?? 0).toBeGreaterThan(40);
      expect(a.result?.nextSteps?.length ?? 0).toBeGreaterThan(20);
    }
    expect(averageGrade(assessments)).not.toBeNull();
  });

  it('keeps every status, whatever weekday the app is opened on', () => {
    for (let offset = 0; offset < 7; offset += 1) {
      const now = new Date(2026, 10, 16 + offset, 12, 0);
      const list = buildSeedAssessments(now);
      const counts = list.map((a) => assessmentStatus(a, now));
      expect(counts.filter((s) => s === 'overdue'), String(offset)).toHaveLength(1);
      expect(counts.filter((s) => s === 'upcoming').length).toBeGreaterThanOrEqual(5);
      expect(
        list.some((a) => assessmentStatus(a, now) === 'upcoming' && daysUntil(a.date, now) <= 7),
      ).toBe(true);
    }
  });

  it('follows the week the app is opened in', () => {
    const nextWeek = buildSeedAssessments(new Date(2026, 10, 25, 9, 0));
    expect(nextWeek.map((a) => a.id)).toEqual(assessments.map((a) => a.id));
    expect(nextWeek[0]?.date).toBe(addDaysISO(assessments[0]?.date ?? '', 7));
  });
});
