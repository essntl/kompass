import { describe, expect, it } from 'vitest';
import type { Assessment } from '@shared/types';
import { assessmentStatus, dueAt, isPast } from './status';

const now = new Date(2026, 10, 18, 10, 30); // Wednesday

const make = (patch: Partial<Assessment>): Assessment => ({
  id: 'a',
  subjectId: 'subj-norsk',
  title: 'Prøve',
  kind: 'prove',
  date: '2026-11-23',
  time: '12:00',
  ...patch,
});

describe('dueAt', () => {
  it('joins date and time, with hand-ins due at the end of the day by default', () => {
    expect(dueAt(make({}))).toBe('2026-11-23T12:00');
    expect(dueAt(make({ kind: 'innlevering', time: undefined }))).toBe('2026-11-23T23:59');
    expect(dueAt(make({ time: undefined }))).toBe('2026-11-23T00:00');
  });
});

describe('assessmentStatus', () => {
  it('is upcoming while the time is ahead', () => {
    expect(assessmentStatus(make({}), now)).toBe('upcoming');
    // Later the same day still counts as upcoming.
    expect(assessmentStatus(make({ date: '2026-11-18', time: '12:05' }), now)).toBe('upcoming');
    expect(isPast(make({ date: '2026-11-18', time: '08:15' }), now)).toBe(true);
  });

  it('marks a past hand-in that was not handed in as overdue', () => {
    expect(assessmentStatus(make({ kind: 'innlevering', date: '2026-11-17', time: '23:59' }), now)).toBe(
      'overdue',
    );
    // Due tonight is not overdue yet.
    expect(assessmentStatus(make({ kind: 'innlevering', date: '2026-11-18', time: '23:59' }), now)).toBe(
      'upcoming',
    );
  });

  it('marks handed-in hand-ins as submitted, before and after the due date', () => {
    expect(assessmentStatus(make({ kind: 'innlevering', submitted: true }), now)).toBe('submitted');
    expect(
      assessmentStatus(make({ kind: 'innlevering', submitted: true, date: '2026-11-10' }), now),
    ).toBe('submitted');
  });

  it('ignores the submitted flag on other kinds', () => {
    expect(assessmentStatus(make({ submitted: true }), now)).toBe('upcoming');
  });

  it('waits for the teacher after a test has been held', () => {
    expect(assessmentStatus(make({ date: '2026-11-16' }), now)).toBe('awaiting');
  });

  it('is assessed once there is a result, with or without a grade', () => {
    const result = { feedback: 'Bra.', assessedAt: '2026-11-17' };
    expect(assessmentStatus(make({ date: '2026-11-16', result: { ...result, grade: 4 } }), now)).toBe(
      'assessed',
    );
    expect(assessmentStatus(make({ kind: 'innlevering', date: '2026-11-01', result }), now)).toBe(
      'assessed',
    );
  });
});
