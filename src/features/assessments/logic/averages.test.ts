import { describe, expect, it } from 'vitest';
import type { Assessment, Grade } from '@shared/types';
import { averageGrade, formatAverage, gradeHistory, UNOFFICIAL_AVERAGE_NOTE } from './averages';

const graded = (id: string, date: string, grade?: Grade): Assessment => ({
  id,
  subjectId: 'subj-matematikk',
  title: id,
  kind: 'prove',
  date,
  result: { ...(grade ? { grade } : {}), feedback: '', assessedAt: date },
});

describe('averages', () => {
  it('is a plain mean of the graded assessments only', () => {
    const list: Assessment[] = [
      graded('a', '2026-10-01', 2),
      graded('b', '2026-10-15', 4),
      graded('c', '2026-11-01'),
      graded('d', '2026-11-05', 5),
      { id: 'e', subjectId: 's', title: 'e', kind: 'prove', date: '2026-12-01' },
    ];
    expect(averageGrade(list)).toBeCloseTo(11 / 3);
    expect(formatAverage(averageGrade(list) ?? 0)).toBe('3,7');
  });

  it('is null without any grades', () => {
    expect(averageGrade([])).toBeNull();
    expect(averageGrade([graded('c', '2026-11-01')])).toBeNull();
  });

  it('formats one decimal with a comma', () => {
    expect(formatAverage(4)).toBe('4,0');
    expect(formatAverage(4.25)).toBe('4,3');
    expect(formatAverage(4.04)).toBe('4,0');
    expect(formatAverage(5.95)).toBe('6,0');
  });

  it('lists the grade history oldest first', () => {
    const history = gradeHistory([graded('late', '2026-11-05', 5), graded('early', '2026-10-01', 3)]);
    expect(history.map((p) => p.grade)).toEqual([3, 5]);
  });

  it('says plainly that it is not an official grade', () => {
    expect(UNOFFICIAL_AVERAGE_NOTE).toContain('ikke en offisiell karakter');
  });
});
