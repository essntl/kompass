import { describe, expect, it } from 'vitest';
import type { Assessment, Grade, Subject } from '@shared/types';
import { buildSeedAssessments } from '@/data/seed/assessments';
import { SEED_SUBJECTS } from '@/data/seed/subjects';
import { groupAssessments, groupByWeek, summarise, summariseSubjects } from './groups';

const now = new Date(2026, 10, 18, 10, 30); // Wednesday

const make = (id: string, patch: Partial<Assessment> = {}): Assessment => ({
  id,
  subjectId: 'subj-norsk',
  title: id,
  kind: 'prove',
  date: '2026-11-23',
  time: '12:00',
  ...patch,
});

const result = (grade: Grade | undefined, assessedAt: string) => ({
  ...(grade ? { grade } : {}),
  feedback: 'Bra.',
  assessedAt,
});

describe('groupAssessments', () => {
  const list = [
    make('later', { date: '2026-12-01' }),
    make('soon', { date: '2026-11-19', time: '08:15' }),
    make('handed-in', { kind: 'innlevering', date: '2026-11-20', submitted: true }),
    make('overdue', { kind: 'innlevering', date: '2026-11-13', time: '23:59' }),
    make('held', { date: '2026-11-16' }),
    make('handed-in-past', { kind: 'innlevering', date: '2026-11-12', submitted: true }),
    make('old', { date: '2026-10-01', result: result(3, '2026-10-05') }),
    make('recent', { date: '2026-11-02', result: result(5, '2026-11-04') }),
    make('ungraded', { date: '2026-10-20', result: result(undefined, '2026-10-22') }),
  ];

  it('splits into overdue, upcoming, awaiting and assessed, each sorted', () => {
    const groups = groupAssessments(list, now);
    expect(groups.overdue.map((a) => a.id)).toEqual(['overdue']);
    expect(groups.upcoming.map((a) => a.id)).toEqual(['soon', 'handed-in', 'later']);
    expect(groups.awaiting.map((a) => a.id)).toEqual(['held', 'handed-in-past']);
    expect(groups.assessed.map((a) => a.id)).toEqual(['recent', 'ungraded', 'old']);
  });

  it('groups the upcoming list by week', () => {
    const weeks = groupByWeek(groupAssessments(list, now).upcoming, now);
    expect(weeks.map((w) => [w.label, w.items.length])).toEqual([
      ['Denne uken', 2],
      ['Uke 49', 1],
    ]);
  });

  it('summarises the next one, the next two weeks and the average', () => {
    const summary = summarise(list, now);
    expect(summary.next?.id).toBe('soon');
    // "handed-in" is done, so it does not count; "later" is 13 days away.
    expect(summary.comingSoon).toBe(2);
    expect(summary.average).toBe(4);
    expect(summary.gradedCount).toBe(2);
    expect(summary.overdueCount).toBe(1);
  });

  it('copes with nothing at all', () => {
    expect(groupAssessments([], now)).toEqual({ overdue: [], upcoming: [], awaiting: [], assessed: [] });
    expect(summarise([], now)).toEqual({
      next: undefined,
      comingSoon: 0,
      average: null,
      gradedCount: 0,
      overdueCount: 0,
    });
  });
});

describe('summariseSubjects', () => {
  const subjects: Subject[] = [
    { id: 's-a', name: 'A', short: 'A', color: 1, vocational: true },
    { id: 's-b', name: 'B', short: 'B', color: 2, vocational: false },
    { id: 's-empty', name: 'Tom', short: 'Tom', color: 3, vocational: false },
  ];

  it('keeps subject order, skips subjects without assessments and averages each one', () => {
    const summaries = summariseSubjects(
      [
        make('b1', { subjectId: 's-b', date: '2026-12-01' }),
        make('a2', { subjectId: 's-a', date: '2026-11-02', result: result(5, '2026-11-03') }),
        make('a1', { subjectId: 's-a', date: '2026-10-01', result: result(2, '2026-10-02') }),
        make('x', { subjectId: 's-gone', date: '2026-10-01' }),
      ],
      subjects,
      now,
    );
    expect(summaries.map((s) => s.subject.id)).toEqual(['s-a', 's-b', 's-gone']);
    expect(summaries[0]).toMatchObject({ average: 3.5, upcomingCount: 0 });
    expect(summaries[0]?.history.map((p) => p.grade)).toEqual([2, 5]);
    expect(summaries[1]).toMatchObject({ average: null, upcomingCount: 1, history: [] });
    expect(summaries[2]?.subject.name).toBe('Ukjent fag');
  });

  it('works on the seed: every seeded subject shows up, YFF without grades', () => {
    const summaries = summariseSubjects(buildSeedAssessments(now), SEED_SUBJECTS, now);
    expect(summaries).toHaveLength(SEED_SUBJECTS.length);
    expect(summaries.find((s) => s.subject.id === 'subj-yff')?.average).toBeNull();
  });
});
